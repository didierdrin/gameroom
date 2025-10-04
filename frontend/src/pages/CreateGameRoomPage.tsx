// Complete CreateGameRoomPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { SectionTitle } from '../components/UI/SectionTitle';
import { CalendarIcon, ClockIcon, UsersIcon, EyeIcon, MicIcon, Copy, X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSocket } from '../SocketContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface CreateGameRoomPageProps {
  onGameCreated?: () => void;
}

interface GameRoomData {
  name: string;
  gameType: string;
  maxPlayers: number;
  isPrivate: boolean;
  password?: string;
  scheduledTimeCombined?: string;
  description?: string;
  enableVideoChat: boolean;
  enableVoiceChat: boolean;
  allowSpectators: boolean;
  hostId: string;
  hostName: string;
  // Add trivia specific fields
  triviaSettings?: {
    questionCount: number;
    difficulty: string;
    category: string;
  };
}

// Trivia categories available
const TRIVIA_CATEGORIES = [
  { value: 'general', label: 'General Knowledge' },
  { value: 'science', label: 'Science' },
  { value: 'history', label: 'History' },
  { value: 'geography', label: 'Geography' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'sports', label: 'Sports' },
  { value: 'technology', label: 'Technology' },
  { value: 'literature', label: 'Literature' },
  { value: 'music', label: 'Music' },
  { value: 'art', label: 'Art & Design' },
  { value: 'politics', label: 'Politics' },
  { value: 'nature', label: 'Nature & Animals' },
  { value: 'movies', label: 'Movies & TV' },
  { value: 'food', label: 'Food & Cooking' },
  { value: 'mythology', label: 'Mythology' },
];

// Question count options
const QUESTION_OPTIONS = [5, 10, 15, 20, 25, 30];

export const CreateGameRoomPage = ({ onGameCreated }: CreateGameRoomPageProps) => {
  const [gameType, setGameType] = useState('');
  const [gameMode, setGameMode] = useState('playNow');
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [playerLimit, setPlayerLimit] = useState(10);
  const [privacy, setPrivacy] = useState('public');
  const [enableVideoChat] = useState(true);
  const [enableVoiceChat, setEnableVoiceChat] = useState(true);
  const [allowSpectators, setAllowSpectators] = useState(true);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [password, setPassword] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Trivia specific settings
  const [triviaQuestionCount, setTriviaQuestionCount] = useState(10);
  const [triviaDifficulty, setTriviaDifficulty] = useState('medium');
  const [triviaCategory, setTriviaCategory] = useState('general');
  const questionScrollRef = useRef<HTMLDivElement>(null);
  
  // Add new state for invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [createdGameData, setCreatedGameData] = useState<any>(null);
  
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useAuth(); 
  const isMountedRef = useRef(true);

  const gameTypes = [
    { id: 'chess', name: 'Chess', icon: '♟️' },
    { id: 'trivia', name: 'Trivia', icon: '❓' },
  ];

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Function to generate 6-character code
  const generateRoomCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  // Generate code when privacy is set to private
  useEffect(() => {
    if (privacy === 'private') {
      const newCode = generateRoomCode();
      setGeneratedCode(newCode);
      setPassword(newCode);
    } else {
      setGeneratedCode('');
      setPassword('');
    }
  }, [privacy]);

  // Set player limit to 10 for chess games
  useEffect(() => {
    if (gameType === '') { // it was chess
      setPlayerLimit(10);
    }
  }, [gameType]);

  // Scroll handlers for question count
  const scrollQuestions = (direction: 'left' | 'right') => {
    if (questionScrollRef.current) {
      const scrollAmount = 100;
      questionScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Copy URL to clipboard
  const copyInviteUrl = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert('Invite URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy URL:', err);
      const textArea = document.createElement('textarea');
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Invite URL copied to clipboard!');
    }
  };

  // Handle modal close and navigation
  const handleInviteModalClose = () => {
    setShowInviteModal(false);
    if (createdGameData) {
      if (gameMode === 'playNow' && createdGameData?.roomId) {
        navigate(`/game-room/${createdGameData.roomId}`);
      } else {
        navigate('/my-game-rooms');
      }
    }
    if (onGameCreated) onGameCreated();
  };

  // Join host as player
  const joinHostAsPlayer = async (gameRoomId: string, roomPassword?: string): Promise<boolean> => {
    if (!socket || !user) {
      console.error('Missing socket or user for auto-join');
      return false;
    }

    try {
      console.log('Auto-joining host as player to room:', gameRoomId);
      const myId = String(user.id);
      
      const joinPayload = {
        roomId: gameRoomId,
        playerId: myId,
        playerName: user.username,
        joinAsPlayer: true,
        isHost: true,
        password: roomPassword
      };

      console.log('Join payload:', joinPayload);

      const joinResult = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('Host auto-join timed out');
          cleanupListeners();
          resolve(false);
        }, 30000);

        const handleJoinSuccess = (data: any) => {
          console.log('Host successfully joined as player:', data);
          clearTimeout(timeout);
          cleanupListeners();
          resolve(true);
        };

        const handlePlayerJoined = (data: any) => {
          if (data.playerId === myId) {
            console.log('Host player joined event received:', data);
            clearTimeout(timeout);
            cleanupListeners();
            resolve(true);
          }
        };

        const handleJoinError = (error: any) => {
          console.error('Host auto-join failed:', error);
          clearTimeout(timeout);
          cleanupListeners();
          resolve(false);
        };

        const handleError = (error: any) => {
          console.error('General error during host auto-join:', error);
          clearTimeout(timeout);
          cleanupListeners();
          resolve(false);
        };

        const cleanupListeners = () => {
          socket.off('joinGameSuccess', handleJoinSuccess);
          socket.off('playerJoined', handlePlayerJoined);
          socket.off('joinGameError', handleJoinError);
          socket.off('error', handleError);
        };

        socket.on('joinGameSuccess', handleJoinSuccess);
        socket.on('playerJoined', handlePlayerJoined);
        socket.on('joinGameError', handleJoinError);
        socket.on('error', handleError);

        socket.emit('joinGame', joinPayload);
      });

      if (joinResult) {
        console.log('Host successfully auto-joined as player');
      } else {
        console.warn('Host auto-join failed or timed out');
      }

      return joinResult;
    } catch (error) {
      console.error('Error in joinHostAsPlayer:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate required fields
    if (!gameType) {
      alert('Please select a game type');
      return;
    }

    if (!roomName.trim()) {
      alert('Please enter a room name');
      return;
    }

    if (!user) {
      alert('Please login to create a game room');
      navigate('/login');
      return;
    }

    if (privacy === 'private' && !password.trim()) {
      alert('Please enter a password for private room');
      return;
    }

    if (gameMode === 'schedule' && (!scheduledDate || !scheduledTime)) {
      alert('Please select both date and time for scheduled games');
      return;
    }

    if (!socket) {
      alert("Connection error. Please refresh and try again.");
      return;
    }

    setIsLoading(true);

    const scheduledTimeCombined = (scheduledDate && scheduledTime)
      ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      : undefined;

    const gameRoomData: GameRoomData = {
      name: roomName,
      gameType: gameType.trim().toLowerCase(),
      maxPlayers: playerLimit,
      isPrivate: privacy === 'private' || privacy === 'inviteOnly',
      password: privacy === 'private' ? password : undefined,
      hostId: String(user.id),
      hostName: user.username,
      scheduledTimeCombined,
      description: description.trim() || undefined,
      enableVideoChat,
      enableVoiceChat,
      allowSpectators,
    };

    // Add trivia settings if game type is trivia
    if (gameType === 'trivia') {
      gameRoomData.triviaSettings = {
        questionCount: triviaQuestionCount,
        difficulty: triviaDifficulty,
        category: triviaCategory,
      };
    }

    try {
      if (!socket) {
        throw new Error("Connection error. Please refresh and try again.");
      }

      let responded = false;
      const timeout = setTimeout(() => {
        if (responded || !isMountedRef.current) return;
        responded = true;
        setIsLoading(false);
        alert('Request timed out. Please try again.');
      }, 15000);

      const handleGameCreated = async (game: any) => {
        if (responded || !isMountedRef.current) return;
        responded = true;
        clearTimeout(timeout);
        setIsLoading(false);
        
        console.log('Game created successfully:', game);
        
        setCreatedGameData(game);
        
        // Automatically join the host as a player for all games
        if (game?.roomId) {
          console.log('Attempting to auto-join host as player...');
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const joinSuccess = await joinHostAsPlayer(
            game.roomId, 
            privacy === 'private' ? password : undefined
          );
          
          if (!joinSuccess) {
            console.warn('Host auto-join failed, but continuing with game creation');
          } else {
            console.log('Host successfully joined as player');
          }
        }
        
        // Check if this is an invite-only room for playNow mode
        if (privacy === 'inviteOnly' && gameMode === 'playNow' && game?.roomId) {
          const baseUrl = window.location.origin;
          const gameUrl = `${baseUrl}/game-room/${game.roomId}`;
          setInviteUrl(gameUrl);
          setShowInviteModal(true);
        } else {
          if (gameMode === 'playNow' && game?.roomId) {
            navigate(`/game-room/${game.roomId}`);
          } else {
            navigate('/my-game-rooms');
            console.log('Game scheduled successfully!');
          }
          
          if (onGameCreated) onGameCreated();
        }
      };

      const handleError = (error: any) => {
        if (responded || !isMountedRef.current) return;
        responded = true;
        clearTimeout(timeout);
        setIsLoading(false);
        console.error('Game creation error:', error);
        alert(error.message || 'Failed to create game room');
      };

      socket.once('gameCreated', handleGameCreated);
      socket.once('error', handleError);
      socket.emit('createGame', gameRoomData);

    } catch (error) {
      if (isMountedRef.current) {
        setIsLoading(false);
        alert('Failed to create game room. Please try again.');
        console.error('Create game error:', error);
      }
    }
  };

  return (
    <div className="p-6 overflow-y-auto h-screen pb-20">
      <SectionTitle 
        title="Create Game Room" 
        subtitle="Set up a new game room for you and your friends to play in" 
      />
      
      <form onSubmit={handleSubmit} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        {/* Game Type Selection */}
        <div className="mb-8">
          <label className="block text-white mb-3 font-medium">
            Select Game Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {gameTypes.map(game => (
              <button 
                key={game.id} 
                type="button" 
                onClick={() => setGameType(game.id)}
                className={`aspect-square flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                  gameType === game.id 
                    ? 'bg-purple-700/50 border-2 border-purple-500' 
                    : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'
                }`}
              >
                <span className="text-4xl mb-2">{game.icon}</span>
                <span className="text-sm font-medium">{game.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Trivia Specific Settings */}
        {gameType === 'trivia' && (
          <div className="mb-8 p-4 bg-purple-700/10 rounded-xl border border-purple-600/30">
            <h3 className="text-white font-medium mb-4">Trivia Settings</h3>
            
            {/* Question Count Selector with Horizontal Scroll */}
            <div className="mb-6">
              <label className="block text-gray-300 mb-3 text-sm">Number of Questions</label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => scrollQuestions('left')}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div 
                  ref={questionScrollRef}
                  className="flex-1 flex space-x-3 overflow-x-auto scrollbar-hide"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {QUESTION_OPTIONS.map(count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setTriviaQuestionCount(count)}
                      className={`min-w-[80px] px-6 py-3 rounded-lg font-medium transition-all ${
                        triviaQuestionCount === count
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={() => scrollQuestions('right')}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Difficulty Level */}
            <div className="mb-6">
              <label className="block text-gray-300 mb-3 text-sm">Difficulty Level</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTriviaDifficulty('easy')}
                  className={`p-3 rounded-lg font-medium transition-all ${
                    triviaDifficulty === 'easy'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  Easy
                </button>
                <button
                  type="button"
                  onClick={() => setTriviaDifficulty('medium')}
                  className={`p-3 rounded-lg font-medium transition-all ${
                    triviaDifficulty === 'medium'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  Medium
                </button>
                <button
                  type="button"
                  onClick={() => setTriviaDifficulty('hard')}
                  className={`p-3 rounded-lg font-medium transition-all ${
                    triviaDifficulty === 'hard'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  Hard
                </button>
              </div>
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-gray-300 mb-3 text-sm">Category</label>
              <select
                value={triviaCategory}
                onChange={(e) => setTriviaCategory(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
              >
                {TRIVIA_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Game Mode */}
        <div className="mb-8">
          <label className="block text-white mb-3 font-medium">Game Mode</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              type="button" 
              onClick={() => setGameMode('playNow')}
              className={`flex items-center p-4 rounded-xl transition-all ${
                gameMode === 'playNow' 
                  ? 'bg-purple-700/50 border-2 border-purple-500' 
                  : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center mr-4">
                🎮
              </div>
              <div>
                <h3 className="font-medium">Play Now</h3>
                <p className="text-sm text-gray-400">
                  Create a game room that starts immediately
                </p>
              </div>
            </button>
            <button 
              type="button" 
              onClick={() => setGameMode('schedule')}
              className={`flex items-center p-4 rounded-xl transition-all ${
                gameMode === 'schedule' 
                  ? 'bg-purple-700/50 border-2 border-purple-500' 
                  : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center mr-4">
                📅
              </div>
              <div>
                <h3 className="font-medium">Schedule for Later</h3>
                <p className="text-sm text-gray-400">
                  Set a future time for your game
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Schedule Details */}
        {gameMode === 'schedule' && (
          <div className="mb-8 p-4 bg-gray-700/30 rounded-xl border border-gray-600/50">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-white mb-2 text-sm">Date</label>
                <div className="relative">
                  <CalendarIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type="date" 
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" 
                    value={scheduledDate} 
                    onChange={e => setScheduledDate(e.target.value)} 
                    required
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-white mb-2 text-sm">Time</label>
                <div className="relative">
                  <ClockIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type="time" 
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" 
                    value={scheduledTime} 
                    onChange={e => setScheduledTime(e.target.value)} 
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Room Details */}
        <div className="mb-8">
          <label className="block text-white mb-3 font-medium">Room Details</label>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-gray-300 mb-2 text-sm">Room Name</label>
              <input 
                type="text" 
                placeholder="Enter a name for your game room" 
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" 
                value={roomName} 
                onChange={e => setRoomName(e.target.value)} 
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2 text-sm">Description (Optional)</label>
              <textarea 
                placeholder="Describe your game room..." 
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none h-24" 
                value={description} 
                onChange={e => setDescription(e.target.value)}
              ></textarea>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="mb-8">
          <label className="block text-white mb-3 font-medium">Settings</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center justify-between text-gray-300 mb-2 text-sm">
                <span>Player Limit</span>
                <span className="bg-gray-700 px-2 py-1 rounded text-xs">
                  {playerLimit} players
                </span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                {gameType === 'chess' 
                  ? 'Chess is a 2-player game.'
                  : `First ${playerLimit} users to join will be players. Others will automatically become spectators.`
                }
              </p>
              <div className="relative flex items-center">
                <UsersIcon size={18} className="absolute left-3 text-gray-400" />
                <input 
                  type="range" 
                  min="2" 
                  max="50" 
                  className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 ml-10 ${
                    gameType === 'chess' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  value={playerLimit} 
                  onChange={e => setPlayerLimit(parseInt(e.target.value))}
                  disabled={gameType === 'chess'}
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 mb-2 text-sm">Privacy Settings</label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  type="button" 
                  onClick={() => setPrivacy('public')}
                  className={`p-2 rounded-lg text-center text-sm transition-all ${
                    privacy === 'public' 
                      ? 'bg-green-700/30 border border-green-500/50 text-green-400' 
                      : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'
                  }`}
                >
                  Public
                </button>
                <button 
                  type="button" 
                  onClick={() => setPrivacy('inviteOnly')}
                  className={`p-2 rounded-lg text-center text-sm transition-all ${
                    privacy === 'inviteOnly' 
                      ? 'bg-yellow-700/30 border border-yellow-500/50 text-yellow-400' 
                      : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'
                  }`}
                >
                  Invite Only
                </button>
                <button 
                  type="button" 
                  onClick={() => setPrivacy('private')}
                  className={`p-2 rounded-lg text-center text-sm transition-all ${
                    privacy === 'private' 
                      ? 'bg-red-700/30 border border-red-500/50 text-red-400' 
                      : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'
                  }`}
                >
                  Private
                </button>
              </div>
              {privacy === 'private' && (
                <div className="mt-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/50">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-gray-300 text-sm font-medium">
                      6-Character Room Code
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newCode = generateRoomCode();
                        setGeneratedCode(newCode);
                        setPassword(newCode);
                      }}
                      className="text-purple-400 hover:text-purple-300 text-sm underline transition-colors"
                    >
                      Generate New Code
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Room code will be generated"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center font-mono text-lg tracking-widest uppercase"
                        value={generatedCode}
                        readOnly
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCode);
                        alert('Room code copied to clipboard!');
                      }}
                      className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Copy
                    </button>
                  </div>
                  
                  <p className="text-gray-500 text-xs mt-2">
                    Share this code with players who want to join your private room
                  </p>
                </div>
              )}
              {privacy === 'inviteOnly' && (
                <div className="mt-4 p-3 bg-yellow-700/10 rounded-lg border border-yellow-500/30">
                  <p className="text-yellow-400 text-sm">
                    📧 After creating the room, you'll get an invite URL to share with your friends
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-center bg-gray-700/30 p-3 rounded-lg">
              <div className="mr-3">
                <MicIcon size={20} className={enableVoiceChat ? 'text-purple-400' : 'text-gray-500'} />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Voice Chat</label>
              </div>
              <div>
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={enableVoiceChat} 
                    onChange={() => setEnableVoiceChat(!enableVoiceChat)} 
                  />
                  <div className="relative w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
            <div className="flex items-center bg-gray-700/30 p-3 rounded-lg">
              <div className="mr-3">
                <EyeIcon size={20} className={allowSpectators ? 'text-purple-400' : 'text-gray-500'} />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Allow Spectators</label>
              </div>
              <div>
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={allowSpectators} 
                    onChange={() => setAllowSpectators(!allowSpectators)} 
                  />
                  <div className="relative w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button 
            type="submit" 
            className={`px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-purple-500/25 flex items-center justify-center ${
              isLoading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {gameMode === 'playNow' ? 'Creating...' : 'Scheduling...'}
              </>
            ) : (
              gameMode === 'playNow' ? 'Create & Start Game' : 'Schedule Game'
            )}
          </button>
        </div>
      </form>

      {/* Invite URL Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                  <ExternalLink size={20} className="text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Invite Friends</h3>
                  <p className="text-sm text-gray-400">Share this URL to invite players</p>
                </div>
              </div>
              <button
                onClick={handleInviteModalClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-medium mb-3">
                Game Room URL
              </label>
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={inviteUrl}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm text-gray-200"
                  />
                </div>
                <button
                  onClick={copyInviteUrl}
                  className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2"
                >
                  <Copy size={16} />
                  <span>Copy</span>
                </button>
              </div>
            </div>

            <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <p className="text-yellow-400 text-sm">
                💡 <strong>Tip:</strong> Share this URL with your friends so they can join your invite-only game room directly.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleInviteModalClose}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Continue to Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// import React, { useState, useEffect, useRef } from 'react';
// import { SectionTitle } from '../components/UI/SectionTitle';
// import { CalendarIcon, ClockIcon, UsersIcon, EyeIcon, MicIcon, Copy, X, ExternalLink } from 'lucide-react';
// import { useSocket } from '../SocketContext';
// import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';

// interface CreateGameRoomPageProps {
//   onGameCreated?: () => void;
// }

// interface GameRoomData {
//   name: string;
//   gameType: string;
//   maxPlayers: number;
//   isPrivate: boolean;
//   password?: string;
//   scheduledTimeCombined?: string;
//   description?: string;
//   enableVideoChat: boolean;
//   enableVoiceChat: boolean;
//   allowSpectators: boolean;
//   hostId: string;
//   hostName: string;
// }

// export const CreateGameRoomPage = ({ onGameCreated }: CreateGameRoomPageProps) => {
//   const [gameType, setGameType] = useState('');
//   const [gameMode, setGameMode] = useState('playNow');
//   const [roomName, setRoomName] = useState('');
//   const [description, setDescription] = useState('');
//   const [playerLimit, setPlayerLimit] = useState(10);
//   const [privacy, setPrivacy] = useState('public');
//   const [enableVideoChat] = useState(true);
//   const [enableVoiceChat, setEnableVoiceChat] = useState(true);
//   const [allowSpectators, setAllowSpectators] = useState(true);
//   const [scheduledDate, setScheduledDate] = useState('');
//   const [scheduledTime, setScheduledTime] = useState('');
//   const [password, setPassword] = useState('');
//   const [generatedCode, setGeneratedCode] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
  
//   // Add new state for invite modal
//   const [showInviteModal, setShowInviteModal] = useState(false);
//   const [inviteUrl, setInviteUrl] = useState('');
//   const [createdGameData, setCreatedGameData] = useState<any>(null);
  
//   const navigate = useNavigate();
//   const socket = useSocket();
//   const { user } = useAuth(); 
//   const isMountedRef = useRef(true); 

//   const gameTypes = [
//     // { id: 'kahoot', name: 'Kahoot', icon: '🎯' },
//     // { id: 'ludo', name: 'Ludo', icon: '🎲' },
//     { id: 'chess', name: 'Chess', icon: '♟️' },
//     // { id: 'uno', name: 'UNO', icon: '🃏' },
//     { id: 'trivia', name: 'Trivia', icon: '❓' },
//     // { id: 'pictionary', name: 'Pictionary', icon: '🎨' },
//     // { id: 'sudoku', name: 'Sudoku', icon: '🔢' }
//   ];

//   useEffect(() => {
//     return () => {
//       isMountedRef.current = false;
//     };
//   }, []);

//   // Add function to generate 6-character code
//   const generateRoomCode = () => {
//     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
//     let result = '';
//     for (let i = 0; i < 6; i++) {
//       result += characters.charAt(Math.floor(Math.random() * characters.length));
//     }
//     return result;
//   };

//   // Generate code when privacy is set to private
//   useEffect(() => {
//     if (privacy === 'private') {
//       const newCode = generateRoomCode();
//       setGeneratedCode(newCode);
//       setPassword(newCode);
//     } else {
//       setGeneratedCode('');
//       setPassword('');
//     }
//   }, [privacy]);

//   // Set player limit to 10 for chess games - the host can make 2 players the ones to attend and the others later
//   useEffect(() => {
//     if (gameType === 'chess') {
//       setPlayerLimit(10);
//     }
//   }, [gameType]);

//   // Add function to copy URL to clipboard
//   const copyInviteUrl = async () => {
//     try {
//       await navigator.clipboard.writeText(inviteUrl);
//       alert('Invite URL copied to clipboard!');
//     } catch (err) {
//       console.error('Failed to copy URL:', err);
//       // Fallback for older browsers
//       const textArea = document.createElement('textarea');
//       textArea.value = inviteUrl;
//       document.body.appendChild(textArea);
//       textArea.select();
//       document.execCommand('copy');
//       document.body.removeChild(textArea);
//       alert('Invite URL copied to clipboard!');
//     }
//   };

//   // Add function to handle modal close and navigation
//   const handleInviteModalClose = () => {
//     setShowInviteModal(false);
//     if (createdGameData) {
//       if (gameMode === 'playNow' && createdGameData?.roomId) {
//         navigate(`/game-room/${createdGameData.roomId}`);
//       } else {
//         navigate('/my-game-rooms');
//       }
//     }
//     if (onGameCreated) onGameCreated();
//   };

//   // Enhanced function to join host as player (consistent with GameRoomJoinModal approach)
//   const joinHostAsPlayer = async (gameRoomId: string, roomPassword?: string): Promise<boolean> => {
//     if (!socket || !user) {
//       console.error('Missing socket or user for auto-join');
//       return false;
//     }

//     try {
//       console.log('Auto-joining host as player to room:', gameRoomId);

//       const myId = String(user.id); 
      
//       const joinPayload = {
//         roomId: gameRoomId,
//         playerId: myId, 
//         playerName: user.username,
//         joinAsPlayer: true, // Explicitly set this flag
//         isHost: true, // Add host flag for better identification
//         password: roomPassword // Include password for private rooms
//       };

//       console.log('Join payload:', joinPayload);

//       const joinResult = await new Promise<boolean>((resolve) => {
//         const timeout = setTimeout(() => {
//           console.warn('Host auto-join timed out');
//           cleanupListeners();
//           resolve(false);
//         }, 30000); // Increased timeout

//         const handleJoinSuccess = (data: any) => {
//           console.log('Host successfully joined as player:', data);
//           clearTimeout(timeout);
//           cleanupListeners();
//           resolve(true);
//         };

//         const handlePlayerJoined = (data: any) => {
//           // Check if this is our join event
//           if (data.playerId === myId || data.playerId === myId) {
//             console.log('Host player joined event received:', data);
//             clearTimeout(timeout);
//             cleanupListeners();
//             resolve(true);
//           }
//         };

//         const handleJoinError = (error: any) => {
//           console.error('Host auto-join failed:', error);
//           clearTimeout(timeout);
//           cleanupListeners();
//           resolve(false);
//         };

//         const handleError = (error: any) => {
//           console.error('General error during host auto-join:', error);
//           clearTimeout(timeout);
//           cleanupListeners();
//           resolve(false);
//         };

//         const cleanupListeners = () => {
//           socket.off('joinGameSuccess', handleJoinSuccess);
//           socket.off('playerJoined', handlePlayerJoined);
//           socket.off('joinGameError', handleJoinError);
//           socket.off('error', handleError);
//         };

//         // Listen for multiple possible success events
//         socket.on('joinGameSuccess', handleJoinSuccess);
//         socket.on('playerJoined', handlePlayerJoined);
//         socket.on('joinGameError', handleJoinError);
//         socket.on('error', handleError);

//         // Emit the join request
//         socket.emit('joinGame', joinPayload);
//       });

//       if (joinResult) {
//         console.log('Host successfully auto-joined as player');
//       } else {
//         console.warn('Host auto-join failed or timed out');
//       }

//       return joinResult;
//     } catch (error) {
//       console.error('Error in joinHostAsPlayer:', error);
//       return false;
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();

//     // Validate required fields
//     if (!gameType) {
//       alert('Please select a game type');
//       return;
//     }

//     if (!roomName.trim()) {
//       alert('Please enter a room name');
//       return;
//     }

//     if (!user) {
//       alert('Please login to create a game room');
//       navigate('/login');
//       return;
//     }

//     if (privacy === 'private' && !password.trim()) {
//       alert('Please enter a password for private room');
//       return;
//     }

//     if (gameMode === 'schedule' && (!scheduledDate || !scheduledTime)) {
//       alert('Please select both date and time for scheduled games');
//       return;
//     }

//     if (!socket) {
//       alert("Connection error. Please refresh and try again.");
//       return;
//     }

//     setIsLoading(true);

//     const scheduledTimeCombined = (scheduledDate && scheduledTime)
//       ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
//       : undefined;

//     const gameRoomData: GameRoomData = {
//       name: roomName,
//       gameType: gameType.trim().toLowerCase(),
//       maxPlayers: playerLimit,
//       isPrivate: privacy === 'private' || privacy === 'inviteOnly',
//       // isInviteOnly: privacy === 'inviteOnly',
//       password: privacy === 'private' ? password : undefined,
//       hostId: String(user.id), 
//       hostName: user.username,
//       scheduledTimeCombined,
//       description: description.trim() || undefined,
//       enableVideoChat,
//       enableVoiceChat,
//       allowSpectators,
//     };

//     try {
//       if (!socket) {
//         throw new Error("Connection error. Please refresh and try again.");
//       }

//       let responded = false;
//       const timeout = setTimeout(() => {
//         if (responded || !isMountedRef.current) return;
//         responded = true;
//         setIsLoading(false);
//         alert('Request timed out. Please try again.');
//       }, 15000); // Increased timeout

//       const handleGameCreated = async (game: any) => {
//         if (responded || !isMountedRef.current) return;
//         responded = true;
//         clearTimeout(timeout);
//         setIsLoading(false);
        
//         console.log('Game created successfully:', game);
        
//         // Store the created game data
//         setCreatedGameData(game);
        
//         // Automatically join the host as a player for all games
//         if (game?.roomId) {
//           console.log('Attempting to auto-join host as player...');
          
//           // Add a small delay to ensure the room is fully created
//           await new Promise(resolve => setTimeout(resolve, 3000));
          
//           const joinSuccess = await joinHostAsPlayer(
//             game.roomId, 
//             privacy === 'private' ? password : undefined
//           );
          
//           if (!joinSuccess) {
//             console.warn('Host auto-join failed, but continuing with game creation');
//             // Don't fail the entire flow, just log the warning
//           } else {
//             console.log('Host successfully joined as player');
//           }
//         }
        
//         // Check if this is an invite-only room for playNow mode
//         if (privacy === 'inviteOnly' && gameMode === 'playNow' && game?.roomId) {
//           // Generate invite URL and show modal
//           const baseUrl = window.location.origin;
//           const gameUrl = `${baseUrl}/game-room/${game.roomId}`;
//           setInviteUrl(gameUrl);
//           setShowInviteModal(true);
//         } else {
//           // Normal flow for other privacy settings
//           if (gameMode === 'playNow' && game?.roomId) {
//             navigate(`/game-room/${game.roomId}`);
//           } else {
//             navigate('/my-game-rooms');
//             console.log('Game scheduled successfully!');
//           }
          
//           if (onGameCreated) onGameCreated();
//         }
//       };

//       const handleError = (error: any) => {
//         if (responded || !isMountedRef.current) return;
//         responded = true;
//         clearTimeout(timeout);
//         setIsLoading(false);
//         console.error('Game creation error:', error);
//         alert(error.message || 'Failed to create game room');
//       };

//       socket.once('gameCreated', handleGameCreated);
//       socket.once('error', handleError);
//       socket.emit('createGame', gameRoomData);

//     } catch (error) {
//       if (isMountedRef.current) {
//         setIsLoading(false);
//         alert('Failed to create game room. Please try again.');
//         console.error('Create game error:', error);
//       }
//     }
//   };

//   return (
//     <div className="p-6 overflow-y-auto h-screen pb-20">
//       <SectionTitle 
//         title="Create Game Room" 
//         subtitle="Set up a new game room for you and your friends to play in" 
//       />
      
//       <form onSubmit={handleSubmit} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
//         {/* Game Type Selection */}
//         <div className="mb-8">
//           <label className="block text-white mb-3 font-medium">
//             Select Game Type
//           </label>
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
//             {gameTypes.map(game => (
//               <button 
//                 key={game.id} 
//                 type="button" 
//                 onClick={() => setGameType(game.id)}
//                 className={`aspect-square flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
//                   gameType === game.id 
//                     ? 'bg-purple-700/50 border-2 border-purple-500' 
//                     : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'
//                 }`}
//               >
//                 <span className="text-4xl mb-2">{game.icon}</span>
//                 <span className="text-sm font-medium">{game.name}</span>
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Game Mode */}
//         <div className="mb-8">
//           <label className="block text-white mb-3 font-medium">Game Mode</label>
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//             <button 
//               type="button" 
//               onClick={() => setGameMode('playNow')}
//               className={`flex items-center p-4 rounded-xl transition-all ${
//                 gameMode === 'playNow' 
//                   ? 'bg-purple-700/50 border-2 border-purple-500' 
//                   : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'
//               }`}
//             >
//               <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center mr-4">
//                 🎮
//               </div>
//               <div>
//                 <h3 className="font-medium">Play Now</h3>
//                 <p className="text-sm text-gray-400">
//                   Create a game room that starts immediately
//                 </p>
//               </div>
//             </button>
//             <button 
//               type="button" 
//               onClick={() => setGameMode('schedule')}
//               className={`flex items-center p-4 rounded-xl transition-all ${
//                 gameMode === 'schedule' 
//                   ? 'bg-purple-700/50 border-2 border-purple-500' 
//                   : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'
//               }`}
//             >
//               <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center mr-4">
//                 📅
//               </div>
//               <div>
//                 <h3 className="font-medium">Schedule for Later</h3>
//                 <p className="text-sm text-gray-400">
//                   Set a future time for your game
//                 </p>
//               </div>
//             </button>
//           </div>
//         </div>

//         {/* Schedule Details */}
//         {gameMode === 'schedule' && (
//           <div className="mb-8 p-4 bg-gray-700/30 rounded-xl border border-gray-600/50">
//             <div className="flex flex-col sm:flex-row gap-4">
//               <div className="flex-1">
//                 <label className="block text-white mb-2 text-sm">Date</label>
//                 <div className="relative">
//                   <CalendarIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
//                   <input 
//                     type="date" 
//                     className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" 
//                     value={scheduledDate} 
//                     onChange={e => setScheduledDate(e.target.value)} 
//                     required
//                   />
//                 </div>
//               </div>
//               <div className="flex-1">
//                 <label className="block text-white mb-2 text-sm">Time</label>
//                 <div className="relative">
//                   <ClockIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
//                   <input 
//                     type="time" 
//                     className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" 
//                     value={scheduledTime} 
//                     onChange={e => setScheduledTime(e.target.value)} 
//                     required
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Room Details */}
//         <div className="mb-8">
//           <label className="block text-white mb-3 font-medium">Room Details</label>
//           <div className="grid grid-cols-1 gap-4">
//             <div>
//               <label className="block text-gray-300 mb-2 text-sm">Room Name</label>
//               <input 
//                 type="text" 
//                 placeholder="Enter a name for your game room" 
//                 className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" 
//                 value={roomName} 
//                 onChange={e => setRoomName(e.target.value)} 
//                 required
//               />
//             </div>
//             <div>
//               <label className="block text-gray-300 mb-2 text-sm">Description (Optional)</label>
//               <textarea 
//                 placeholder="Describe your game room..." 
//                 className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none h-24" 
//                 value={description} 
//                 onChange={e => setDescription(e.target.value)}
//               ></textarea>
//             </div>
//           </div>
//         </div>

//         {/* Settings */}
//         <div className="mb-8">
//           <label className="block text-white mb-3 font-medium">Settings</label>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div>
//               <label className="flex items-center justify-between text-gray-300 mb-2 text-sm">
//                 <span>Player Limit</span>
//                 <span className="bg-gray-700 px-2 py-1 rounded text-xs">
//                   {playerLimit} players
//                 </span>
//               </label>
//               <p className="text-xs text-gray-500 mb-3">
//                 {gameType === 'chess' 
//                   ? 'Chess is a 2-player game.'
//                   : `First ${playerLimit} users to join will be players. Others will automatically become spectators.`
//                 }
//               </p>
//               <div className="relative flex items-center">
//                 <UsersIcon size={18} className="absolute left-3 text-gray-400" />
//                 <input 
//                   type="range" 
//                   min="2" 
//                   max="50" 
//                   className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 ml-10 ${
//                     gameType === 'chess' ? 'opacity-50 cursor-not-allowed' : ''
//                   }`}
//                   value={playerLimit} 
//                   onChange={e => setPlayerLimit(parseInt(e.target.value))}
//                   disabled={gameType === 'chess'}
//                 />
//               </div>
//             </div>
//             <div>
//               <label className="block text-gray-300 mb-2 text-sm">Privacy Settings</label>
//               <div className="grid grid-cols-3 gap-2">
//                 <button 
//                   type="button" 
//                   onClick={() => setPrivacy('public')}
//                   className={`p-2 rounded-lg text-center text-sm transition-all ${
//                     privacy === 'public' 
//                       ? 'bg-green-700/30 border border-green-500/50 text-green-400' 
//                       : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'
//                   }`}
//                 >
//                   Public
//                 </button>
//                 <button 
//                   type="button" 
//                   onClick={() => setPrivacy('inviteOnly')}
//                   className={`p-2 rounded-lg text-center text-sm transition-all ${
//                     privacy === 'inviteOnly' 
//                       ? 'bg-yellow-700/30 border border-yellow-500/50 text-yellow-400' 
//                       : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'
//                   }`}
//                 >
//                   Invite Only
//                 </button>
//                 <button 
//                   type="button" 
//                   onClick={() => setPrivacy('private')}
//                   className={`p-2 rounded-lg text-center text-sm transition-all ${
//                     privacy === 'private' 
//                       ? 'bg-red-700/30 border border-red-500/50 text-red-400' 
//                       : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'
//                   }`}
//                 >
//                   Private
//                 </button>
//               </div>
//               {privacy === 'private' && (
//                 <div className="mt-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/50">
//                   <div className="flex items-center justify-between mb-3">
//                     <label className="block text-gray-300 text-sm font-medium">
//                       6-Character Room Code
//                     </label>
//                     <button
//                       type="button"
//                       onClick={() => {
//                         const newCode = generateRoomCode();
//                         setGeneratedCode(newCode);
//                         setPassword(newCode);
//                       }}
//                       className="text-purple-400 hover:text-purple-300 text-sm underline transition-colors"
//                     >
//                       Generate New Code
//                     </button>
//                   </div>
                  
//                   <div className="flex items-center space-x-3">
//                     <div className="flex-1">
//                       <input
//                         type="text"
//                         placeholder="Room code will be generated"
//                         className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center font-mono text-lg tracking-widest uppercase"
//                         value={generatedCode}
//                         readOnly
//                       />
//                     </div>
//                     <button
//                       type="button"
//                       onClick={() => {
//                         navigator.clipboard.writeText(generatedCode);
//                         alert('Room code copied to clipboard!');
//                       }}
//                       className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
//                     >
//                       Copy
//                     </button>
//                   </div>
                  
//                   <p className="text-gray-500 text-xs mt-2">
//                     Share this code with players who want to join your private room
//                   </p>
//                 </div>
//               )}
//               {privacy === 'inviteOnly' && (
//                 <div className="mt-4 p-3 bg-yellow-700/10 rounded-lg border border-yellow-500/30">
//                   <p className="text-yellow-400 text-sm">
//                     📧 After creating the room, you'll get an invite URL to share with your friends
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
//             <div className="flex items-center bg-gray-700/30 p-3 rounded-lg">
//               <div className="mr-3">
//                 <MicIcon size={20} className={enableVoiceChat ? 'text-purple-400' : 'text-gray-500'} />
//               </div>
//               <div className="flex-1">
//                 <label className="text-sm font-medium">Voice Chat</label>
//               </div>
//               <div>
//                 <label className="inline-flex items-center cursor-pointer">
//                   <input 
//                     type="checkbox" 
//                     className="sr-only peer" 
//                     checked={enableVoiceChat} 
//                     onChange={() => setEnableVoiceChat(!enableVoiceChat)} 
//                   />
//                   <div className="relative w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
//                 </label>
//               </div>
//             </div>
//             <div className="flex items-center bg-gray-700/30 p-3 rounded-lg">
//               <div className="mr-3">
//                 <EyeIcon size={20} className={allowSpectators ? 'text-purple-400' : 'text-gray-500'} />
//               </div>
//               <div className="flex-1">
//                 <label className="text-sm font-medium">Allow Spectators</label>
//               </div>
//               <div>
//                 <label className="inline-flex items-center cursor-pointer">
//                   <input 
//                     type="checkbox" 
//                     className="sr-only peer" 
//                     checked={allowSpectators} 
//                     onChange={() => setAllowSpectators(!allowSpectators)} 
//                   />
//                   <div className="relative w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
//                 </label>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Submit Button */}
//         <div className="flex justify-end">
//           <button 
//             type="submit" 
//             className={`px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-purple-500/25 flex items-center justify-center ${
//               isLoading ? 'opacity-75 cursor-not-allowed' : ''
//             }`}
//             disabled={isLoading}
//           >
//             {isLoading ? (
//               <>
//                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                 </svg>
//                 {gameMode === 'playNow' ? 'Creating...' : 'Scheduling...'}
//               </>
//             ) : (
//               gameMode === 'playNow' ? 'Create & Start Game' : 'Schedule Game'
//             )}
//           </button>
//         </div>
//       </form>

//       {/* Invite URL Modal */}
//       {showInviteModal && (
//         <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-6 shadow-2xl">
//             <div className="flex items-center justify-between mb-6">
//               <div className="flex items-center space-x-3">
//                 <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
//                   <ExternalLink size={20} className="text-yellow-400" />
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-semibold text-white">Invite Friends</h3>
//                   <p className="text-sm text-gray-400">Share this URL to invite players</p>
//                 </div>
//               </div>
//               <button
//                 onClick={handleInviteModalClose}
//                 className="text-gray-400 hover:text-white transition-colors"
//               >
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="mb-6">
//               <label className="block text-gray-300 text-sm font-medium mb-3">
//                 Game Room URL
//               </label>
//               <div className="flex items-center space-x-3">
//                 <div className="flex-1">
//                   <input
//                     type="text"
//                     value={inviteUrl}
//                     readOnly
//                     className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm text-gray-200"
//                   />
//                 </div>
//                 <button
//                   onClick={copyInviteUrl}
//                   className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2"
//                 >
//                   <Copy size={16} />
//                   <span>Copy</span>
//                 </button>
//               </div>
//             </div>

//             <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
//               <p className="text-yellow-400 text-sm">
//                 💡 <strong>Tip:</strong> Share this URL with your friends so they can join your invite-only game room directly.
//               </p>
//             </div>

//             <div className="flex space-x-3">
//               <button
//                 onClick={handleInviteModalClose}
//                 className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
//               >
//                 Continue to Game
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };
