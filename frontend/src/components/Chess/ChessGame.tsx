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
    
    // Always load the board state from server
    if (gameState?.chessState?.board) {
      try {
        game.load(gameState.chessState.board);
        setFen(game.fen());
        console.log('Chess board loaded:', {
          fen: game.fen(),
          turn: game.turn(),
          moves: gameState.chessState.moves
        });
      } catch (e) {
        console.error('Failed to load chess position:', e);
        // Reset to starting position if loading fails
        game.reset();
        setFen(game.fen());
      }
    } else {
      // If no chess state, reset to starting position
      game.reset();
      setFen(game.fen());
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
      // Check if it's the player's turn
      if (localGameState.currentTurn !== currentPlayer) {
        console.log("Not your turn");
        return null;
      }
  
      // Check if the game is over
      if (localGameState.gameOver) {
        console.log("Game is over");
        return null;
      }

      // Check if the move is valid for the current player's color
      const player = localGameState.players.find((p: any) => p.id === currentPlayer);
      const moveColor = game.turn();
      
      if ((moveColor === 'w' && player?.chessColor !== 'white') || 
          (moveColor === 'b' && player?.chessColor !== 'black')) {
        console.log("Not your color's turn");
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
        
        // Send move to server - don't update local state here
        // Let the server response update the state via useEffect
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
