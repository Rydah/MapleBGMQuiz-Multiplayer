# MapleStory BGM Quiz - Multiplayer

A multiplayer web application where players can join lobbies and compete to guess MapleStory background music (BGM) tracks.

## Features

- Create or join lobbies with friends
- Filter BGM tracks by year range
- Real-time multiplayer gameplay
- Fuzzy search for BGM titles
- Score tracking
- Hidden YouTube player during guessing phase

## Setup

### Backend

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm run dev
```

The server will run on http://localhost:3001

### Frontend

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on http://localhost:3000

## How to Play

1. Enter your name and create a lobby
2. Share the lobby ID with your friends
3. Friends can join using the lobby ID
4. Host can adjust the year range filter
5. Host starts the game
6. Players have 20 seconds to guess the BGM
7. After all players guess or time runs out, the answer is revealed
8. Scores are updated
9. Host can start the next round

## Technologies Used

- React
- Material-UI
- Socket.IO
- Express
- Fuse.js (for fuzzy search)
- YouTube IFrame API
