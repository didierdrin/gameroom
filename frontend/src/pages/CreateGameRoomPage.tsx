import React, { useState, useEffect, useRef } from 'react';
import { SectionTitle } from '../components/UI/SectionTitle';
import { CalendarIcon, ClockIcon, UsersIcon, LockIcon, EyeIcon, VideoIcon, MicIcon } from 'lucide-react';
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
}

export const CreateGameRoomPage = ({ onGameCreated }: CreateGameRoomPageProps) => {
  const [gameType, setGameType] = useState('');
  const [gameMode, setGameMode] = useState('playNow');
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [playerLimit, setPlayerLimit] = useState(10);
  const [privacy, setPrivacy] = useState('public');
  const [enableVideoChat, setEnableVideoChat] = useState(true);
  const [enableVoiceChat, setEnableVoiceChat] = useState(true);
  const [allowSpectators, setAllowSpectators] = useState(true);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useAuth(); 
  const isMountedRef = useRef(true); 

  const gameTypes = [
    { id: 'kahoot', name: 'Kahoot', icon: '🎯' },
    { id: 'ludo', name: 'Ludo', icon: '🎲' },
    { id: 'chess', name: 'Chess', icon: '♟️' },
    { id: 'uno', name: 'UNO', icon: '🃏' },
    { id: 'trivia', name: 'Trivia', icon: '❓' },
    { id: 'pictionary', name: 'Pictionary', icon: '🎨' },
    { id: 'sudoku', name: 'Sudoku', icon: '🔢' }
  ];

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
      // isInviteOnly: privacy === 'inviteOnly',
      password: privacy === 'private' ? password : undefined,
      hostId: user.id, 
      hostName: user.username,
      scheduledTimeCombined,
      description: description.trim() || undefined,
      enableVideoChat,
      enableVoiceChat,
      allowSpectators,
    };

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
      }, 10000);

      const handleGameCreated = (game: any) => {
        if (responded || !isMountedRef.current) return;
        responded = true;
        clearTimeout(timeout);
        setIsLoading(false);
        
        if (gameMode === 'playNow' && game?.roomId) {
          navigate(`/game-room/${game.roomId}`);
        } else {
          navigate('/my-game-rooms');
          //alert('Game scheduled successfully!');
          console.log('Game scheduled successfully!');
        }
        
        if (onGameCreated) onGameCreated();
      };

      const handleError = (error: any) => {
        if (responded || !isMountedRef.current) return;
        responded = true;
        clearTimeout(timeout);
        setIsLoading(false);
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
              <div className="relative flex items-center">
                <UsersIcon size={18} className="absolute left-3 text-gray-400" />
                <input 
                  type="range" 
                  min="2" 
                  max="50" 
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 ml-10" 
                  value={playerLimit} 
                  onChange={e => setPlayerLimit(parseInt(e.target.value))} 
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
                <div className="mt-4">
                  <label className="block text-gray-300 mb-2 text-sm">Password</label>
                  <input
                    type="password"
                    placeholder="Enter password for private room"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-center bg-gray-700/30 p-3 rounded-lg">
              <div className="mr-3">
                <VideoIcon size={20} className={enableVideoChat ? 'text-purple-400' : 'text-gray-500'} />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Video Chat</label>
              </div>
              <div>
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={enableVideoChat} 
                    onChange={() => setEnableVideoChat(!enableVideoChat)} 
                  />
                  <div className="relative w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
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
    </div>
  );
};






// import React, { useState } from 'react';
// import { SectionTitle } from '../components/UI/SectionTitle';
// import { CalendarIcon, ClockIcon, UsersIcon, LockIcon, EyeIcon, VideoIcon, MicIcon } from 'lucide-react';
// import { Socket } from 'socket.io-client';
// import { useNavigate } from 'react-router-dom';
// import io from 'socket.io-client';

// interface CreateGameRoomPageProps {
//   onGameCreated: () => void;
// }

// interface GameRoomData {
//   name: string;
//   gameType: string;
//   maxPlayers: number;
//   isPrivate: boolean;
//   password?: string; // Make password optional
//   // Add other relevant fields as needed
//   scheduledDate?: string; // Add optional scheduledDate
//   scheduledTime?: string; // Add optional scheduledTime
// }

// export const CreateGameRoomPage = ({
//   onGameCreated
// }: CreateGameRoomPageProps) => {
//   const [gameType, setGameType] = useState('');
//   const [gameMode, setGameMode] = useState('playNow');
//   const [roomName, setRoomName] = useState('');
//   const [description, setDescription] = useState('');
//   const [playerLimit, setPlayerLimit] = useState(10);
//   const [privacy, setPrivacy] = useState('public');
//   const [enableVideoChat, setEnableVideoChat] = useState(true);
//   const [enableVoiceChat, setEnableVoiceChat] = useState(true);
//   const [allowSpectators, setAllowSpectators] = useState(true);
//   const [scheduledDate, setScheduledDate] = useState('');
//   const [scheduledTime, setScheduledTime] = useState('');
//   const [password, setPassword] = useState('');
//   const navigate = useNavigate(); 

//   const gameTypes = [{
//     id: 'kahoot',
//     name: 'Kahoot',
//     icon: '🎯'
//   },
//   {
//     id: 'ludo',
//     name: 'Ludo',
//     icon: '🎲'
//   },
//    {
//     id: 'chess',
//     name: 'Chess',
//     icon: '♟️'
//   }, {
//     id: 'uno',
//     name: 'UNO',
//     icon: '🃏'
//   }, {
//     id: 'trivia',
//     name: 'Trivia',
//     icon: '❓'
//   }, {
//     id: 'pictionary',
//     name: 'Pictionary',
//     icon: '🎨'
//   }, {
//     id: 'sudoku',
//     name: 'Sudoku',
//     icon: '🔢'
//   }];
 
  


// // Update handleSubmit to use socket.io for game creation
// const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//   e.preventDefault();

//   // Validate required fields
//   if (!gameType) {
//     alert('Please select a game type');
//     return;
//   }

//   if (!roomName.trim()) {
//     alert('Please enter a room name');
//     return;
//   }

//   if (privacy === 'private' && !password.trim()) {
//     alert('Please enter a password for private room');
//     return;
//   }

//   if (gameMode === 'schedule' && (!scheduledDate || !scheduledTime)) {
//     alert('Please select both date and time for scheduled games');
//     return;
//   }

//   const scheduledTimeCombined = (scheduledDate && scheduledTime)
//     ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
//     : undefined;

//   const gameRoomData = {
//     name: roomName,
//     gameType: gameType.trim().toLowerCase(),
//     maxPlayers: playerLimit,
//     isPrivate: privacy === 'private' || privacy === 'inviteOnly',
//     isInviteOnly: privacy === 'inviteOnly',
//     password: privacy === 'private' ? password : undefined,
//     // hostId: localStorage.getItem('playerId') || `player-${Math.random().toString(36).substr(2, 9)}`, // Get actual user ID
//     hostId: localStorage.getItem('userId') || (() => {
//       const fallback = `player-${Math.random().toString(36).substr(2, 9)}`;
//       localStorage.setItem('userId', fallback);
//       return fallback;
//     })(),     
//     scheduledTimeCombined,
//     description: description.trim() || undefined,
//     enableVideoChat,
//     enableVoiceChat,
//     allowSpectators,
//   };

//   try {
//     const socket = io('https://alu-globe-gameroom.onrender.com', {
//       transports: ['websocket'],
//       reconnection: true,
//     });

//     // Wait for socket to connect before emitting createGame
//     socket.on('connect', () => {
//       console.log('Socket connected, creating game...');
//       socket.emit('createGame', gameRoomData);
//     });

//     // Listen for gameCreated event
//     socket.on('gameCreated', (game: any) => {
//       console.log('Game created successfully:', game);
//       // Navigate to the game room
//       // if (game?.roomId) {
//       //   navigate(`/game-room/${game.roomId}`);
//       // }

//       // Navigate to game room only for playNow, homepage for scheduled games
//       if (gameMode === 'playNow' && game?.roomId) {
//         navigate(`/game-room/${game.roomId}`);
//       } else {
//         navigate('/'); // Navigate to homepage for scheduled games
//       }
      
//       socket.disconnect();
//     });
    
//     socket.on('error', (error: any) => {
//       console.error('Error creating game room:', error);
//       alert('Failed to create game room. Please try again.');
//       socket.disconnect();
//     });

//     // Handle connection errors
//     socket.on('connect_error', (error: any) => {
//       console.error('Connection error:', error);
//       alert('Failed to connect to game server. Please try again.');
//       socket.disconnect();
//     });

//     // Add timeout to prevent hanging
//     const timeout = setTimeout(() => {
//       console.error('Create game timeout');
//       alert('Connection timeout. Please try again.');
//       socket.disconnect();
//     }, 10000); // 10 second timeout

//     // Clear timeout when successful
//     socket.on('gameCreated', () => {
//       clearTimeout(timeout);
//     });

//   } catch (error) {
//     console.error('Failed to create game room:', error);
//     alert('Failed to create game room. Please try again.');
//   }
// };



//   return <div className="p-6 overflow-y-auto h-screen pb-20">
//       <SectionTitle title="Create Game Room" subtitle="Set up a new game room for you and your friends to play in" />
//       <form onSubmit={handleSubmit} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
//         {/* Game Type Selection */}
//         <div className="mb-8">
//           <label className="block text-white mb-3 font-medium">
//             Select Game Type
//           </label>
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
//             {gameTypes.map(game => <button key={game.id} type="button" onClick={() => setGameType(game.id)} className={`aspect-square flex flex-col items-center justify-center p-4 rounded-xl transition-all ${gameType === game.id ? 'bg-purple-700/50 border-2 border-purple-500' : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'}`}>
//                 <span className="text-4xl mb-2">{game.icon}</span>
//                 <span className="text-sm font-medium">{game.name}</span>
//               </button>)}
//           </div>
//         </div>
//         {/* Game Mode */}
//         <div className="mb-8">
//           <label className="block text-white mb-3 font-medium">Game Mode</label>
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//             <button type="button" onClick={() => setGameMode('playNow')} className={`flex items-center p-4 rounded-xl transition-all ${gameMode === 'playNow' ? 'bg-purple-700/50 border-2 border-purple-500' : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'}`}>
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
//             <button type="button" onClick={() => setGameMode('schedule')} className={`flex items-center p-4 rounded-xl transition-all ${gameMode === 'schedule' ? 'bg-purple-700/50 border-2 border-purple-500' : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'}`}>
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
//         {/* Schedule Details (conditionally rendered) */}
//         {gameMode === 'schedule' && <div className="mb-8 p-4 bg-gray-700/30 rounded-xl border border-gray-600/50">
//             <div className="flex flex-col sm:flex-row gap-4">
//               <div className="flex-1">
//                 <label className="block text-white mb-2 text-sm">Date</label>
//                 <div className="relative">
//                   <CalendarIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
//                   <input type="date" className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
//                 </div>
//               </div>
//               <div className="flex-1">
//                 <label className="block text-white mb-2 text-sm">Time</label>
//                 <div className="relative">
//                   <ClockIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
//                   <input type="time" className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
//                 </div>
//               </div>
//             </div>
//           </div>}
//         {/* Room Details */}
//         <div className="mb-8">
//           <label className="block text-white mb-3 font-medium">
//             Room Details
//           </label>
//           <div className="grid grid-cols-1 gap-4">
//             <div>
//               <label className="block text-gray-300 mb-2 text-sm">
//                 Room Name
//               </label>
//               <input type="text" placeholder="Enter a name for your game room" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" value={roomName} onChange={e => setRoomName(e.target.value)} />
//             </div>
//             <div>
//               <label className="block text-gray-300 mb-2 text-sm">
//                 Description (Optional)
//               </label>
//               <textarea placeholder="Describe your game room..." className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none h-24" value={description} onChange={e => setDescription(e.target.value)}></textarea>
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
//               <div className="relative flex items-center">
//                 <UsersIcon size={18} className="absolute left-3 text-gray-400" />
//                 <input type="range" min="2" max="50" className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 ml-10" value={playerLimit} onChange={e => setPlayerLimit(parseInt(e.target.value))} />
//               </div>
//             </div>
//             <div>
//               <label className="block text-gray-300 mb-2 text-sm">
//                 Privacy Settings
//               </label>
//               <div className="grid grid-cols-3 gap-2">
//                 <button type="button" onClick={() => setPrivacy('public')} className={`p-2 rounded-lg text-center text-sm transition-all ${privacy === 'public' ? 'bg-green-700/30 border border-green-500/50 text-green-400' : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'}`}>
//                   Public
//                 </button>
//                 <button type="button" onClick={() => setPrivacy('inviteOnly')} className={`p-2 rounded-lg text-center text-sm transition-all ${privacy === 'inviteOnly' ? 'bg-yellow-700/30 border border-yellow-500/50 text-yellow-400' : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'}`}>
//                   Invite Only
//                 </button>
//                 <button type="button" onClick={() => setPrivacy('private')} className={`p-2 rounded-lg text-center text-sm transition-all ${privacy === 'private' ? 'bg-red-700/30 border border-red-500/50 text-red-400' : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'}`}>
//                   Private
//                 </button>
//               </div>
//               {/* Password input for private rooms */}
//               {privacy === 'private' && (
//                 <div className="mt-4">
//                   <label className="block text-gray-300 mb-2 text-sm">
//                     Password
//                   </label>
//                   <input
//                     type="password"
//                     placeholder="Enter password for private room"
//                     className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                   />
//                 </div>
//               )}
//             </div>
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
//             <div className="flex items-center bg-gray-700/30 p-3 rounded-lg">
//               <div className="mr-3">
//                 <VideoIcon size={20} className={enableVideoChat ? 'text-purple-400' : 'text-gray-500'} />
//               </div>
//               <div className="flex-1">
//                 <label className="text-sm font-medium">Video Chat</label>
//               </div>
//               <div>
//                 <label className="inline-flex items-center cursor-pointer">
//                   <input type="checkbox" className="sr-only peer" checked={enableVideoChat} onChange={() => setEnableVideoChat(!enableVideoChat)} />
//                   <div className="relative w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
//                 </label>
//               </div>
//             </div>
//             <div className="flex items-center bg-gray-700/30 p-3 rounded-lg">
//               <div className="mr-3">
//                 <MicIcon size={20} className={enableVoiceChat ? 'text-purple-400' : 'text-gray-500'} />
//               </div>
//               <div className="flex-1">
//                 <label className="text-sm font-medium">Voice Chat</label>
//               </div>
//               <div>
//                 <label className="inline-flex items-center cursor-pointer">
//                   <input type="checkbox" className="sr-only peer" checked={enableVoiceChat} onChange={() => setEnableVoiceChat(!enableVoiceChat)} />
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
//                   <input type="checkbox" className="sr-only peer" checked={allowSpectators} onChange={() => setAllowSpectators(!allowSpectators)} />
//                   <div className="relative w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
//                 </label>
//               </div>
//             </div>
//           </div>
//         </div>
//         {/* Submit Button */}
//         <div className="flex justify-end">
//           <button type="submit" className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-purple-500/25">
//             {gameMode === 'playNow' ? 'Create & Start Game' : 'Schedule Game'}
//           </button>
//         </div>
//       </form>
//     </div>;
// };

