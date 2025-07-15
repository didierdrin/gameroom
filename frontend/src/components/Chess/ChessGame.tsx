
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

export const renderChessGame: React.FC<GameRenderProps> = ({ socket, roomId, currentPlayer, gameState, onChessMove }) => {
  const [chess] = useState(new Chess(gameState.chessState?.board || 'rnbqkbnr/pppppppp/5n1f/8/8/5N1F/PPPPPPPP/RNBQKBNR w KQkq - 0 1'));
  const [fen, setFen] = useState(gameState.chessState?.board || 'rnbqkbnr/pppppppp/5n1f/8/8/5N1F/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');

  useEffect(() => {
    const player = gameState.players.find((p: any) => p.id === currentPlayer);
    setPlayerColor(player?.chessColor || 'white');
    setFen(gameState.chessState?.board || fen);
    chess.load(gameState.chessState?.board || fen);
  }, [gameState, currentPlayer, chess, fen]);

  const handleMove = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string }) => {
    const move = chess.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q', // Auto-promote to queen
    });
    if (move && gameState.currentTurn === currentPlayer) {
      onChessMove(move.san); // e.g., "e2e4"
      setFen(chess.fen());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-full max-w-lg">
        <Chessboard
          position={fen}
          onDrop={handleMove}
          orientation={playerColor}
          draggable={gameState.currentTurn === currentPlayer}
          boardStyle={{
            borderRadius: '8px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
          }}
        />
      </div>
      <div className="mt-4 text-center">
        <p className="text-gray-400">
          {gameState.gameOver ? `Game Over! Winner: ${gameState.winner}` : `Current Turn: ${gameState.currentTurn === currentPlayer ? 'Your turn' : 'Opponent\'s turn'}`}
        </p>
      </div>
    </div>
  );
};

// interface GameRenderProps {
//     socket: any;
//     roomId: string;
//     currentPlayer: string;
//     gameState: any;
//   }

// export const renderChessGame: React.FC<GameRenderProps> = ({ socket: _socket, roomId: _roomId, currentPlayer: _currentPlayer, gameState: _gameState }) => {
//     return (
//     <div className="flex items-center justify-center h-full">
//         <div className="w-full max-w-lg aspect-square bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg overflow-hidden shadow-lg">
//           <div className="grid grid-cols-8 grid-rows-8 h-full">
//             {Array(64).fill(0).map((_, i) => {
//             const row = Math.floor(i / 8);
//             const col = i % 8;
//             const isBlack = (row + col) % 2 === 1;
//             return <div key={i} className={`${isBlack ? 'bg-gray-700' : 'bg-gray-300'} flex items-center justify-center`}>
//                     {/* Chess pieces would go here */}
//                   </div>;
//           })}
//           </div>
//         </div>
//       </div>
//       );
//   };
