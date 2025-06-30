import React, { useState } from 'react';
import { SectionTitle } from '../components/UI/SectionTitle';
import { CalendarIcon, ClockIcon, UsersIcon, LockIcon, EyeIcon, VideoIcon, MicIcon } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

interface CreateGameRoomPageProps {
  onGameCreated: () => void;
}

interface GameRoomData {
  name: string;
  gameType: string;
  maxPlayers: number;
  isPrivate: boolean;
  password?: string; // Make password optional
  // Add other relevant fields as needed
  scheduledDate?: string; // Add optional scheduledDate
  scheduledTime?: string; // Add optional scheduledTime
}

export const CreateGameRoomPage = ({
  onGameCreated
}: CreateGameRoomPageProps) => {
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
  const navigate = useNavigate(); 

  const gameTypes = [{
    id: 'kahoot',
    name: 'Kahoot',
    icon: '🎯'
  },
  {
    id: 'ludo',
    name: 'Ludo',
    icon: '🎲'
  },
   {
    id: 'chess',
    name: 'Chess',
    icon: '♟️'
  }, {
    id: 'uno',
    name: 'UNO',
    icon: '🃏'
  }, {
    id: 'trivia',
    name: 'Trivia',
    icon: '❓'
  }, {
    id: 'pictionary',
    name: 'Pictionary',
    icon: '🎨'
  }, {
    id: 'sudoku',
    name: 'Sudoku',
    icon: '🔢'
  }];
 
  
// Update handleSubmit to use socket.io for game creation
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const gameRoomData = {
    name: roomName,
    gameType: gameType,
    maxPlayers: playerLimit,
    isPrivate: privacy === 'private' || privacy === 'inviteOnly',
    password: privacy === 'private' ? password : undefined,
    hostId: 'current-user-id', // Replace with actual user ID
  };

  try {
    // Initialize socket connection if not already done
    const socket = io('https://alu-globe-gameroom.onrender.com'); // Replace with your backend URL
    
    // Emit createGame event
    socket.emit('createGame', gameRoomData);
    
    // Listen for gameCreated event
    socket.on('gameCreated', (game:any) => {
      // Navigate to the game room
      navigate(`/game-room/${game.roomId}`);
    });
    
    socket.on('error', (error:any) => {
      console.error('Error creating game room:', error);
      // TODO: Display error to user
    });
  } catch (error) {
    console.error('Failed to create game room:', error);
    // TODO: Display error to user
  }
};
  return <div className="p-6 overflow-y-auto h-screen pb-20">
      <SectionTitle title="Create Game Room" subtitle="Set up a new game room for you and your friends to play in" />
      <form onSubmit={handleSubmit} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        {/* Game Type Selection */}
        <div className="mb-8">
          <label className="block text-white mb-3 font-medium">
            Select Game Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {gameTypes.map(game => <button key={game.id} type="button" onClick={() => setGameType(game.id)} className={`aspect-square flex flex-col items-center justify-center p-4 rounded-xl transition-all ${gameType === game.id ? 'bg-purple-700/50 border-2 border-purple-500' : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'}`}>
                <span className="text-4xl mb-2">{game.icon}</span>
                <span className="text-sm font-medium">{game.name}</span>
              </button>)}
          </div>
        </div>
        {/* Game Mode */}
        <div className="mb-8">
          <label className="block text-white mb-3 font-medium">Game Mode</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button type="button" onClick={() => setGameMode('playNow')} className={`flex items-center p-4 rounded-xl transition-all ${gameMode === 'playNow' ? 'bg-purple-700/50 border-2 border-purple-500' : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'}`}>
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
            <button type="button" onClick={() => setGameMode('schedule')} className={`flex items-center p-4 rounded-xl transition-all ${gameMode === 'schedule' ? 'bg-purple-700/50 border-2 border-purple-500' : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'}`}>
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
        {/* Schedule Details (conditionally rendered) */}
        {gameMode === 'schedule' && <div className="mb-8 p-4 bg-gray-700/30 rounded-xl border border-gray-600/50">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-white mb-2 text-sm">Date</label>
                <div className="relative">
                  <CalendarIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input type="date" className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-white mb-2 text-sm">Time</label>
                <div className="relative">
                  <ClockIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input type="time" className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
                </div>
              </div>
            </div>
          </div>}
        {/* Room Details */}
        <div className="mb-8">
          <label className="block text-white mb-3 font-medium">
            Room Details
          </label>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                Room Name
              </label>
              <input type="text" placeholder="Enter a name for your game room" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" value={roomName} onChange={e => setRoomName(e.target.value)} />
            </div>
            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                Description (Optional)
              </label>
              <textarea placeholder="Describe your game room..." className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none h-24" value={description} onChange={e => setDescription(e.target.value)}></textarea>
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
                <input type="range" min="2" max="50" className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 ml-10" value={playerLimit} onChange={e => setPlayerLimit(parseInt(e.target.value))} />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 mb-2 text-sm">
                Privacy Settings
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setPrivacy('public')} className={`p-2 rounded-lg text-center text-sm transition-all ${privacy === 'public' ? 'bg-green-700/30 border border-green-500/50 text-green-400' : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'}`}>
                  Public
                </button>
                <button type="button" onClick={() => setPrivacy('inviteOnly')} className={`p-2 rounded-lg text-center text-sm transition-all ${privacy === 'inviteOnly' ? 'bg-yellow-700/30 border border-yellow-500/50 text-yellow-400' : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'}`}>
                  Invite Only
                </button>
                <button type="button" onClick={() => setPrivacy('private')} className={`p-2 rounded-lg text-center text-sm transition-all ${privacy === 'private' ? 'bg-red-700/30 border border-red-500/50 text-red-400' : 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'}`}>
                  Private
                </button>
              </div>
              {/* Password input for private rooms */}
              {privacy === 'private' && (
                <div className="mt-4">
                  <label className="block text-gray-300 mb-2 text-sm">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter password for private room"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  <input type="checkbox" className="sr-only peer" checked={enableVideoChat} onChange={() => setEnableVideoChat(!enableVideoChat)} />
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
                  <input type="checkbox" className="sr-only peer" checked={enableVoiceChat} onChange={() => setEnableVoiceChat(!enableVoiceChat)} />
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
                  <input type="checkbox" className="sr-only peer" checked={allowSpectators} onChange={() => setAllowSpectators(!allowSpectators)} />
                  <div className="relative w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
        {/* Submit Button */}
        <div className="flex justify-end">
          <button type="submit" className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-purple-500/25">
            {gameMode === 'playNow' ? 'Create & Start Game' : 'Schedule Game'}
          </button>
        </div>
      </form>
    </div>;
};



 // const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();

  //   const gameRoomData: GameRoomData = {
  //     name: roomName,
  //     gameType: gameType,
  //     maxPlayers: playerLimit,
  //     isPrivate: privacy === 'private' || privacy === 'inviteOnly',
  //     // Add other relevant fields as needed
  //   };

  //   if (privacy === 'private') {
  //     gameRoomData.password = password;
  //   }

  //   if (gameMode === 'schedule') {
  //     gameRoomData.scheduledDate = scheduledDate;
  //     gameRoomData.scheduledTime = scheduledTime;
  //   }

  //   try {
  //     const response = await fetch('/api/game-rooms', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify(gameRoomData),
  //     });

  //     if (response.ok) {
  //       const newGameRoom = await response.json();
  //       console.log('Game room created:', newGameRoom);
  //       onGameCreated(); // Call the success callback
  //     } else {
  //       const errorData = await response.json();
  //       console.error('Error creating game room:', errorData.error);
  //       // TODO: Display an error message to the user
  //     }
  //   } catch (error) {
  //     console.error('Failed to create game room:', error);
  //     // TODO: Display an error message to the user
  //   }
  // };
