import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Container,
  Slider,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

function Lobby({ lobbyId, players, isHost, onStartGame, onUpdateYearFilter, onLeaveLobby }) {
  const [yearRange, setYearRange] = useState([2003, 2023]);

  const handleYearChange = (event, newValue) => {
    setYearRange(newValue);
    onUpdateYearFilter(newValue[0], newValue[1]);
  };

  const copyLobbyId = () => {
    navigator.clipboard.writeText(lobbyId);
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          py: 4,
        }}
      >
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6">Lobby ID: {lobbyId}</Typography>
            <Tooltip title="Copy to clipboard">
              <IconButton onClick={copyLobbyId} size="small">
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<ExitToAppIcon />}
              onClick={onLeaveLobby}
              sx={{ ml: 'auto' }}
            >
              Leave Lobby
            </Button>
          </Box>

          <Typography variant="h6" gutterBottom>
            Players ({players.length})
          </Typography>
          <List>
            {players.map((player, index) => (
              <React.Fragment key={player.id}>
                <ListItem>
                  <ListItemText
                    primary={player.name}
                    secondary={index === 0 ? 'Host' : 'Player'}
                  />
                </ListItem>
                {index < players.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>

        {isHost && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Game Settings
            </Typography>
            <Typography gutterBottom>
              Year Range: {yearRange[0]} - {yearRange[1]}
            </Typography>
            <Slider
              value={yearRange}
              onChange={handleYearChange}
              valueLabelDisplay="auto"
              min={2003}
              max={2023}
              step={1}
            />
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={onStartGame}
              sx={{ mt: 2 }}
            >
              Start Game
            </Button>
          </Paper>
        )}
      </Box>
    </Container>
  );
}

export default Lobby; 