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
    host, // Backend sends 'host' field, not 'hostId'
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
    console.log('GameRoomCard getHostDisplayName - Full gameRoom data:', gameRoom);
    console.log('GameRoomCard getHostDisplayName - Extracted fields:', { hostName, host, playerIdToUsername });
    
    // Get current user's details from localStorage (same as PlayerList)
    const currentUsername = localStorage.getItem('username');
    const currentUserId = localStorage.getItem('userId');
    
    // Check if host exists and is valid
    if (!host) {
      console.log('No host field found, returning Unknown Host');
      return 'Unknown Host';
    }
    
    // Check if host is the current user (same logic as PlayerList)
    if (host === currentUserId) {
      console.log('Current user is host, returning:', currentUsername ? `${currentUsername} (You)` : 'You');
      return currentUsername ? `${currentUsername} (You)` : 'You';
    }
    
    // For AI hosts (same logic as PlayerList)
    if (typeof host === 'string' && host.startsWith('ai-')) {
      const aiName = `AI ${host.split('-')[1]}`;
      console.log('AI host detected:', aiName);
      return aiName;
    }
    
    // First check if we have a direct hostName from backend
    if (hostName && typeof hostName === 'string' && hostName.trim() !== '') {
      console.log('Using hostName from backend:', hostName);
      return hostName;
    }
    
    // Try to get username from the passed playerIdToUsername mapping
    if (playerIdToUsername && playerIdToUsername[host]) {
      console.log('Found username in playerIdToUsername mapping:', playerIdToUsername[host]);
      return playerIdToUsername[host];
    }
    
    // Try to get username from localStorage cache with multiple patterns
    let cachedUsername = null;
    
    // Pattern 1: Direct username key
    cachedUsername = localStorage.getItem(`username_${host}`);
    if (cachedUsername) {
      console.log('Found username in localStorage (pattern 1):', cachedUsername);
      return cachedUsername;
    }
    
    // Pattern 2: Check if there's a players cache
    try {
      const playersCache = localStorage.getItem('playersCache');
      if (playersCache) {
        const parsed = JSON.parse(playersCache);
        if (parsed[host]?.username) {
          console.log('Found username in playersCache:', parsed[host].username);
          return parsed[host].username;
        }
      }
    } catch (error) {
      console.log('Error parsing playersCache:', error);
    }
    
    // Pattern 3: Check if there's a usernames object
    try {
      const usernames = localStorage.getItem('usernames');
      if (usernames) {
        const parsed = JSON.parse(usernames);
        if (parsed[host]) {
          console.log('Found username in usernames object:', parsed[host]);
          return parsed[host];
        }
      }
    } catch (error) {
      console.log('Error parsing usernames object:', error);
    }
    
    // Pattern 4: Check if there's a user cache
    try {
      const userCache = localStorage.getItem('userCache');
      if (userCache) {
        const parsed = JSON.parse(userCache);
        if (parsed[host]?.username) {
          console.log('Found username in userCache:', parsed[host].username);
          return parsed[host].username;
        }
      }
    } catch (error) {
      console.log('Error parsing userCache:', error);
    }
    
    // **KEY FIX**: Similar to PlayerList, use the host ID directly as fallback
    // This ensures we show the host ID instead of "Unknown Host" when username is not found
    console.log('No username found, returning host ID as fallback:', host);
    return host.length > 20 ? `${host.substring(0, 8)}...${host.substring(host.length - 8)}` : host;
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
          <img src={hostAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${host || 'default'}`} alt={hostDisplayName} className="w-6 h-6 rounded-full border border-gray-700" />
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

// import React from 'react';
// import { UsersIcon, LockIcon, UnlockIcon, ClockIcon } from 'lucide-react';

// interface GameRoomCardProps {
//   gameRoom: any;
//   onJoinRoom: (gameRoom: any) => void;
//   playerIdToUsername?: Record<string, string>; // Add this prop for username mapping
// }

// export const GameRoomCard: React.FC<GameRoomCardProps> = ({
//   gameRoom,
//   onJoinRoom,
//   playerIdToUsername = {}
// }) => {
//   const {
//     id,
//     name,
//     gameType,
//     host, // Backend sends 'host' field, not 'hostId'
//     hostName, // Check for hostName first
//     hostAvatar,
//     currentPlayers,
//     maxPlayers,
//     isPrivate,
//     isInviteOnly,
//     startTime
//   } = gameRoom;

//   // Get host's display name similar to PlayerList.tsx logic
//   const getHostDisplayName = () => {
//     console.log('GameRoomCard getHostDisplayName - Full gameRoom data:', gameRoom);
//     console.log('GameRoomCard getHostDisplayName - Extracted fields:', { hostName, host, playerIdToUsername });
    
//     // Check if hostName is actually a user ID (MongoDB ObjectId format)
//     const isObjectId = (str: string) => /^[0-9a-fA-F]{24}$/.test(str);
    
//     // If hostName looks like an ObjectId, it's actually a user ID, not a username
//     if (hostName && typeof hostName === 'string' && isObjectId(hostName)) {
//       console.log('hostName is actually a user ID, not a username:', hostName);
//       // Don't return this as the display name, continue to other resolution methods
//     } else if (hostName && typeof hostName === 'string' && hostName.trim() !== '' && !isObjectId(hostName)) {
//       console.log('Using hostName from backend (actual username):', hostName);
//       return hostName;
//     }
    
//     // Check if host exists and is valid
//     if (!host) {
//       console.log('No host field found, returning Unknown Host');
//       return 'Unknown Host';
//     }
    
//     // For AI hosts
//     if (typeof host === 'string' && host.startsWith('ai-')) {
//       console.log('AI host detected:', `AI ${host.split('-')[1]}`);
//       return `AI ${host.split('-')[1]}`;
//     }
    
//     // Try to get username from the passed playerIdToUsername mapping first
//     if (playerIdToUsername && playerIdToUsername[host]) {
//       const username = playerIdToUsername[host];
//       console.log('Found username in playerIdToUsername mapping:', username);
      
//       // Check if this host is the current user
//       const currentUserId = localStorage.getItem('userId');
//       if (host === currentUserId) {
//         console.log('Current user is host, returning:', `${username} (You)`);
//         return `${username} (You)`;
//       } else {
//         console.log('Other user is host, returning:', username);
//         return username;
//       }
//     }
    
//     // Check if host is the current user (fallback for when playerIdToUsername doesn't have the mapping)
//     const currentUserId = localStorage.getItem('userId');
//     const currentUsername = localStorage.getItem('username');
    
//     if (host === currentUserId) {
//       console.log('Current user is host, returning:', currentUsername ? `${currentUsername} (You)` : 'You');
//       return currentUsername ? `${currentUsername} (You)` : 'You';
//     }
    
//     // Try to get username from localStorage cache with multiple patterns
//     let cachedUsername = null;
    
//     // Pattern 1: Direct username key
//     cachedUsername = localStorage.getItem(`username_${host}`);
//     if (cachedUsername) {
//       console.log('Found username in localStorage (pattern 1):', cachedUsername);
//       return cachedUsername;
//     }
    
//     // Pattern 2: Check if there's a players cache
//     try {
//       const playersCache = localStorage.getItem('playersCache');
//       if (playersCache) {
//         const parsed = JSON.parse(playersCache);
//         if (parsed[host]?.username) {
//           console.log('Found username in playersCache:', parsed[host].username);
//           return parsed[host].username;
//         }
//       }
//     } catch (error) {
//       console.log('Error parsing playersCache:', error);
//     }
    
//     // Pattern 3: Check if there's a usernames object
//     try {
//       const usernames = localStorage.getItem('usernames');
//       if (usernames) {
//         const parsed = JSON.parse(usernames);
//         if (parsed[host]) {
//           console.log('Found username in usernames object:', parsed[host]);
//           return parsed[host];
//         }
//       }
//     } catch (error) {
//       console.log('Error parsing usernames object:', error);
//     }
    
//     // Pattern 4: Check if there's a user cache
//     try {
//       const userCache = localStorage.getItem('userCache');
//       if (userCache) {
//         const parsed = JSON.parse(userCache);
//         if (parsed[host]?.username) {
//           console.log('Found username in userCache:', parsed[host].username);
//           return parsed[host].username;
//         }
//       }
//     } catch (error) {
//       console.log('Error parsing userCache:', error);
//     }
    
//     // If all else fails, return the host but try to make it more readable
//     console.log('No username found, returning formatted host:', host);
//     return host.length > 20 ? `${host.substring(0, 8)}...${host.substring(host.length - 8)}` : host;
//   };

//   const getGameIcon = () => {
//     // Safety check for gameType
//     if (!gameType || typeof gameType !== 'string') {
//       return '🎮';
//     }
    
//     switch (gameType.toLowerCase()) {
//       case 'kahoot':
//         return '🎯';
//       case 'chess':
//         return '♟️';
//       case 'uno':
//         return '🃏';
//       case 'trivia':
//         return '❓';
//       case 'pictionary':
//         return '🎨';
//       default:
//         return '🎮';
//     }
//   };

//   const getBadgeClass = () => {
//     if (isPrivate) return 'bg-red-500/20 text-red-400 border border-red-500/30';
//     if (isInviteOnly) return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
//     return 'bg-green-500/20 text-green-400 border border-green-500/30';
//   };

//   const getBadgeText = () => {
//     if (isPrivate) return 'Private';
//     if (isInviteOnly) return 'Invite Only';
//     return 'Public';
//   };

//   const getBadgeIcon = () => {
//     if (isPrivate || isInviteOnly) return <LockIcon size={14} className="mr-1" />;
//     return <UnlockIcon size={14} className="mr-1" />;
//   };

//   // Check if game is starting soon (within 10 minutes)
//   const isStartingSoon = startTime && 
//   new Date(startTime).getTime() - new Date().getTime() < 10 * 60 * 1000 && 
//   new Date(startTime).getTime() > new Date().getTime();
  
//   // Additional safety checks for required properties
//   if (!gameRoom || typeof gameRoom !== 'object') {
//     return <div className="p-4 text-red-400">Invalid game room data</div>;
//   }
  
//   const hostDisplayName = getHostDisplayName();
  
//   return <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/20 hover:border-purple-500/50">
//       {isStartingSoon && <div className="absolute top-2 right-2 bg-orange-500 text-xs py-1 px-2 rounded-full animate-pulse flex items-center">
//           <ClockIcon size={12} className="mr-1" /> Starting Soon
//         </div>}
//       <div className="p-4">
//         <div className="flex items-center mb-3">
//           <div className="w-10 h-10 rounded-lg bg-purple-700/30 flex items-center justify-center text-2xl">
//             {getGameIcon()}
//           </div>
//           <div className="ml-3">
//             <h3 className="font-bold text-white">{name}</h3>
//             <p className="text-sm text-gray-400">{gameType}</p>
//           </div>
//         </div>
//         <div className="flex items-center mb-4">
//           <img src={hostAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${host || 'default'}`} alt={hostDisplayName} className="w-6 h-6 rounded-full border border-gray-700" />
//           <p className="text-sm text-gray-300 ml-2">Hosted by {hostDisplayName}</p>
//         </div>
//         <div className="flex items-center justify-between mb-4">
//           <div className="flex items-center text-sm text-gray-400">
//             <UsersIcon size={16} className="mr-1" />
//             <span>
//               {currentPlayers}/{maxPlayers} players
//             </span>
//           </div>
//           <div className={`flex items-center text-xs px-2 py-1 rounded-full ${getBadgeClass()}`}>
//             {getBadgeIcon()}
//             <span>{getBadgeText()}</span>
//           </div>
//         </div>
//         <button onClick={() => onJoinRoom(gameRoom)} className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium transition-all hover:opacity-90 hover:shadow-lg hover:shadow-purple-500/20">
//           Join Room
//         </button>
//       </div>
//       <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
//     </div>;
// };