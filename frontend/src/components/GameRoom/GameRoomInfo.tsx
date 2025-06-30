import React from 'react';
import { ClockIcon, UsersIcon, TrophyIcon, LockIcon, UnlockIcon } from 'lucide-react';

interface GameRoomInfoProps {
  roomId: string;
  gameState?: {
    status?: string;
    gameStarted?: boolean;
    gameOver?: boolean;
    winner?: string;
    currentTurn?: string;
    diceValue?: number;
    players?: string[];
  };
}

export const GameRoomInfo: React.FC<GameRoomInfoProps> = ({ roomId, gameState }) => {
  const getStatusText = () => {
    if (gameState?.gameOver) return 'Game Over';
    if (gameState?.gameStarted) return 'Game In Progress';
    return 'Waiting for players';
  };

  const getStatusColor = () => {
    if (gameState?.gameOver) return 'bg-red-500/20 text-red-400';
    if (gameState?.gameStarted) return 'bg-green-500/20 text-green-400';
    return 'bg-yellow-500/20 text-yellow-400';
  };

  const getWinnerText = () => {
    if (!gameState?.winner) return 'No winner yet';
    return gameState.winner.startsWith('ai-') 
      ? `AI Player ${gameState.winner.split('-')[1]} won!` 
      : `${gameState.winner} won!`;
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="bg-gray-700/50 p-3 rounded-lg">
          <h2 className="text-xl font-bold">Room: {roomId}</h2>
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getStatusColor()}`}>
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Game Info */}
        <div className="flex items-center gap-2 bg-gray-700/50 px-3 py-2 rounded-lg">
          <UsersIcon size={16} />
          <span className="text-sm">
            Players: {gameState?.players?.length || 0}/4
          </span>
        </div>

        {/* Turn Info */}
        {gameState?.gameStarted && !gameState?.gameOver && (
          <div className="flex items-center gap-2 bg-purple-700/50 px-3 py-2 rounded-lg">
            <ClockIcon size={16} />
            <span className="text-sm">
              Turn: {gameState.currentTurn?.startsWith('ai-') 
                ? `AI ${gameState.currentTurn.split('-')[1]}` 
                : gameState.currentTurn === 'current-user-id' 
                  ? 'Your turn' 
                  : `${gameState.currentTurn}'s turn`}
            </span>
          </div>
        )}

        {/* Dice Value */}
        {gameState?.diceValue !== undefined && gameState.diceValue > 0 && (
          <div className="flex items-center gap-2 bg-blue-700/50 px-3 py-2 rounded-lg">
            <span className="text-sm">Dice: {gameState.diceValue}</span>
          </div>
        )}

        {/* Winner Info */}
        {gameState?.gameOver && (
          <div className="flex items-center gap-2 bg-yellow-700/50 px-3 py-2 rounded-lg">
            <TrophyIcon size={16} />
            <span className="text-sm">{getWinnerText()}</span>
          </div>
        )}

        {/* Privacy Status */}
        <div className="flex items-center gap-2 bg-gray-700/50 px-3 py-2 rounded-lg">
          {false ? ( // Replace with actual privacy status from props if available
            <>
              <LockIcon size={16} />
              <span className="text-sm">Private</span>
            </>
          ) : (
            <>
              <UnlockIcon size={16} />
              <span className="text-sm">Public</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};