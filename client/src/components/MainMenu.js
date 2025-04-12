import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
} from '@mui/material';

function MainMenu({ onCreateLobby, onJoinLobby }) {
  const [name, setName] = useState('');
  const [lobbyId, setLobbyId] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateLobby(name.trim());
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (name.trim() && lobbyId.trim()) {
      onJoinLobby(name.trim(), lobbyId.trim());
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Typography variant="h3" component="h1" gutterBottom>
          MapleStory BGM Quiz
        </Typography>

        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <Typography variant="h5" gutterBottom>
            Enter Your Name
          </Typography>
          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            variant="outlined"
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleCreate}
              disabled={!name.trim()}
            >
              Create Lobby
            </Button>
          </Box>

          <Typography variant="h6" sx={{ mt: 2 }}>
            Or Join Existing Lobby
          </Typography>
          <TextField
            fullWidth
            label="Lobby ID"
            value={lobbyId}
            onChange={(e) => setLobbyId(e.target.value)}
            variant="outlined"
          />
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            onClick={handleJoin}
            disabled={!name.trim() || !lobbyId.trim()}
          >
            Join Lobby
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}

export default MainMenu; 