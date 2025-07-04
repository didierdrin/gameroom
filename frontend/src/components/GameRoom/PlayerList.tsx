import React from 'react';

// interface PlayerListProps {
//   players: any[];
//   currentPlayerId: string;
//   currentTurn?: string;
// }

interface PlayerListProps {
  players: { id: string }[];
  currentPlayerId: string;
  currentTurn?: string;
}


export const PlayerList: React.FC<PlayerListProps> = ({ 
  players = [], 
  currentPlayerId, 
  currentTurn 
}) => {
  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Players</h3>
      <ul className="space-y-2">
        {players.filter(Boolean).map((player) => (
          <li 
            key={player.id} 
            className={`flex items-center p-2 rounded-lg ${
              player.id === currentPlayerId ? 'bg-purple-900/50' : 'bg-gray-700/50'
            } ${player.id === currentTurn ? 'border-l-4 border-yellow-500' : ''}`}
          >
            <div className="w-8 h-8 rounded-full bg-gray-600 mr-3"></div>
            <div className="flex-1">
              <p className="font-medium">
                {player.id === currentPlayerId ? 'You' : player.id.startsWith('ai-') ? `AI Player ${player.id.split('-')[1]}` : player.id}
              </p>
              {player.id.startsWith('ai-') && <p className="text-xs text-gray-400">AI</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};


// export const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayerId, currentTurn }) => {
//   return (
//     <div>
//       <h3 className="text-lg font-bold mb-4">Players</h3>
//       <ul className="space-y-2">
//         {players.map((player) => (
//           <li 
//           key={player.id} 
//           className={`flex items-center p-2 rounded-lg ${
//             player.id === currentPlayerId ? 'bg-purple-900/50' : 'bg-gray-700/50'
//           } ${player.id === currentTurn ? 'border-l-4 border-yellow-500' : ''}`}
//         >
//           <div className="w-8 h-8 rounded-full bg-gray-600 mr-3"></div>
//           <div className="flex-1">
//             <p className="font-medium">
//               {player.id === currentPlayerId ? 'You' : player.id.startsWith('ai-') ? `AI Player ${player.id.split('-')[1]}` : player.id}
//             </p>
//             {player.id.startsWith('ai-') && <p className="text-xs text-gray-400">AI</p>}
//           </div>
//         </li>
        
//         ))}
//       </ul>
//     </div>
//   );
// };








// import React from 'react';

// interface PlayerListProps {
//   players: any[];
//   currentPlayerId: string;
//   currentTurn?: string;
// }

// export const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayerId, currentTurn }) => {
//   return (
//     <div>
//       <h3 className="text-lg font-bold mb-4">Players</h3>
//       <ul className="space-y-2">
//         {players.map((player) => (
//           <li 
//             key={player} 
//             className={`flex items-center p-2 rounded-lg ${
//               player === currentPlayerId ? 'bg-purple-900/50' : 'bg-gray-700/50'
//             } ${player === currentTurn ? 'border-l-4 border-yellow-500' : ''}`}
//           >
//             <div className="w-8 h-8 rounded-full bg-gray-600 mr-3"></div>
//             <div className="flex-1">
//               <p className="font-medium">
//                 {player === currentPlayerId ? 'You' : player.startsWith('ai-') ? `AI Player ${player.split('-')[1]}` : player}
//               </p>
//               {player.startsWith('ai-') && <p className="text-xs text-gray-400">AI</p>}
//             </div>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// };