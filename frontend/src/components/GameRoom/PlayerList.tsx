// src/components/GameRoom/PlayerList.tsx
import React from 'react';
import { UsersIcon } from 'lucide-react';

interface Player {
  id: string;
  name?: string;
  isOnline?: boolean;
}

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
  currentTurn?: string;
}

export const PlayerList: React.FC<PlayerListProps> = ({ 
  players = [], 
  currentPlayerId, 
  currentTurn 
}) => {
  // Get current user's details from localStorage
  const currentUsername = localStorage.getItem('username');
  const currentUserId = localStorage.getItem('userId');

  const getPlayerDisplay = (player: Player) => {
    // For the current player
    if (player.id === currentPlayerId || player.id === currentUserId) {
      return {
        name: currentUsername ? `${currentUsername} (You)` : 'You',
        isYou: true,
        isAI: false
      };
    }
    
    // For AI players
    if (player.id.startsWith('ai-')) {
      return {
        name: `AI ${player.id.split('-')[1]}`,
        isYou: false,
        isAI: true
      };
    }
    
    // For other human players
    return {
      name: player.name || player.id,
      isYou: false,
      isAI: false
    };
  };

  return (
    <div className="w-full sm:w-64 border-r border-gray-700 bg-gray-800 overflow-y-auto fixed sm:relative inset-y-0 left-0 z-30">
      <div className="p-3 border-b border-gray-700 flex justify-between items-center">
        <h3 className="font-medium">Players ({players.length})</h3>
      </div>
      
      <div className="p-3 space-y-2">
        {players.map((player) => {
          const { name, isYou, isAI } = getPlayerDisplay(player);
          
          return (
            <div 
              key={player.id}
              className={`p-2 rounded-lg flex items-center ${
                isYou ? 'bg-purple-900/30' : 'bg-gray-700/30'
              } ${
                currentTurn === player.id ? 'border-l-4 border-purple-500' : ''
              }`}
            >
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.id)}`} 
                alt="Player avatar"
                className="w-8 h-8 rounded-full border border-gray-600 mr-2"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                {isAI && <p className="text-xs text-gray-400">AI Player</p>}
              </div>
              <div className="w-2 h-2 rounded-full ml-2" style={{
                backgroundColor: player.isOnline !== false ? '#10B981' : '#EF4444'
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};


// import React from 'react';

// interface PlayerListProps {
//   players: { id: string }[];
//   currentPlayerId: string;
//   currentTurn?: string;
// }

// // Helper function to get username from localStorage cache
// const getUsernameFromLocal = (playerId: string): string | null => {
//   try {
//     // You can implement this based on how you store usernames in localStorage
//     // Common patterns:
//     // 1. If storing as individual keys: localStorage.getItem(`username_${playerId}`)
//     // 2. If storing as a JSON object: JSON.parse(localStorage.getItem('usernames') || '{}')[playerId]
//     // 3. If storing in a players cache: JSON.parse(localStorage.getItem('playersCache') || '{}')[playerId]?.username
    
//     // For now, using pattern 1 - adjust based on your actual storage pattern
//     return localStorage.getItem(`username_${playerId}`);
//   } catch (error) {
//     console.error('Error getting username from localStorage:', error);
//     return null;
//   }
// };

// export const PlayerList: React.FC<PlayerListProps> = ({ 
//   players = [], 
//   currentPlayerId, 
//   currentTurn 
// }) => {
//   // Get current user's username
//   const currentUsername = localStorage.getItem('username');

//   const getDisplayName = (player: { id: string }) => {
//     // If it's the current player, show "You" or their username
//     if (player.id === currentPlayerId) {
//       return currentUsername || 'You';
//     }
    
//     // For AI players
//     if (player.id.startsWith('ai-')) {
//       return `AI Player ${player.id.split('-')[1]}`;
//     }
    
//     // For other players, try to get username from cache
//     const username = getUsernameFromLocal(player.id);
//     return username || player.id;
//   };

//   return (
//     <div>
//       <h3 className="text-lg font-bold mb-4">Players</h3>
//       <ul className="space-y-2">
//         {players.filter(Boolean).map((player) => (
//           <li 
//             key={player.id} 
//             className={`flex items-center p-2 rounded-lg ${
//               player.id === currentPlayerId ? 'bg-purple-900/50' : 'bg-gray-700/50'
//             } ${player.id === currentTurn ? 'border-l-4 border-yellow-500' : ''}`}
//           >
//             <div className="w-8 h-8 rounded-full bg-gray-600 mr-3"></div>
//             <div className="flex-1">
//               <p className="font-medium">
//                 {getDisplayName(player)}
//               </p>
//               {player.id.startsWith('ai-') && <p className="text-xs text-gray-400">AI</p>}
//             </div>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// };


// import React from 'react';

// // interface PlayerListProps {
// //   players: any[];
// //   currentPlayerId: string;
// //   currentTurn?: string;
// // }

// interface PlayerListProps {
//   players: { id: string }[];
//   currentPlayerId: string;
//   currentTurn?: string;
// }


// export const PlayerList: React.FC<PlayerListProps> = ({ 
//   players = [], 
//   currentPlayerId, 
//   currentTurn 
// }) => {
//   return (
//     <div>
//       <h3 className="text-lg font-bold mb-4">Players</h3>
//       <ul className="space-y-2">
//         {players.filter(Boolean).map((player) => (
//           <li 
//             key={player.id} 
//             className={`flex items-center p-2 rounded-lg ${
//               player.id === currentPlayerId ? 'bg-purple-900/50' : 'bg-gray-700/50'
//             } ${player.id === currentTurn ? 'border-l-4 border-yellow-500' : ''}`}
//           >
//             <div className="w-8 h-8 rounded-full bg-gray-600 mr-3"></div>
//             <div className="flex-1">
//               <p className="font-medium">
//                 {player.id === currentPlayerId ? 'You' : player.id.startsWith('ai-') ? `AI Player ${player.id.split('-')[1]}` : player.id}
//               </p>
//               {player.id.startsWith('ai-') && <p className="text-xs text-gray-400">AI</p>}
//             </div>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// };

