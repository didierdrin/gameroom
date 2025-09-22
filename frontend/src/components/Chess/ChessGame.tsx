import React, { useEffect, useState } from 'react';
import Chessboard from 'chessboardjsx';
import { Chess } from 'chess.js';
import { Fireworks } from '../UI/Fireworks';

interface GameRenderProps {
  socket: any;
  roomId: string;
  currentPlayer: string;
  gameState: any;
  onChessMove: (move: string) => void;
}

export const ChessGame: React.FC<GameRenderProps> = ({ 
  socket, 
  roomId, 
  currentPlayer, 
  gameState, 
  onChessMove 
}) => {
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState('start');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [localGameState, setLocalGameState] = useState(gameState);
  const [showFireworks, setShowFireworks] = useState(false);

  // Sync local state with server gameState when it changes
  useEffect(() => {
    setLocalGameState(gameState);
    
    if (gameState?.chessState?.board) {
      try {
        game.load(gameState.chessState.board);
        setFen(game.fen());
      } catch (e) {
        console.error('Failed to load chess position:', e);
      }
    }

    const player = gameState?.players?.find((p: any) => p.id === currentPlayer);
    setPlayerColor(player?.chessColor || 'white');
  }, [gameState]);

  // Show fireworks when game ends
  useEffect(() => {
    if (localGameState?.gameOver && !showFireworks) {
      setShowFireworks(true);
    }
  }, [localGameState?.gameOver, showFireworks]);

  const handleMove = ({ sourceSquare, targetSquare }: { 
    sourceSquare: string; 
    targetSquare: string 
  }) => {
    try {
      // Check if it's the player's turn (let backend handle detailed validation)
      if (localGameState.currentTurn !== currentPlayer) {
        console.log("Not your turn");
        return null;
      }
  
      // Check if the game is over
      if (localGameState.gameOver) {
        console.log("Game is over");
        return null;
      }
  
      // Try to make the move locally first for immediate UI feedback
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
  
      if (move) {
        // Update local state immediately for responsive UI
        setFen(game.fen());
        
        // Update localGameState with the new board and moves
        setLocalGameState((prev: any) => ({
          ...prev,
          chessState: {
            ...prev.chessState,
            board: game.fen(),
            moves: [...(prev.chessState?.moves || []), move.san]
          }
        }));
        
        // Send move to server
        onChessMove(`${sourceSquare}${targetSquare}`);
      }
    } catch (e) {
      console.error('Invalid move:', e);
      return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Fireworks 
        show={showFireworks} 
        onComplete={() => setShowFireworks(false)} 
      />
      <div className="w-full max-w-lg mb-4">
        <Chessboard
          position={fen}
          onDrop={handleMove}
          orientation={playerColor}
          draggable={localGameState.currentTurn === currentPlayer && !localGameState.gameOver}
          boardStyle={{
            borderRadius: '8px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
          }}
          width={500}
          transitionDuration={300}
        />
      </div>
      <div className="text-center">
        <p className="text-gray-400">
          {localGameState.gameOver 
            ? `Game Over! Winner: ${localGameState.winner}`
            : `Current Turn: ${localGameState.currentTurn === currentPlayer 
                ? 'Your turn' 
                : 'Opponent\'s turn'}`
          }
        </p>
        <p className="text-sm text-gray-500">
          You are playing as: {playerColor}
        </p>
        {localGameState.chessState?.moves?.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            Last move: {localGameState.chessState.moves.slice(-1)[0]}
          </p>
        )}
      </div>
    </div>
  );
};
