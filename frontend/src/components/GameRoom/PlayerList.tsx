// src/components/GameRoom/PlayerList.tsx
import React from 'react';
import { UsersIcon, EyeIcon } from 'lucide-react';
import { Player as LudoPlayer } from '../Ludo/types/game';
import { useUserData } from '../../hooks/useUserData';

interface Player extends LudoPlayer {
  isOnline?: boolean;
}

interface PlayerItemProps {
  player: Player;
  currentPlayerId: string;
  currentTurn?: string;
  isHost?: boolean;
  onPlayerClick?: (player: Player) => void;
  mutedPlayers?: string[];
  isSpectator?: boolean;
}

// Separate component for each player to use the useUserData hook
const PlayerItem: React.FC<PlayerItemProps> = ({
  player,
  currentPlayerId,
  currentTurn,
  isHost = false,
  onPlayerClick,
  mutedPlayers = [],
  isSpectator = false
}) => {
  const { username, avatar, isLoading } = useUserData(player.id);

  const getPlayerDisplay = () => {
    // For the current player
    if (player.id === currentPlayerId) {
      const displayName = isLoading ? 'Loading...' : (username || player.id);
      return {
        name: `${displayName} (You)`,
        isYou: true
      };
    }
    
    // For other human players (remove AI logic completely)
    const displayName = isLoading ? 'Loading...' : (username || player.id);
    return {
      name: displayName,
      isYou: false
    };
  };

  const { name, isYou } = getPlayerDisplay();

  return (
    <div 
      key={player.id}
      className={`flex items-center space-x-3 p-3 rounded-lg ${
        isSpectator ? 'bg-gray-800/30' : 'bg-gray-700/50'
      } ${
        isYou ? 'ring-2 ring-purple-500' : ''
      } ${
        currentTurn === player.id && !isSpectator ? 'border-l-4 border-purple-500' : ''
      } ${
        isHost ? 'hover:bg-gray-600/50 cursor-pointer' : ''
      }`}
      onClick={() => isHost && onPlayerClick?.(player)}
    >
      <img 
        src={avatar} 
        alt={name}
        className="w-8 h-8 rounded-full"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.id)}`;
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium truncate">{name}</p>
          {isSpectator && (
            <EyeIcon size={14} className="text-gray-400 flex-shrink-0" />
          )}
        </div>
        {mutedPlayers.includes(player.id) && <p className="text-xs text-red-400">Muted</p>}
      </div>
      <div className="w-2 h-2 rounded-full ml-2" style={{
        backgroundColor: (player as any).isOnline !== false ? '#10B981' : '#EF4444'
      }} />
    </div>
  );
};

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
  currentTurn?: string;
  isHost?: boolean;
  onPlayerClick?: (player: Player) => void;
  mutedPlayers?: string[];
  playerIdToUsername: Record<string, string>;
  spectatorIds?: string[]; // Add spectatorIds prop
}

export const PlayerList: React.FC<PlayerListProps> = ({ 
  players = [], 
  currentPlayerId, 
  currentTurn,
  isHost = false,
  onPlayerClick,
  mutedPlayers = [],
  playerIdToUsername,
  spectatorIds = [] // Default to empty array
}) => {
  // Separate players and spectators based on spectatorIds
  const gamePlayers = players.filter(player => !spectatorIds.includes(player.id));
  const spectators = players.filter(player => spectatorIds.includes(player.id));

  // Add temporary debug logging
  React.useEffect(() => {
    console.log("PlayerList received:", { 
      totalPlayers: players.length,
      gamePlayers: gamePlayers.length,
      spectators: spectators.length,
      spectatorIds,
      players: players.map(p => ({ id: p.id, name: p.name })),
      playerIdToUsername
    });
  }, [players, gamePlayers, spectators, spectatorIds, playerIdToUsername]);

  return (
    <div className="w-full sm:w-64 border-r border-gray-700 bg-gray-800 overflow-y-auto fixed sm:relative inset-y-0 left-0 z-30">
      <div className="p-3 border-b border-gray-700 flex justify-between items-center">
        <h3 className="font-medium">Players ({gamePlayers.length})</h3>
      </div>
      
      <div className="p-3 space-y-2">
        {/* Game Players */}
        {gamePlayers.map((player) => (
          <PlayerItem
            key={player.id}
            player={player}
            currentPlayerId={currentPlayerId}
            currentTurn={currentTurn}
            isHost={isHost}
            onPlayerClick={onPlayerClick}
            mutedPlayers={mutedPlayers}
            isSpectator={false}
          />
        ))}

        {/* Spectators Section */}
        {spectators.length > 0 && (
          <>
            <div className="flex items-center space-x-2 my-4">
              <div className="flex-1 border-t border-gray-600"></div>
              <span className="text-xs text-gray-400 font-medium px-2">SPECTATORS</span>
              <div className="flex-1 border-t border-gray-600"></div>
            </div>
            
            {spectators.map((spectator) => (
              <PlayerItem
                key={spectator.id}
                player={spectator}
                currentPlayerId={currentPlayerId}
                currentTurn={currentTurn}
                isHost={isHost}
                onPlayerClick={onPlayerClick}
                mutedPlayers={mutedPlayers}
                isSpectator={true}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};


// // src/components/GameRoom/PlayerList.tsx
// import React from 'react';
// import { UsersIcon } from 'lucide-react';
// import { Player as LudoPlayer } from '../Ludo/types/game';
// import { useUserData } from '../../hooks/useUserData';

// interface Player extends LudoPlayer {
//   isOnline?: boolean;
// }

// interface PlayerItemProps {
//   player: Player;
//   currentPlayerId: string;
//   currentTurn?: string;
//   isHost?: boolean;
//   onPlayerClick?: (player: Player) => void;
//   mutedPlayers?: string[];
// }

// // Separate component for each player to use the useUserData hook
// const PlayerItem: React.FC<PlayerItemProps> = ({
//   player,
//   currentPlayerId,
//   currentTurn,
//   isHost = false,
//   onPlayerClick,
//   mutedPlayers = []
// }) => {
//   const { username, avatar, isLoading } = useUserData(player.id);

//   const getPlayerDisplay = () => {
//     // For the current player
//     if (player.id === currentPlayerId) {
//       const displayName = isLoading ? 'Loading...' : (username || player.id);
//       return {
//         name: `${displayName} (You)`,
//         isYou: true
//       };
//     }
    
//     // For other human players (remove AI logic completely)
//     const displayName = isLoading ? 'Loading...' : (username || player.id);
//     return {
//       name: displayName,
//       isYou: false
//     };
//   };

//   const { name, isYou } = getPlayerDisplay(); // Remove isAI from destructuring

//   return (
//     <div 
//       key={player.id}
//       className={`flex items-center space-x-3 p-3 rounded-lg bg-gray-700/50 ${
//         isYou ? 'ring-2 ring-purple-500' : ''
//       } ${
//         currentTurn === player.id ? 'border-l-4 border-purple-500' : ''
//       } ${
//         // Remove AI check from hover logic
//         isHost ? 'hover:bg-gray-600/50' : ''
//       }`}
//       onClick={() => isHost && onPlayerClick?.(player)} // Remove AI check
//     >
//       <img 
//         src={avatar} 
//         alt={name}
//         className="w-8 h-8 rounded-full"
//         onError={(e) => {
//           const target = e.target as HTMLImageElement;
//           target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.id)}`;
//         }}
//       />
//       <div className="flex-1 min-w-0">
//         <p className="text-sm font-medium truncate">{name}</p>
//         {/* Remove AI Player indicator */}
//         {mutedPlayers.includes(player.id) && <p className="text-xs text-red-400">Muted</p>}
//       </div>
//       <div className="w-2 h-2 rounded-full ml-2" style={{
//         backgroundColor: (player as any).isOnline !== false ? '#10B981' : '#EF4444'
//       }} />
//     </div>
//   );
// };

// interface PlayerListProps {
//   players: Player[];
//   currentPlayerId: string;
//   currentTurn?: string;
//   isHost?: boolean;
//   onPlayerClick?: (player: Player) => void;
//   mutedPlayers?: string[];
//   playerIdToUsername: Record<string, string>;
// }

// export const PlayerList: React.FC<PlayerListProps> = ({ 
//   players = [], 
//   currentPlayerId, 
//   currentTurn,
//   isHost = false,
//   onPlayerClick,
//   mutedPlayers = [],
//   playerIdToUsername
// }) => {
//   // Add temporary debug logging
//   React.useEffect(() => {
//     console.log("PlayerList received players:", players.map(p => ({ id: p.id, name: p.name })));
//     console.log("PlayerIdToUsername mapping:", playerIdToUsername);
//   }, [players, playerIdToUsername]);

//   return (
//     <div className="w-full sm:w-64 border-r border-gray-700 bg-gray-800 overflow-y-auto fixed sm:relative inset-y-0 left-0 z-30">
//       <div className="p-3 border-b border-gray-700 flex justify-between items-center">
//         <h3 className="font-medium">Players ({players.length})</h3>
//       </div>
      
//       <div className="p-3 space-y-2">
//         {players.map((player) => (
//           <PlayerItem
//             key={player.id}
//             player={player}
//             currentPlayerId={currentPlayerId}
//             currentTurn={currentTurn}
//             isHost={isHost}
//             onPlayerClick={onPlayerClick}
//             mutedPlayers={mutedPlayers}
//           />
//         ))}
//       </div>
//     </div>
//   );
// };
