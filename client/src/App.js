import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import MainMenu from './components/MainMenu';
import Lobby from './components/Lobby';
import Game from './components/Game';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
  },
});

// Socket connection configuration
const SOCKET_URL = 'https://maplebgmquiz-production.up.railway.app';

const socket = io(SOCKET_URL);

// Add socket connection status logging
socket.on('connect', () => {
  console.log('Connected to server!');
  console.log('Socket ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from server:', reason);
});

function App() {
  const [gameState, setGameState] = useState('mainMenu');
  const [playerName, setPlayerName] = useState('');
  const [lobbyId, setLobbyId] = useState('');
  const [players, setPlayers] = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [scores, setScores] = useState([]);

  useEffect(() => {
    socket.on('lobbyCreated', ({ lobbyId, playerName }) => {
      setLobbyId(lobbyId);
      setPlayerName(playerName);
      setGameState('lobby');
      setPlayers([{ id: socket.id, name: playerName, score: 0 }]);
    });

    socket.on('playerJoined', (players) => {
      setPlayers(players);
    });

    socket.on('playerLeft', (players) => {
      setPlayers(players);
    });

    socket.on('joinError', (error) => {
      alert(error);
    });

    socket.on('roundStarted', (roundData) => {
      setCurrentRound(roundData);
      setGameState('game');
    });

    socket.on('roundEnded', ({ correctAnswer, scores }) => {
      setCurrentRound(prev => ({ ...prev, correctAnswer }));
      setScores(scores);
    });

    socket.on('nextRound', () => {
      // Reset scores state to mark all players as not guessed
      setScores(prevScores => prevScores.map(player => ({
        ...player,
        hasGuessed: false,
        guess: undefined
      })));
    });

    socket.on('yearFilterUpdated', ({ from, to }) => {
      // Update year filter in game state
    });

    return () => {
      socket.off('lobbyCreated');
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('joinError');
      socket.off('roundStarted');
      socket.off('roundEnded');
      socket.off('nextRound');
      socket.off('yearFilterUpdated');
    };
  }, []);

  const handleCreateLobby = (name) => {
    socket.emit('createLobby', name);
  };

  const handleJoinLobby = (name, id) => {
    socket.emit('joinLobby', { lobbyId: id, playerName: name });
    setPlayerName(name);
    setLobbyId(id);
    setGameState('lobby');
  };

  const handleLeaveLobby = () => {
    socket.emit('leaveLobby', lobbyId);
    setGameState('mainMenu');
    setLobbyId('');
    setPlayers([]);
  };

  const handleStartGame = () => {
    socket.emit('startGame', lobbyId);
  };

  const handleSubmitGuess = (guess) => {
    socket.emit('submitGuess', { lobbyId, guess });
  };

  const handleUpdateYearFilter = (from, to) => {
    socket.emit('updateYearFilter', { lobbyId, from, to });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App">
        {gameState === 'mainMenu' && (
          <MainMenu
            onCreateLobby={handleCreateLobby}
            onJoinLobby={handleJoinLobby}
          />
        )}
        {gameState === 'lobby' && (
          <Lobby
            lobbyId={lobbyId}
            players={players}
            isHost={socket.id === players[0]?.id}
            onStartGame={handleStartGame}
            onUpdateYearFilter={handleUpdateYearFilter}
            onLeaveLobby={handleLeaveLobby}
          />
        )}
        {gameState === 'game' && (
          <Game
            currentRound={currentRound}
            scores={scores}
            onSubmitGuess={handleSubmitGuess}
            onLeaveLobby={handleLeaveLobby}
            isHost={socket.id === players[0]?.id}
            socket={socket}
            lobbyId={lobbyId}
          />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App; 