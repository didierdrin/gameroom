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

  const handleMove = ({ sourceSquare, targetSquare }: { 
    sourceSquare: string; 
    targetSquare: string 
  }) => {
    try {
      // Only allow moves when it's the player's turn
      if (gameState.currentTurn !== currentPlayer) return;

      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Always promote to queen for simplicity
      });

      if (move) {
        setFen(game.fen());
        // Send the move in standard algebraic notation
        onChessMove(`${sourceSquare}${targetSquare}`);
        
        // Update local game state immediately for smooth UI
        const newGameState = {
          ...gameState,
          chessState: {
            board: game.fen(),
            moves: [...(gameState.chessState?.moves || []), move.san]
          },
          currentTurn: gameState.players.find(
            (p: any) => p.id !== currentPlayer
          )?.id
        };
      }
    } catch (e) {
      console.error('Invalid move:', e);
      return false; // Prevent the move
    }
  };

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
        {gameState.chessState?.moves?.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            Last move: {gameState.chessState.moves.slice(-1)[0]}
          </p>
        )}
      </div>
    </div>
  );
};


// import React, { useEffect, useState } from 'react';
// import Chessboard from 'chessboardjsx';
// import { Chess } from 'chess.js';

// interface GameRenderProps {
//   socket: any;q
//   roomId: string;
//   currentPlayer: string;
//   gameState: any;
//   onChessMove: (move: string) => void;
// }

// export const ChessGame: React.FC<GameRenderProps> = ({ socket, roomId, currentPlayer, gameState, onChessMove }) => {
//   const [chess] = useState(new Chess(gameState.chessState?.board || 'rnbqkbnr/pppppppp/5n1f/8/8/5N1F/PPPPPPPP/RNBQKBNR w KQkq - 0 1'));
//   const [fen, setFen] = useState(gameState.chessState?.board || 'rnbqkbnr/pppppppp/5n1f/8/8/5N1F/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
//   const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');

//   useEffect(() => {
//     const player = gameState.players.find((p: any) => p.id === currentPlayer);
//     setPlayerColor(player?.chessColor || 'white');
//     setFen(gameState.chessState?.board || fen);
//     chess.load(gameState.chessState?.board || fen);
//   }, [gameState, currentPlayer, chess, fen]);

//   const handleMove = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string }) => {
//     const move = chess.move({
//       from: sourceSquare,
//       to: targetSquare,
//       promotion: 'q', // Auto-promote to queen
//     });
//     if (move && gameState.currentTurn === currentPlayer) {
//       onChessMove(move.san); // e.g., "e2e4"
//       setFen(chess.fen());
//     }
//   };

//   return (
//     <div className="flex flex-col items-center justify-center h-full">
//       <div className="w-full max-w-lg">
//         <Chessboard
//           position={fen}
//           onDrop={handleMove}
//           orientation={playerColor}
//           draggable={gameState.currentTurn === currentPlayer}
//           boardStyle={{
//             borderRadius: '8px',
//             boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
//           }}
//         />
//       </div>
//       <div className="mt-4 text-center">
//         <p className="text-gray-400">
//           {gameState.gameOver ? `Game Over! Winner: ${gameState.winner}` : `Current Turn: ${gameState.currentTurn === currentPlayer ? 'Your turn' : 'Opponent\'s turn'}`}
//         </p>
//       </div>
//     </div>
//   );
// };
