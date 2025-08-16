import React from 'react';
import { UsersIcon, LockIcon, UnlockIcon, ClockIcon } from 'lucide-react';

interface GameRoomCardProps {
  gameRoom: any;
  onJoinRoom: (gameRoom: any) => void;
  playerIdToUsername?: Record<string, string>; // Add this prop for username mapping
}

export const GameRoomCard: React.FC<GameRoomCardProps> = ({
  gameRoom,
  onJoinRoom,
  playerIdToUsername = {}
}) => {
  const {
    id,
    name,
    gameType,
    hostId,
    hostName, // Check for hostName first
    hostAvatar,
    currentPlayers,
    maxPlayers,
    isPrivate,
    isInviteOnly,
    startTime
  } = gameRoom;

  // Get host's display name similar to PlayerList.tsx logic
  const getHostDisplayName = () => {
    console.log('GameRoomCard getHostDisplayName:', { hostName, hostId, playerIdToUsername });
    
    // First check if we have a direct hostName (most reliable)
    if (hostName && typeof hostName === 'string') {
      console.log('Using hostName:', hostName);
      return hostName;
    }
    
    // Check if hostId exists and is valid
    if (!hostId) {
      console.log('No hostId, returning Unknown Host');
      return 'Unknown Host';
    }
    
    // Check if hostId is the current user
    const currentUserId = localStorage.getItem('userId');
    const currentUsername = localStorage.getItem('username');
    
    if (hostId === currentUserId) {
      console.log('Current user is host, returning:', currentUsername ? `${currentUsername} (You)` : 'You');
      return currentUsername ? `${currentUsername} (You)` : 'You';
    }
    
    // For AI hosts
    if (typeof hostId === 'string' && hostId.startsWith('ai-')) {
      console.log('AI host detected:', `AI ${hostId.split('-')[1]}`);
      return `AI ${hostId.split('-')[1]}`;
    }
    
    // Try to get username from the passed playerIdToUsername mapping first
    if (playerIdToUsername[hostId]) {
      console.log('Found username in playerIdToUsername mapping:', playerIdToUsername[hostId]);
      return playerIdToUsername[hostId];
    }
    
    // Fallback to localStorage cache
    const cachedUsername = localStorage.getItem(`username_${hostId}`);
    console.log('Fallback to localStorage cache:', cachedUsername || hostId);
    return cachedUsername || hostId;
  };

  const getGameIcon = () => {
    // Safety check for gameType
    if (!gameType || typeof gameType !== 'string') {
      return '🎮';
    }
    
    switch (gameType.toLowerCase()) {
      case 'kahoot':
        return '🎯';
      case 'chess':
        return '♟️';
      case 'uno':
        return '🃏';
      case 'trivia':
        return '❓';
      case 'pictionary':
        return '🎨';
      default:
        return '🎮';
    }
  };

  const getBadgeClass = () => {
    if (isPrivate) return 'bg-red-500/20 text-red-400 border border-red-500/30';
    if (isInviteOnly) return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    return 'bg-green-500/20 text-green-400 border border-green-500/30';
  };

  const getBadgeText = () => {
    if (isPrivate) return 'Private';
    if (isInviteOnly) return 'Invite Only';
    return 'Public';
  };

  const getBadgeIcon = () => {
    if (isPrivate || isInviteOnly) return <LockIcon size={14} className="mr-1" />;
    return <UnlockIcon size={14} className="mr-1" />;
  };

  // Check if game is starting soon (within 10 minutes)
  const isStartingSoon = startTime && 
  new Date(startTime).getTime() - new Date().getTime() < 10 * 60 * 1000 && 
  new Date(startTime).getTime() > new Date().getTime();
  
  // Additional safety checks for required properties
  if (!gameRoom || typeof gameRoom !== 'object') {
    return <div className="p-4 text-red-400">Invalid game room data</div>;
  }
  
  const hostDisplayName = getHostDisplayName();
  
  return <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/20 hover:border-purple-500/50">
      {isStartingSoon && <div className="absolute top-2 right-2 bg-orange-500 text-xs py-1 px-2 rounded-full animate-pulse flex items-center">
          <ClockIcon size={12} className="mr-1" /> Starting Soon
        </div>}
      <div className="p-4">
        <div className="flex items-center mb-3">
          <div className="w-10 h-10 rounded-lg bg-purple-700/30 flex items-center justify-center text-2xl">
            {getGameIcon()}
          </div>
          <div className="ml-3">
            <h3 className="font-bold text-white">{name}</h3>
            <p className="text-sm text-gray-400">{gameType}</p>
          </div>
        </div>
        <div className="flex items-center mb-4">
          <img src={hostAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${hostId || 'default'}`} alt={hostDisplayName} className="w-6 h-6 rounded-full border border-gray-700" />
          <p className="text-sm text-gray-300 ml-2">Hosted by {hostDisplayName}</p>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-sm text-gray-400">
            <UsersIcon size={16} className="mr-1" />
            <span>
              {currentPlayers}/{maxPlayers} players
            </span>
          </div>
          <div className={`flex items-center text-xs px-2 py-1 rounded-full ${getBadgeClass()}`}>
            {getBadgeIcon()}
            <span>{getBadgeText()}</span>
          </div>
        </div>
        <button onClick={() => onJoinRoom(gameRoom)} className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium transition-all hover:opacity-90 hover:shadow-lg hover:shadow-purple-500/20">
          Join Room
        </button>
      </div>
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </div>;
};