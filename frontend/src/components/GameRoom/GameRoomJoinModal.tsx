import React, { useState } from 'react';
import { X, Users, Eye, Lock, Loader2 } from 'lucide-react';
import  { Link } from 'react-router-dom'; 
import { GameRoom } from '../../types/gameroom'; 

interface GameRoomJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameRoom: GameRoom | null;
  onJoin: (gameRoom: GameRoom, joinAsPlayer: boolean, password?: string) => void;
  isLoading: boolean; 
}

export const GameRoomJoinModal: React.FC<GameRoomJoinModalProps> = ({
  isOpen,
  onClose,
  gameRoom,
  onJoin,
  isLoading
}) => {
  const [password, setPassword] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  if (!isOpen || !gameRoom) return null;

 

  const actualCurrentPlayers = gameRoom.playerIds?.length;
  const safeCurrentPlayers = actualCurrentPlayers; 
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
    if (isJoining || isLoading) return; // Prevent closing during join/loading
    setPassword('');
    onClose();
  };

  // Combined loading state (either modal is loading or join is in progress)
  const isAnyLoading = isLoading || isJoining;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {isAnyLoading ? 'Joining Room...' : 'Join Game Room'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">{gameRoom.name}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isAnyLoading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={24} />
          </button>
        </div>

        {/* Loading Overlay */}
        {isAnyLoading && (
          <div className="absolute inset-0 bg-gray-800/80 rounded-xl flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 size={32} className="animate-spin text-purple-500 mx-auto mb-2" />
              <p className="text-white">Joining room...</p>
            </div>
          </div>
        )}

        {/* Room Info */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{gameRoom.gameType === 'chess' ? '♟️' : gameRoom.gameType === 'ludo' ? '🎲' : '❓'}</span>
              <div>
                <p className="text-white font-medium">{gameRoom.gameType.charAt(0).toUpperCase() + gameRoom.gameType.slice(1)}</p>
                <p className="text-gray-400 text-sm">Hosted by&nbsp;
                <Link 
                  to={`/profile/${gameRoom.hostName}`} 
                  className="text-purple-400 hover:underline"
                >
                  {gameRoom.hostName}
                </Link>
                </p>
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
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center font-mono text-lg tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                value={password}
                onChange={(e) => setPassword(e.target.value.slice(0, 6).toUpperCase())}
                maxLength={6}
                autoFocus
                disabled={isAnyLoading}
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
              disabled={isAnyLoading || (gameRoom.isPrivate && (!password || password.length !== 6))}
              className="w-full flex items-center justify-center p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors relative"
            >
              {isAnyLoading && (
                <Loader2 size={16} className="animate-spin absolute left-4" />
              )}
              <Users size={20} className="mr-2" />
              <div className="text-left">
                <div className="font-medium">Join as Player</div>
                <div className="text-sm text-purple-200">Participate in the game</div>
              </div>
            </button>

            <button
              onClick={() => handleJoin(false)}
              disabled={isAnyLoading || (gameRoom.isPrivate && (!password || password.length !== 6))}
              className="w-full flex items-center justify-center p-4 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors relative"
            >
              {isAnyLoading && (
                <Loader2 size={16} className="animate-spin absolute left-4" />
              )}
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

