import React, { useState } from 'react';
import { X, Users, Eye, Lock, Loader2, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GameRoom } from '../../types/gameroom';
import { useTheme } from '../../context/ThemeContext'; 

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
  const { theme } = useTheme();
  const isLight = theme === 'light';
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

  const cardClass = isLight
    ? 'bg-white border-[#b4b4b4]'
    : 'bg-gray-800 border-gray-700';
  const borderClass = isLight ? 'border-[#b4b4b4]' : 'border-gray-700';
  const titleClass = isLight ? 'text-gray-900' : 'text-white';
  const subtitleClass = isLight ? 'text-gray-600' : 'text-gray-400';
  const closeBtnClass = isLight
    ? 'text-gray-500 hover:text-gray-900'
    : 'text-gray-400 hover:text-white';
  const hostLinkClass = isLight ? 'text-[#8b5cf6] hover:underline' : 'text-purple-400 hover:underline';
  const metaMutedClass = isLight ? 'text-gray-600' : 'text-gray-400';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`relative rounded-xl border w-full max-w-md mx-auto shadow-2xl ${cardClass}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${borderClass}`}>
          <div>
            <h2 className={`text-xl font-semibold ${titleClass}`}>
              {isAnyLoading ? 'Joining Room...' : 'Join Game Room'}
            </h2>
            <p className={`${subtitleClass} text-sm mt-1`}>{gameRoom.name}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isAnyLoading}
            className={`${closeBtnClass} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Loading Overlay */}
        {isAnyLoading && (
          <div
            className={`absolute inset-0 backdrop-blur-sm rounded-xl flex items-center justify-center z-10 ${
              isLight ? 'bg-white/85' : 'bg-black/70'
            }`}
          >
            <div className="text-center">
              <Loader2
                size={32}
                className={`animate-spin mx-auto mb-2 ${isLight ? 'text-[#8b5cf6]' : 'text-purple-500'}`}
              />
              <p className={titleClass}>Joining room...</p>
            </div>
          </div>
        )}

        {/* Room Info */}
        <div className={`p-6 border-b ${borderClass}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{gameRoom.gameType === 'chess' ? '♟️' : gameRoom.gameType === 'ludo' ? '🎲' : '❓'}</span>
              <div>
                <p className={`${titleClass} font-medium`}>{gameRoom.gameType.charAt(0).toUpperCase() + gameRoom.gameType.slice(1)}</p>
                <p className={`${subtitleClass} text-sm`}>Hosted by&nbsp;
                <Link 
                  to={`/profile/${gameRoom.hostName}`} 
                  className={hostLinkClass}
                >
                  {gameRoom.hostName}
                </Link>
                </p>
              </div>
            </div>
            <div className={`flex items-center space-x-4 text-sm ${metaMutedClass}`}>
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
              {gameRoom.entryFee && gameRoom.entryFee > 0 && (
                <div className="flex items-center text-green-400 font-semibold bg-green-500/10 px-2 py-1 rounded">
                  <DollarSign size={16} className="mr-1" />
                  Entry Fee: ${gameRoom.entryFee.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* Password Input for Private Rooms */}
          {gameRoom.isPrivate && (
            <div className="mb-4">
              <label
                className={`block mb-2 text-sm font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}
              >
                Enter 6-Character Room Code
              </label>
              <input
                type="text"
                placeholder="Enter room code"
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 text-center font-mono text-lg tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed ${
                  isLight
                    ? 'bg-gray-50 border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-[#8b5cf6]'
                    : 'bg-gray-700 border border-gray-600 text-white focus:ring-purple-500'
                }`}
                value={password}
                onChange={(e) => setPassword(e.target.value.slice(0, 6).toUpperCase())}
                maxLength={6}
                autoFocus
                disabled={isAnyLoading}
              />
              <p className={`text-xs mt-1 ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
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
              className={`w-full flex items-center justify-center p-4 disabled:cursor-not-allowed text-white rounded-lg transition-colors relative ${
                isLight
                  ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:bg-gray-300'
                  : 'bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600'
              }`}
            >
              {isAnyLoading && (
                <Loader2 size={16} className="animate-spin absolute left-4" />
              )}
              <Users size={20} className="mr-2" />
              <div className="text-left">
                <div className="font-medium flex flex-wrap items-center gap-x-3">
                  <span>Join as Player</span>
                  {gameRoom.entryFee && gameRoom.entryFee > 0 && (
                     <span
                       className={`opacity-90 text-sm px-2 py-0.5 rounded text-white shrink-0 ${
                         isLight ? 'bg-black/15' : 'bg-black/20'
                       }`}
                     >
                        $ {gameRoom.entryFee.toFixed(2)}
                     </span>
                  )}
                </div>
                <div className={`text-sm ${isLight ? 'text-white/90' : 'text-purple-200'}`}>
                  Participate in the game
                </div>
              </div>
            </button>

            <button
              onClick={() => handleJoin(false)}
              disabled={isAnyLoading || (gameRoom.isPrivate && (!password || password.length !== 6))}
              className={`w-full flex items-center justify-center p-4 rounded-lg transition-colors relative border ${
                isLight
                  ? 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200'
                  : 'bg-gray-600 hover:bg-gray-700 border-transparent text-white disabled:bg-gray-600'
              }`}
            >
              {isAnyLoading && (
                <Loader2 size={16} className="animate-spin absolute left-4" />
              )}
              <Eye size={20} className="mr-2" />
              <div className="text-left">
                <div className="font-medium flex flex-wrap items-center gap-x-3">
                  <span>Join as Spectator</span>
                  {gameRoom.entryFee && gameRoom.entryFee > 0 && (
                     <span
                       className={`opacity-90 text-sm px-2 py-0.5 rounded shrink-0 ${
                         isLight
                           ? 'bg-gray-200 text-gray-800'
                           : 'bg-black/20 text-white'
                       }`}
                     >
                        $ {gameRoom.entryFee.toFixed(2)}
                     </span>
                  )}
                </div>
                <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                  Watch and chat only
                </div>
              </div>
            </button>
          </div>

          <div className={`mt-4 pt-4 border-t ${borderClass}`}>
            <p className={`text-xs text-center ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
              As a spectator, you can enjoy voice chat and text chat but cannot interact with the game
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

