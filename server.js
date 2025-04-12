const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'client', 'build')));
app.use(express.static(path.join(__dirname)));

// Read BGM data
const bgmData = JSON.parse(fs.readFileSync(path.join(__dirname, 'merged_bgm.json'), 'utf8'));

// Game state management
const lobbies = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('createLobby', (playerName) => {
    const lobbyId = Math.random().toString(36).substring(2, 8);
    lobbies.set(lobbyId, {
      host: socket.id,
      players: [{ id: socket.id, name: playerName, score: 0 }],
      currentRound: null,
      gameState: 'waiting',
      yearFilter: { from: 2003, to: 2023 }
    });
    socket.join(lobbyId);
    socket.emit('lobbyCreated', { lobbyId, playerName });
  });

  socket.on('joinLobby', ({ lobbyId, playerName }) => {
    const lobby = lobbies.get(lobbyId);
    if (lobby && lobby.gameState === 'waiting') {
      socket.join(lobbyId);
      lobby.players.push({ id: socket.id, name: playerName, score: 0 });
      io.to(lobbyId).emit('playerJoined', lobby.players);
    } else {
      socket.emit('joinError', 'Lobby not found or game already started');
    }
  });

  socket.on('startGame', (lobbyId) => {
    const lobby = lobbies.get(lobbyId);
    if (lobby && socket.id === lobby.host) {
      // Initialize all players' scores to 0
      lobby.players.forEach(player => {
        player.score = 0;
      });
      lobby.gameState = 'playing';
      io.to(lobbyId).emit('gameStarted', lobby.players);
      startNewRound(lobbyId);
    }
  });

  socket.on('nextRound', (lobbyId) => {
    const lobby = lobbies.get(lobbyId);
    if (lobby && socket.id === lobby.host) {
      // Reset all players' guesses and hasGuessed status
      lobby.players.forEach(player => {
        player.guess = undefined;
        player.hasGuessed = false;
      });

      // Emit the updated player list to all players
      io.to(lobbyId).emit('nextRound', lobby.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        hasGuessed: false
      })));

      startNewRound(lobbyId);
    }
  });

  socket.on('submitGuess', ({ lobbyId, guess }) => {
    const lobby = lobbies.get(lobbyId);
    if (lobby && lobby.gameState === 'playing') {
      const player = lobby.players.find(p => p.id === socket.id);
      if (player) {
        player.guess = guess;
        checkRoundCompletion(lobbyId);
      }
    }
  });

  socket.on('updateYearFilter', ({ lobbyId, from, to }) => {
    const lobby = lobbies.get(lobbyId);
    if (lobby && socket.id === lobby.host) {
      lobby.yearFilter = { from, to };
      io.to(lobbyId).emit('yearFilterUpdated', { from, to });
    }
  });

  socket.on('leaveLobby', (lobbyId) => {
    const lobby = lobbies.get(lobbyId);
    if (lobby) {
      // Remove player from lobby
      lobby.players = lobby.players.filter(p => p.id !== socket.id);
      
      // If no players left, delete the lobby
      if (lobby.players.length === 0) {
        lobbies.delete(lobbyId);
      } else {
        // If host left, assign new host
        if (socket.id === lobby.host) {
          lobby.host = lobby.players[0].id;
        }
        // Update remaining players
        io.to(lobbyId).emit('playerLeft', lobby.players);
      }
    }
    socket.leave(lobbyId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    // Find and leave all lobbies the player was in
    for (const [lobbyId, lobby] of lobbies.entries()) {
      if (lobby.players.some(p => p.id === socket.id)) {
        socket.emit('leaveLobby', lobbyId);
      }
    }
  });
});

function startNewRound(lobbyId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return;

  // Filter BGM by year range
  const filteredBgm = bgmData.filter(bgm => {
    const year = parseInt(bgm.metadata.year);
    return year >= lobby.yearFilter.from && year <= lobby.yearFilter.to;
  });

  // Select random BGM
  const randomBgm = filteredBgm[Math.floor(Math.random() * filteredBgm.length)];

  // Generate a random value between 0 and 1 to be used for start time calculation
  const startRandomValue = Math.random();

  // Reset all players' hasGuessed status
  lobby.players.forEach(player => {
    player.hasGuessed = false;
    player.guess = undefined;
  });

  lobby.currentRound = {
    bgm: randomBgm,
    guesses: new Map(),
    startTime: Date.now()
  };

  // Send the YouTube ID and random value to all players
  io.to(lobbyId).emit('roundStarted', {
    youtubeId: randomBgm.youtube,
    startRandomValue: startRandomValue
  });

  // End round after 20 seconds
  setTimeout(() => {
    endRound(lobbyId);
  }, 20000);
}

function checkRoundCompletion(lobbyId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby || !lobby.currentRound) return;

  const allGuessed = lobby.players.every(player => player.guess !== undefined);
  if (allGuessed) {
    endRound(lobbyId);
  }
}

function endRound(lobbyId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby || !lobby.currentRound) return;

  const correctAnswer = lobby.currentRound.bgm;
  lobby.players.forEach(player => {
    if (player.guess === correctAnswer.description || player.guess === correctAnswer.metadata.title) {
      player.score += 1;
    }
  });

  io.to(lobbyId).emit('roundEnded', {
    correctAnswer,
    scores: lobby.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      guess: p.guess,
      hasGuessed: p.guess !== undefined,
      isCorrect: p.guess === correctAnswer.description || p.guess === correctAnswer.metadata.title
    })),
    youtubeId: lobby.currentRound.bgm.youtube
  });

}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 