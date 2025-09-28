import React, { useState, useEffect, useRef } from 'react';
import { SendIcon, SmileIcon } from 'lucide-react';
import { useUserData } from '../../hooks/useUserData';

const MessageAvatar = ({ playerId }: { playerId: string }) => {
  if (playerId.startsWith('ai-')) {
    return (
      <img
        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(playerId)}`}
        alt=""
        className="w-6 h-6 rounded-full border border-gray-600"
      />
    );
  }

  const { avatar } = useUserData(playerId);

  return (
    <img
      src={avatar}
      alt=""
      className="w-6 h-6 rounded-full border border-gray-600"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(playerId)}`;
      }}
    />
  );
};

interface ChatProps {
  messages: Array<{
    playerId: string;
    message: string;
    timestamp?: string;
  }>;
  onSendMessage: (message: string) => void;
  currentPlayerId: string;
  playerIdToUsername: Record<string, string>;
}

export const Chat: React.FC<ChatProps> = ({ 
  messages, 
  onSendMessage, 
  currentPlayerId,
  playerIdToUsername 
}) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col bg-gray-800 border-l border-gray-700">
      <div className="p-3 border-b border-gray-700 flex justify-between items-center">
        <h3 className="font-medium">Chat</h3>
        <div className="text-xs text-gray-400">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex ${msg.playerId === currentPlayerId ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-xs p-2 rounded-lg ${
                msg.playerId === currentPlayerId 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MessageAvatar playerId={msg.playerId} />
                <span className="text-xs font-bold">
                  {playerIdToUsername[msg.playerId] || 
                   (msg.playerId.startsWith('ai-') ? `AI ${msg.playerId.split('-')[1]}` : msg.playerId)}
                </span>
                {msg.timestamp && (
                  <span className="text-xs text-gray-400">
                    {formatTime(msg.timestamp)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm">{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-700">
        <div className="flex items-center bg-gray-700 rounded-lg px-3">
          <button type="button" className="text-gray-400 hover:text-gray-300">
            <SmileIcon size={20} />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-white px-3 py-2"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className={`p-1 rounded-full ${
              message.trim() ? 'text-purple-400 hover:text-purple-300' : 'text-gray-500'
            }`}
          >
            <SendIcon size={20} />
          </button>
        </div>
      </form>
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
