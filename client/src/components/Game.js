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
  Slider,
} from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import Fuse from 'fuse.js';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

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
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [hasGuessed, setHasGuessed] = useState(false);
  
  // Use localScores for rendering and state checks
  const currentPlayer = scores.find(player => player.id === socket.id);

  // Update hasGuessed state based on localScores
  useEffect(() => {
    setHasGuessed(currentPlayer?.hasGuessed || false);
  }, [currentPlayer?.hasGuessed]);

  // Load BGM data for fuzzy search
  useEffect(() => {
    // Use the correct path for GitHub Pages
    const bgmUrl = '/MapleBGMQuiz-Multiplayer/merged_bgm.json';

    fetch(bgmUrl)
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
      // If no year range is provided, use all songs
      const filteredSongs = currentRound?.yearFilter 
        ? allBgm.filter(song => 
            song.metadata.year >= currentRound.yearFilter.from && 
            song.metadata.year <= currentRound.yearFilter.to
          )
        : allBgm;
      
      console.log('Filtered songs:', filteredSongs.length, 'songs');
      console.log('Sample songs:', filteredSongs.slice(0, 3));
      
      setFuse(new Fuse(filteredSongs, {
        keys: ['description', 'metadata.title'],
        threshold: 0.3,
        minMatchCharLength: 2,
        includeScore: true,
        shouldSort: true,
      }));
    }
  }, [allBgm, currentRound?.yearFilter]);

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

  // Handle video visibility and round end
  useEffect(() => {
    if (!currentRound || !scores.length) return;

    const allPlayersGuessed = scores.every(player => player.hasGuessed);
    console.log('All players guessed:', allPlayersGuessed);
    const roundEnded = allPlayersGuessed || timeLeft === 0;

    if (roundEnded && !showVideo) {
      console.log('Round ended, showing video');
      setShowVideo(true);
      clearInterval(timerRef.current);
      // Only try to play video if player is ready and exists
      if (isPlayerReady && playerRef.current && typeof playerRef.current.playVideo === 'function') {
        playerRef.current.setSize(640, 360);
        playerRef.current.playVideo();
      }
    }
  }, [scores, timeLeft, isPlayerReady, showVideo, currentRound]);

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
          start: 0, // Start at 0 initially
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            console.log('YouTube player ready');
            const player = event.target;
            const duration = player.getDuration();
            
            // Calculate start time using server-provided random value
            const maxStartTime = Math.max(0, duration - 20);
            const newStartTime = Math.floor(currentRound.startRandomValue * maxStartTime);
            console.log('New start time:', newStartTime);
            
            player.seekTo(newStartTime);
            player.playVideo();
            setIsPlayerReady(true);
            player.setVolume(isMuted ? 0 : volume);
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              const player = event.target;
              const duration = player.getDuration();
              const maxStartTime = Math.max(0, duration - 20);
              const newStartTime = Math.floor(currentRound.startRandomValue * maxStartTime);
              player.seekTo(newStartTime);
              player.playVideo();
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
        playerRef.current = null;
      }
    };
  }, [currentRound?.youtubeId, currentRound?.startRandomValue, showVideo]);

  // Separate useEffect for volume control
  useEffect(() => {
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

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
    
    // Only update guess if it's a direct input change
    if (reason === 'input') {
      setGuess(newValue || '');
    }
    
    // Always update suggestions based on input
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
      // Always use the description for the guess
      const selectedValue = option.description || option;
      console.log('Setting guess to:', selectedValue);
      setGuess(selectedValue);
      // Clear suggestions after selection
      setSuggestions([]);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitGuess();
  };

  const submitGuess = () => {
    console.log('Submitting guess:', guess);
    // Check local hasGuessed state to prevent double submission
    if (guess && guess.trim() && !hasGuessed) {
      const trimmedGuess = guess.trim();
      console.log('Submitting trimmed guess:', trimmedGuess);
      onSubmitGuess(trimmedGuess); // Send guess to server
      // No need to set local state here, wait for server update
      // setHasGuessed(true); 
      setSuggestions([]);
    } else {
      console.log('Guess not submitted:', {guess, hasGuessed});
    }
  };

  const handleNextRound = () => {
    setShowVideo(false);
    scores.forEach(player => { player.hasGuessed = false; });

    socket.emit('nextRound', lobbyId);
  };

  // Add volume control handlers
  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Button onClick={handleMuteToggle}>
                {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </Button>
              <Slider
                value={volume}
                onChange={handleVolumeChange}
                aria-labelledby="volume-slider"
                sx={{ width: 200 }}
              />
            </Box>
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
                      label={hasGuessed ? "Your guess has been submitted" : "Guess the BGM"}
                      fullWidth
                      variant="outlined"
                      autoComplete="off"
                      disabled={hasGuessed}
                    />
                  )}
                  noOptionsText="No matches found"
                  blurOnSelect={false}
                  clearOnBlur={false}
                  disabled={hasGuessed}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={submitGuess}
                  sx={{ minWidth: '120px' }}
                  disabled={hasGuessed}
                >
                  {hasGuessed ? "Guessed" : "Submit"}
                </Button>
              </Box>
            </form>
            {hasGuessed && (
              <Box sx={{ 
                mt: 2, 
                p: 2, 
                backgroundColor: 'primary.light', 
                borderRadius: 1,
                color: 'white'
              }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Your Guess:
                </Typography>
                <Typography variant="body1">
                  {guess}
                </Typography>
              </Box>
            )}
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
            {scores.map((player, index) => {
              // Add more detailed logging to see exactly what we're receiving
              const debugIsCorrect = typeof player.isCorrect === 'undefined' ? 'undefined' : player.isCorrect;
              console.log('Player:', player.name);
              console.log('Guess:', player.guess);
              console.log('Correct Answer:', currentRound.correctAnswer.description);
              console.log('Is Correct (raw):', player.isCorrect);
              console.log('Is Correct (type):', typeof player.isCorrect);
              
              // Use string equality for comparison
              const guessMatchesDescription = player.guess === currentRound.correctAnswer.description;
              const guessMatchesTitle = player.guess === currentRound.correctAnswer.metadata.title;
              console.log('Client side check - matches description:', guessMatchesDescription);
              console.log('Client side check - matches title:', guessMatchesTitle);
              
              // Use a fallback for isCorrect if it's undefined
              const isCorrectValue = player.isCorrect === undefined 
                ? (guessMatchesDescription || guessMatchesTitle)
                : player.isCorrect;
              
              return (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    mt: 2,
                    borderRadius: 1,
                    backgroundColor: isCorrectValue
                      ? 'success.light'
                      : 'error.light',
                    color: 'white',
                  }}
                >
                  <Typography variant="body1">
                    {player.name}: {isCorrectValue ? 'Correct!' : 'Wrong!'}
                  </Typography>
                </Box>
              );
            })}
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