import React, { useEffect, useState } from 'react';
import Chessboard from 'chessboardjsx';
import { Chess } from 'chess.js';

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
  // const [game, setGame] = useState(new Chess());
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState('start');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [localGameState, setLocalGameState] = useState(gameState);

  useEffect(() => {
    // Initialize game from gameState
    if (gameState?.chessState?.board) {
      try {
        game.load(gameState.chessState.board);
        setFen(game.fen());
      } catch (e) {
        console.error('Failed to load chess position:', e);
      }
    }

    // Set player color
    const player = gameState.players.find((p: any) => p.id === currentPlayer);
    setPlayerColor(player?.chessColor || 'white');
  }, [gameState, currentPlayer]);


  // Update your handleMove to use localGameState
  const handleMove = ({ sourceSquare, targetSquare }: { 
    sourceSquare: string; 
    targetSquare: string 
  }) => {
    try {
      if (localGameState.currentTurn !== currentPlayer) {
        console.log("Not your turn");
        return null;
      }
  
      const player = localGameState.players.find((p: any) => p.id === currentPlayer);
      const moveColor = game.turn();
      
      if ((moveColor === 'w' && player?.chessColor !== 'white') || 
          (moveColor === 'b' && player?.chessColor !== 'black')) {
        console.log("Not your color's turn");
        return null;
      }
  
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
  
      if (move) {
        setFen(game.fen());
        setLocalGameState((prev:any) => ({
          ...prev,
          chessState: {
            ...prev.chessState,
            board: game.fen(),
            moves: [...(prev.chessState?.moves || []), `${sourceSquare}${targetSquare}`]
          }
        }));
        onChessMove(`${sourceSquare}${targetSquare}`);
      }
    } catch (e) {
      console.error('Invalid move:', e);
      return null;
    }
  };

  // const handleMove = ({ sourceSquare, targetSquare }: { 
  //   sourceSquare: string; 
  //   targetSquare: string 
  // }) => {
  //   try {
  //     // Only allow moves when it's the player's turn
  //     if (gameState.currentTurn !== currentPlayer) {
  //       console.log("Not your turn");
  //       return null;
  //     }
  
  //     // Check if the move matches the player's color
  //     const player = gameState.players.find((p: any) => p.id === currentPlayer);
  //     const moveColor = game.turn();
      
  //     if ((moveColor === 'w' && player?.chessColor !== 'white') || 
  //         (moveColor === 'b' && player?.chessColor !== 'black')) {
  //       console.log("Not your color's turn");
  //       return null;
  //     }
  
  //     const move = game.move({
  //       from: sourceSquare,
  //       to: targetSquare,
  //       promotion: 'q',
  //     });
  
  //     if (move) {
  //       setFen(game.fen());
  //       onChessMove(`${sourceSquare}${targetSquare}`);
  //     }
  //   } catch (e) {
  //     console.error('Invalid move:', e);
  //     return null;
  //   }
  // };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-full max-w-lg mb-4">
        <Chessboard
          position={fen}
          onDrop={handleMove}
          orientation={playerColor}
          draggable={gameState.currentTurn === currentPlayer}
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
    {gameState.gameOver 
      ? `Game Over! Winner: ${gameState.winner}`
      : `Current Turn: ${gameState.currentTurn === currentPlayer 
          ? 'Your turn' 
          : 'Opponent\'s turn'}`
    }
  </p>
  <p className="text-sm text-gray-500">
    You are playing as: {playerColor}
  </p>
  {gameState.chessState?.moves?.length > 0 && (
    <p className="text-sm text-gray-500 mt-2">
      Last move: {gameState.chessState.moves.slice(-1)[0]}
    </p>
  )}
</div>
    </div>
  );
};

