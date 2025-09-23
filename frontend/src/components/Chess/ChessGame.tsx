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


// import React, { useEffect, useState, useCallback } from 'react';
// import Chessboard from 'chessboardjsx';
// import { Fireworks } from '../UI/Fireworks';

// interface GameRenderProps {
//   socket: any;
//   roomId: string;
//   currentPlayer: string;
//   gameState: any;
//   onChessMove: (move: string) => void;
// }

// export const ChessGame: React.FC<GameRenderProps> = ({ 
//   socket, 
//   roomId, 
//   currentPlayer, 
//   gameState, 
//   onChessMove 
// }) => {
//   const [fen, setFen] = useState('start');
//   const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
//   const [showFireworks, setShowFireworks] = useState(false);
//   const [isMyTurn, setIsMyTurn] = useState(false);
//   const [lastMoveTime, setLastMoveTime] = useState<number>(0);

//   // Handle game state updates from server
//   useEffect(() => {
//     console.log('=== FRONTEND STATE UPDATE ===');
//     console.log('Received game state:', {
//       currentTurn: gameState?.currentTurn,
//       currentPlayer,
//       chessState: gameState?.chessState,
//       players: gameState?.players?.map((p: any) => ({ id: p.id, name: p.name, chessColor: p.chessColor })),
//       gameStarted: gameState?.gameStarted,
//       gameOver: gameState?.gameOver
//     });

//     // Always use server board state - this is the source of truth
//     if (gameState?.chessState?.board) {
//       setFen(gameState.chessState.board);
//       console.log('Board updated from server:', gameState.chessState.board);
//     } else {
//       // Reset to starting position if no chess state
//       setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
//     }

//     // Determine player color
//     const player = gameState?.players?.find((p: any) => p.id === currentPlayer);
//     if (player?.chessColor) {
//       setPlayerColor(player.chessColor);
//       console.log('Player color set:', player.chessColor);
//     }

//     // Check if it's the current player's turn
//     const myTurn = gameState?.currentTurn === currentPlayer && 
//                    gameState?.gameStarted && 
//                    !gameState?.gameOver;
//     setIsMyTurn(myTurn);
    
//     console.log('Turn status:', {
//       playerId: currentPlayer,
//       serverCurrentTurn: gameState?.currentTurn,
//       isMyTurn: myTurn,
//       gameStarted: gameState?.gameStarted,
//       gameOver: gameState?.gameOver
//     });
//   }, [gameState, currentPlayer]);

//   // Show fireworks when game ends
//   useEffect(() => {
//     if (gameState?.gameOver && !showFireworks) {
//       setShowFireworks(true);
//     }
//   }, [gameState?.gameOver, showFireworks]);

//   // Listen for chess move confirmations
//   useEffect(() => {
//     const handleChessMove = (data: any) => {
//       console.log('Chess move confirmed:', data);
//       setLastMoveTime(Date.now());
//     };

//     const handleChessMoveError = (error: any) => {
//       console.error('Chess move error:', error);
//       // Force refresh the board state
//       if (gameState?.chessState?.board) {
//         setFen(gameState.chessState.board);
//       }
//     };

//     if (socket) {
//       socket.on('chessMove', handleChessMove);
//       socket.on('chessMoveError', handleChessMoveError);

//       return () => {
//         socket.off('chessMove', handleChessMove);
//         socket.off('chessMoveError', handleChessMoveError);
//       };
//     }
//   }, [socket, gameState]);

//   const handleMove = useCallback(({ sourceSquare, targetSquare }: { 
//     sourceSquare: string; 
//     targetSquare: string 
//   }) => {
//     console.log('=== FRONTEND MOVE ATTEMPT ===');
//     console.log('Move details:', {
//       from: sourceSquare,
//       to: targetSquare,
//       isMyTurn,
//       currentPlayer,
//       serverCurrentTurn: gameState?.currentTurn,
//       gameOver: gameState?.gameOver,
//       gameStarted: gameState?.gameStarted
//     });

//     // Prevent rapid-fire moves
//     const now = Date.now();
//     if (now - lastMoveTime < 500) {
//       console.log('Move blocked - too rapid');
//       return null;
//     }

//     // Basic client-side validation
//     if (!isMyTurn) {
//       console.log('Move blocked - not your turn');
//       return null;
//     }

//     if (gameState?.gameOver) {
//       console.log('Move blocked - game is over');
//       return null;
//     }

//     if (!gameState?.gameStarted) {
//       console.log('Move blocked - game not started');
//       return null;
//     }

//     // Create move string and send to server
//     const moveString = `${sourceSquare}${targetSquare}`;
//     console.log('Sending move to server:', moveString);
    
//     try {
//       onChessMove(moveString);
//       setLastMoveTime(now);
//       return true; // Allow the visual move temporarily
//     } catch (error) {
//       console.error('Failed to send move:', error);
//       return null;
//     }
//   }, [isMyTurn, currentPlayer, gameState, onChessMove, lastMoveTime]);

//   // Get current turn display text
//   const getCurrentTurnText = () => {
//     if (gameState?.gameOver) {
//       if (gameState.winner === 'draw') {
//         return `Game Over - Draw (${gameState.winCondition || 'unknown reason'})`;
//       }
//       const winnerPlayer = gameState?.players?.find((p: any) => p.id === gameState.winner);
//       const winnerName = winnerPlayer?.name || gameState.winner;
//       return `Game Over! Winner: ${winnerName}`;
//     }
    
//     if (!gameState?.gameStarted) {
//       return 'Game not started';
//     }
    
//     if (isMyTurn) {
//       return 'Your turn';
//     }
    
//     // Find the current player's name
//     const currentTurnPlayer = gameState?.players?.find((p: any) => p.id === gameState.currentTurn);
//     const opponentName = currentTurnPlayer?.name || 'Opponent';
    
//     return `${opponentName}'s turn`;
//   };

//   // Get move count
//   const getMoveCount = () => {
//     const moves = gameState?.chessState?.moves || [];
//     return Math.ceil(moves.length / 2);
//   };

//   return (
//     <div className="flex flex-col items-center justify-center h-full">
//       <Fireworks 
//         show={showFireworks} 
//         onComplete={() => setShowFireworks(false)} 
//       />
      
//       {/* Game Status */}
//       <div className="mb-4 text-center">
//         <div className={`text-lg font-semibold mb-2 ${isMyTurn ? 'text-green-600' : 'text-gray-600'}`}>
//           {getCurrentTurnText()}
//         </div>
//         <div className="text-sm text-gray-500 space-x-4">
//           <span>Playing as: <span className="font-medium capitalize">{playerColor}</span></span>
//           <span>Move: {getMoveCount()}</span>
//           {gameState?.chessState?.moves?.length > 0 && (
//             <span>Last: {gameState.chessState.moves.slice(-1)[0]}</span>
//           )}
//         </div>
//       </div>

//       {/* Chess Board */}
//       <div className="w-full max-w-lg">
//         <Chessboard
//           position={fen}
//           onDrop={handleMove}
//           orientation={playerColor}
//           draggable={isMyTurn}
//           boardStyle={{
//             borderRadius: '8px',
//             boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
//           }}
//           width={500}
//           transitionDuration={300}
//         />
//       </div>

//       {/* Game Info */}
//       <div className="mt-4 text-center text-sm text-gray-500">
//         {gameState?.players && (
//           <div className="flex justify-center space-x-6">
//             {gameState.players.map((player: any) => (
//               <div key={player.id} className={`flex items-center space-x-2 ${
//                 player.id === gameState.currentTurn ? 'font-bold text-blue-600' : ''
//               }`}>
//                 <div className={`w-3 h-3 rounded-full ${
//                   player.chessColor === 'white' ? 'bg-gray-200 border border-gray-400' : 'bg-gray-800'
//                 }`}></div>
//                 <span>{player.name}</span>
//                 {player.id === gameState.currentTurn && (
//                   <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
//                     Turn
//                   </span>
//                 )}
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* Move History */}
//       {gameState?.chessState?.moves && gameState.chessState.moves.length > 0 && (
//         <div className="mt-4 w-full max-w-lg">
//           <div className="text-sm font-semibold mb-2">Move History:</div>
//           <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 max-h-32 overflow-y-auto">
//             <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
//               {gameState.chessState.moves.map((move: string, index: number) => (
//                 <span key={index} className="mr-3">
//                   {index % 2 === 0 ? `${Math.floor(index / 2) + 1}.` : ''} {move}
//                 </span>
//               ))}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Debug info (remove in production) */}
//       {process.env.NODE_ENV === 'development' && (
//         <div className="mt-4 text-xs text-gray-400 bg-gray-100 p-2 rounded max-w-lg w-full">
//           <div>Player ID: {currentPlayer}</div>
//           <div>Current Turn: {gameState?.currentTurn}</div>
//           <div>Is My Turn: {isMyTurn ? 'Yes' : 'No'}</div>
//           <div>Game Started: {gameState?.gameStarted ? 'Yes' : 'No'}</div>
//           <div>Game Over: {gameState?.gameOver ? 'Yes' : 'No'}</div>
//         </div>
//       )}
//     </div>
//   );
// };
