import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Typography,
  Paper,
  Container,
  List,
  ListItem,
  ListItemText,
  Autocomplete,
  Button,
  CircularProgress,
} from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import Fuse from 'fuse.js';

function Game({ currentRound, scores, onSubmitGuess, onLeaveLobby, isHost, socket, lobbyId }) {
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(20);
  const [suggestions, setSuggestions] = useState([]);
  const [showVideo, setShowVideo] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const [allBgm, setAllBgm] = useState([]);
  const [fuse, setFuse] = useState(null);

  // Debug logging
  useEffect(() => {
    console.log('Current Round:', currentRound);
    console.log('Scores:', scores);
    console.log('Show Video:', showVideo);
    console.log('Time Left:', timeLeft);
    console.log('Is Player Ready:', isPlayerReady);
    console.log('Fuse instance:', fuse);
    console.log('All BGM length:', allBgm.length);
  }, [currentRound, scores, showVideo, timeLeft, isPlayerReady, fuse, allBgm]);

  // Load BGM data for fuzzy search
  useEffect(() => {
    fetch('/merged_bgm.json')
      .then(response => response.json())
      .then(data => {
        console.log('Loaded BGM data:', data.length, 'songs');
        setAllBgm(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error loading BGM data:', error);
        setIsLoading(false);
      });
  }, []);

  // Update Fuse instance when currentRound changes (for year filtering)
  useEffect(() => {
    if (allBgm.length) {
      // If no year is provided, use all songs
      const filteredSongs = currentRound?.year 
        ? allBgm.filter(song => song.metadata.year === currentRound.year)
        : allBgm;
      
      console.log('Filtered songs:', filteredSongs.length, 'songs');
      console.log('Sample songs:', filteredSongs.slice(0, 3));
      
      setFuse(new Fuse(filteredSongs, {
        keys: ['description', 'metadata.title'],
        threshold: 0.4,
        minMatchCharLength: 2,
        includeScore: true,
        shouldSort: true,
      }));
    }
  }, [allBgm, currentRound?.year]);

  // Initialize game state
  useEffect(() => {
    if (currentRound?.youtubeId) {
      console.log('Initializing new round with YouTube ID:', currentRound.youtubeId);
      setShowVideo(false);
      setTimeLeft(20);
      setGuess('');
      setIsPlayerReady(false);
      
      // Clean up existing player if any
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    }
  }, [currentRound?.youtubeId]);

  // Initialize YouTube player
  useEffect(() => {
    if (!currentRound?.youtubeId || showVideo) return;

    console.log('Setting up YouTube player');
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    const initializePlayer = () => {
      console.log('Initializing YouTube player');
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: currentRound.youtubeId,
        playerVars: {
          start: currentRound.startTime || 0,
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            console.log('YouTube player ready');
            setIsPlayerReady(true);
            event.target.setVolume(100);
            event.target.playVideo();
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              event.target.seekTo(currentRound.startTime || 0);
              event.target.playVideo();
            }
          }
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initializePlayer();
    } else {
      window.onYouTubeIframeAPIReady = initializePlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [currentRound?.youtubeId, showVideo]);

  // Handle video visibility and round end
  useEffect(() => {
    if (!currentRound || !scores.length) return;

    const allPlayersGuessed = scores.every(player => player.hasGuessed);
    const roundEnded = allPlayersGuessed || timeLeft === 0;

    if (roundEnded && !showVideo) {
      console.log('Round ended, showing video');
      setShowVideo(true);
      clearInterval(timerRef.current);
      if (isPlayerReady && playerRef.current) {
        playerRef.current.setSize(640, 360);
        playerRef.current.playVideo();
      }
    }
  }, [scores, timeLeft, isPlayerReady, showVideo, currentRound]);

  // Start countdown timer
  useEffect(() => {
    if (!currentRound?.youtubeId || showVideo) return;

    console.log('Starting countdown timer');
    setTimeLeft(20);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          console.log('Timer reached 0');
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
    };
  }, [currentRound?.youtubeId, showVideo]);

  const handleInputChange = (event, newValue, reason) => {
    console.log('Input changed:', newValue, 'Reason:', reason);
    setGuess(newValue || '');
    
    if (newValue && newValue.length >= 2 && fuse) {
      console.log('Searching for:', newValue);
      const results = fuse.search(newValue);
      console.log('Found matches:', results.length, 'Sample matches:', results.slice(0, 3));
      setSuggestions(results.map(result => result.item));
    } else {
      setSuggestions([]);
    }
  };

  const handleOptionSelected = (event, option) => {
    console.log('Option selected:', option);
    if (option) {
      const selectedValue = typeof option === 'string' ? option : option.description;
      setGuess(selectedValue);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitGuess();
  };

  const submitGuess = () => {
    if (guess.trim()) {
      onSubmitGuess(guess.trim());
      setGuess('');
      setSuggestions([]);
    }
  };

  const handleNextRound = () => {
    socket.emit('nextRound', lobbyId);
  };

  if (isLoading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!currentRound) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Typography variant="h5">Waiting for game to start...</Typography>
        </Box>
      </Container>
    );
  }

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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            {!showVideo && (
              <Typography variant="h4">
                Time Left: {timeLeft}s
              </Typography>
            )}
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<ExitToAppIcon />}
              onClick={onLeaveLobby}
            >
              Leave Game
            </Button>
          </Box>
          <div id="youtube-player" />
        </Paper>

        {!showVideo ? (
          <Paper elevation={3} sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Autocomplete
                  freeSolo
                  fullWidth
                  open={guess.length >= 2}
                  options={suggestions}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return `${option.description} (${option.metadata?.title})`;
                  }}
                  value={guess}
                  onChange={handleOptionSelected}
                  onInputChange={handleInputChange}
                  filterOptions={(x) => x}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Typography>
                        {option.description} ({option.metadata?.title})
                      </Typography>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Guess the BGM"
                      fullWidth
                      variant="outlined"
                      autoComplete="off"
                    />
                  )}
                  noOptionsText="No matches found"
                  blurOnSelect={false}
                  clearOnBlur={false}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={submitGuess}
                  sx={{ minWidth: '120px' }}
                >
                  Submit
                </Button>
              </Box>
            </form>
          </Paper>
        ) : currentRound?.correctAnswer ? (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Correct Answer: {currentRound.correctAnswer.description}
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              Title: {currentRound.correctAnswer.metadata.title}
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              Year: {currentRound.correctAnswer.metadata.year}
            </Typography>
            {isHost && (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleNextRound}
                sx={{ mt: 2 }}
              >
                Next Round
              </Button>
            )}
          </Paper>
        ) : null}

        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Scores
          </Typography>
          <List>
            {scores.map((player, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={player.name}
                  secondary={`Score: ${player.score} ${player.hasGuessed ? '(Guessed)' : ''}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
    </Container>
  );
}

export default Game; 