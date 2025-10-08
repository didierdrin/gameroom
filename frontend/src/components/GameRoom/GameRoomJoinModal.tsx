import React, { useState } from 'react';
import { X, Users, Eye, Lock } from 'lucide-react';

interface GameRoom {
  id: string;
  roomId: string;
  name: string;
  gameType: string;
  host: string;
  hostName: string;
  hostAvatar: string;
  currentPlayers: number;
  maxPlayers: number;
  isPrivate: boolean;
  isInviteOnly: boolean;
  startTime?: string;
  scheduledTimeCombined?: string;
}

interface GameRoomJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameRoom: GameRoom | null;
  onJoin: (gameRoom: GameRoom, joinAsPlayer: boolean, password?: string) => void;
}

export const GameRoomJoinModal: React.FC<GameRoomJoinModalProps> = ({
  isOpen,
  onClose,
  gameRoom,
  onJoin
}) => {
  const [password, setPassword] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  if (!isOpen || !gameRoom) return null;

  const safeCurrentPlayers = typeof gameRoom.currentPlayers === 'number' ? gameRoom.currentPlayers : parseInt(gameRoom.currentPlayers) || 0;
  const safeMaxPlayers = typeof gameRoom.maxPlayers === 'number' ? gameRoom.maxPlayers : parseInt(gameRoom.maxPlayers) || 0;



  const handleJoin = async (joinAsPlayer: boolean) => {
    if (gameRoom.isPrivate && !password.trim()) {
      alert('Please enter the 6-character room code');
      return;
    }

    if (gameRoom.isPrivate && password.length !== 6) {
      alert('Room code must be exactly 6 characters');
      return;
    }

    setIsJoining(true);
    try {
      await onJoin(gameRoom, joinAsPlayer, gameRoom.isPrivate ? password : undefined);
    } finally {
      setIsJoining(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Join Game Room</h2>
            <p className="text-gray-400 text-sm mt-1">{gameRoom.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Room Info */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{gameRoom.gameType === 'chess' ? '♟️' : gameRoom.gameType === 'ludo' ? '🎲' : '❓'}</span>
              <div>
                <p className="text-white font-medium">{gameRoom.gameType.charAt(0).toUpperCase() + gameRoom.gameType.slice(1)}</p>
                <p className="text-gray-400 text-sm">Hosted by {gameRoom.hostName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center">
                <Users size={16} className="mr-1" />
                {safeCurrentPlayers}/{safeMaxPlayers}
              </div>
              {gameRoom.isPrivate && (
                <div className="flex items-center text-yellow-400">
                  <Lock size={16} className="mr-1" />
                  Private
                </div>
              )}
            </div>
          </div>

          {/* Password Input for Private Rooms */}
          {gameRoom.isPrivate && (
            <div className="mb-4">
              <label className="block text-gray-300 mb-2 text-sm font-medium">
                Enter 6-Character Room Code
              </label>
              <input
                type="text"
                placeholder="Enter room code"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center font-mono text-lg tracking-widest uppercase"
                value={password}
                onChange={(e) => setPassword(e.target.value.slice(0, 6).toUpperCase())}
                maxLength={6}
                autoFocus
              />
              <p className="text-gray-500 text-xs mt-1">
                Ask the host for the 6-character room code
              </p>
            </div>
          )}
        </div>

        {/* Join Options */}
        <div className="p-6">
          <div className="space-y-3">
            <button
              onClick={() => handleJoin(true)}
              disabled={isJoining || (gameRoom.isPrivate && (!password || password.length !== 6))}
              className="w-full flex items-center justify-center p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Users size={20} className="mr-2" />
              <div className="text-left">
                <div className="font-medium">Join as Player</div>
                <div className="text-sm text-purple-200">Participate in the game</div>
              </div>
            </button>

            <button
              onClick={() => handleJoin(false)}
              disabled={isJoining || (gameRoom.isPrivate && (!password || password.length !== 6))}
              className="w-full flex items-center justify-center p-4 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Eye size={20} className="mr-2" />
              <div className="text-left">
                <div className="font-medium">Join as Spectator</div>
                <div className="text-sm text-gray-300">Watch and chat only</div>
              </div>
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-xs text-center">
              As a spectator, you can enjoy voice chat and text chat but cannot interact with the game
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
