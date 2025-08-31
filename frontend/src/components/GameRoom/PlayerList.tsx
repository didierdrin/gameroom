// src/components/GameRoom/PlayerList.tsx
import React from 'react';
import { UsersIcon } from 'lucide-react';
import { Player as LudoPlayer } from '../Ludo/types/game';

interface Player extends LudoPlayer {
  isOnline?: boolean;
}

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
  currentTurn?: string;
  isHost?: boolean;
  onPlayerClick?: (player: Player) => void;
  mutedPlayers?: string[];
  playerIdToUsername: Record<string, string>;
}

export const PlayerList: React.FC<PlayerListProps> = ({ 
  players = [], 
  currentPlayerId, 
  currentTurn,
  isHost = false,
  onPlayerClick,
  mutedPlayers = [],
  playerIdToUsername
}) => {
  const getPlayerDisplay = (player: Player) => {
    // For the current player
    if (player.id === currentPlayerId) {
      const username = playerIdToUsername[player.id] || player.id;
      return {
        name: `${username} (You)`,
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
    
    // For other human players - use the same pattern as Chat
    return {
      name: playerIdToUsername[player.id] || player.id,
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
              className={`p-2 rounded-lg flex items-center cursor-pointer ${
                isYou ? 'bg-purple-900/30' : 'bg-gray-700/30'
              } ${
                currentTurn === player.id ? 'border-l-4 border-purple-500' : ''
              } ${
                // Allow clicks for host on any non-AI player (including themselves)
                isHost && !isAI ? 'hover:bg-gray-600/50' : ''
              }`}
              onClick={() => isHost && !isAI && onPlayerClick?.(player)}
            >
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.id)}`} 
                alt="Player avatar"
                className="w-8 h-8 rounded-full border border-gray-600 mr-2"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                {isAI && <p className="text-xs text-gray-400">AI Player</p>}
                {mutedPlayers.includes(player.id) && <p className="text-xs text-red-400">Muted</p>}
              </div>
              <div className="w-2 h-2 rounded-full ml-2" style={{
                backgroundColor: (player as any).isOnline !== false ? '#10B981' : '#EF4444'
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// // src/components/GameRoom/PlayerList.tsx
// import React from 'react';
// import { UsersIcon } from 'lucide-react';
// import { Player as LudoPlayer } from '../Ludo/types/game';

// interface Player extends LudoPlayer {
//   isOnline?: boolean;
// }

// interface PlayerListProps {
//   players: Player[];
//   currentPlayerId: string;
//   currentTurn?: string;
//   isHost?: boolean;
//   onPlayerClick?: (player: Player) => void;
//   mutedPlayers?: string[];
// }

// export const PlayerList: React.FC<PlayerListProps> = ({ 
//   players = [], 
//   currentPlayerId, 
//   currentTurn,
//   isHost = false,
//   onPlayerClick,
//   mutedPlayers = []
// }) => {
//   // Get current user's details from localStorage
//   const currentUsername = localStorage.getItem('username');
//   const currentUserId = localStorage.getItem('userId');

//   const getPlayerDisplay = (player: Player) => {
//     // For the current player
//     if (player.id === currentPlayerId || player.id === currentUserId) {
//       return {
//         name: currentUsername ? `${currentUsername} (You)` : 'You',
//         isYou: true,
//         isAI: false
//       };
//     }
    
//     // For AI players
//     if (player.id.startsWith('ai-')) {
//       return {
//         name: `AI ${player.id.split('-')[1]}`,
//         isYou: false,
//         isAI: true
//       };
//     }
    
//     // For other human players
//     return {
//       name: player.name || player.id,
//       isYou: false,
//       isAI: false
//     };
//   };

//   return (
//     <div className="w-full sm:w-64 border-r border-gray-700 bg-gray-800 overflow-y-auto fixed sm:relative inset-y-0 left-0 z-30">
//       <div className="p-3 border-b border-gray-700 flex justify-between items-center">
//         <h3 className="font-medium">Players ({players.length})</h3>
//       </div>
      
//       <div className="p-3 space-y-2">
//         {players.map((player) => {
//           const { name, isYou, isAI } = getPlayerDisplay(player);
          
//           return (
//             <div 
//               key={player.id}
//               className={`p-2 rounded-lg flex items-center cursor-pointer ${
//                 isYou ? 'bg-purple-900/30' : 'bg-gray-700/30'
//               } ${
//                 currentTurn === player.id ? 'border-l-4 border-purple-500' : ''
//               } ${
//                 // Allow clicks for host on any non-AI player (including themselves)
//                 isHost && !isAI ? 'hover:bg-gray-600/50' : ''
//               }`}
//               onClick={() => isHost && !isAI && onPlayerClick?.(player)}
//             >
//               <img 
//                 src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.id)}`} 
//                 alt="Player avatar"
//                 className="w-8 h-8 rounded-full border border-gray-600 mr-2"
//               />
//               <div className="flex-1 min-w-0">
//                 <p className="text-sm font-medium truncate">{name}</p>
//                 {isAI && <p className="text-xs text-gray-400">AI Player</p>}
//                 {mutedPlayers.includes(player.id) && <p className="text-xs text-red-400">Muted</p>}
//               </div>
//               <div className="w-2 h-2 rounded-full ml-2" style={{
//                 backgroundColor: (player as any).isOnline !== false ? '#10B981' : '#EF4444'
//               }} />
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

