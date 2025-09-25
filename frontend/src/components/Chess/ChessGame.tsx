// ChessGame.tsx - Complete fixed component
import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  // Use ref to maintain chess instance across renders
  const gameRef = useRef<Chess>(new Chess());
  const [fen, setFen] = useState('start');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [isMyTurn, setIsMyTurn] = useState(false);

  // Initialize game state
  useEffect(() => {
    if (gameState?.chessState?.board) {
      try {
        // Load the board position from backend
        const newFen = gameState.chessState.board;
        gameRef.current = new Chess(newFen);
        setFen(newFen);
      } catch (e) {
        console.error('Failed to load chess position:', e);
        gameRef.current = new Chess();
        setFen(gameRef.current.fen());
      }
    }

    // Determine player color
    const player = gameState.players?.find((p: any) => p.id === currentPlayer);
    if (player?.chessColor) {
      setPlayerColor(player.chessColor);
    }

    // Check if it's current player's turn
    setIsMyTurn(gameState.currentTurn === currentPlayer);
  }, [gameState, currentPlayer]);

  // Listen for chess moves from other players
  useEffect(() => {
    if (!socket) return;

    const handleChessMove = (data: any) => {
      console.log('Received chess move:', data);
      
      // Only update if it's not our own move
      if (data.playerId !== currentPlayer && data.board) {
        try {
          gameRef.current = new Chess(data.board);
          setFen(data.board);
        } catch (e) {
          console.error('Failed to update board from move:', e);
        }
      }
    };

    const handleGameState = (newGameState: any) => {
      console.log('Received game state update');
      
      if (newGameState?.chessState?.board) {
        try {
          const newFen = newGameState.chessState.board;
          if (newFen !== gameRef.current.fen()) {
            gameRef.current = new Chess(newFen);
            setFen(newFen);
          }
        } catch (e) {
          console.error('Failed to sync game state:', e);
        }
      }
      
      // Update turn status
      setIsMyTurn(newGameState.currentTurn === currentPlayer);
    };

    socket.on('chessMove', handleChessMove);
    socket.on('gameState', handleGameState);

    return () => {
      socket.off('chessMove', handleChessMove);
      socket.off('gameState', handleGameState);
    };
  }, [socket, currentPlayer]);

  const handleMove = useCallback(({ sourceSquare, targetSquare }: { 
    sourceSquare: string; 
    targetSquare: string 
  }) => {
    try {
      // Check if it's player's turn
      if (!isMyTurn) {
        console.log("Not your turn");
        return null;
      }

      // Check if moving correct color
      const moveColor = gameRef.current.turn();
      if ((moveColor === 'w' && playerColor !== 'white') || 
          (moveColor === 'b' && playerColor !== 'black')) {
        console.log("Not your color's turn");
        return null;
      }

      // Try the move
      const move = gameRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move) {
        // Update local state immediately for responsiveness
        setFen(gameRef.current.fen());
        
        // Send move to backend
        const moveString = `${sourceSquare}${targetSquare}${move.promotion || ''}`;
        onChessMove(moveString);
        
        // Optimistically update turn
        setIsMyTurn(false);
        
        return move;
      } else {
        // Invalid move - reset position
        console.log("Invalid move");
        return null;
      }
    } catch (e) {
      console.error('Move error:', e);
      return null;
    }
  }, [isMyTurn, playerColor, onChessMove]);

  // Get game status
  const getGameStatus = () => {
    if (gameState.gameOver) {
      if (gameState.winner === 'draw') {
        return `Game Over - Draw (${gameState.winCondition})`;
      }
      return `Game Over - Winner: ${gameState.winner === currentPlayer ? 'You!' : 'Opponent'}`;
    }
    
    if (gameRef.current.isCheck()) {
      return `Check! ${isMyTurn ? 'Your turn' : "Opponent's turn"}`;
    }
    
    return isMyTurn ? 'Your turn' : "Opponent's turn";
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="mb-4 text-center">
        <h3 className="text-xl font-bold text-white mb-2">Chess Game</h3>
        <p className="text-gray-400">Room: {roomId}</p>
      </div>
      
      <div className="w-full max-w-lg mb-4">
        <Chessboard
          position={fen}
          onDrop={handleMove}
          orientation={playerColor}
          draggable={isMyTurn && !gameState.gameOver}
          boardStyle={{
            borderRadius: '8px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
          }}
          width={500}
          transitionDuration={300}
          darkSquareStyle={{ backgroundColor: '#B58863' }}
          lightSquareStyle={{ backgroundColor: '#F0D9B5' }}
        />
      </div>
      
      <div className="text-center space-y-2">
        <p className={`text-lg font-semibold ${
          isMyTurn ? 'text-green-400' : 'text-gray-400'
        }`}>
          {getGameStatus()}
        </p>
        
        <p className="text-sm text-gray-500">
          You are playing as: <span className="font-bold">
            {playerColor === 'white' ? '⚪ White' : '⚫ Black'}
          </span>
        </p>
        
        {gameState.chessState?.moves?.length > 0 && (
          <p className="text-sm text-gray-500">
            Moves played: {gameState.chessState.moves.length}
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
//   // const [game, setGame] = useState(new Chess());
//   const [game] = useState(() => new Chess());
//   const [fen, setFen] = useState('start');
//   const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
//   const [localGameState, setLocalGameState] = useState(gameState);

//   useEffect(() => {
//     // Initialize game from gameState
//     if (gameState?.chessState?.board) {
//       try {
//         game.load(gameState.chessState.board);
//         setFen(game.fen());
//       } catch (e) {
//         console.error('Failed to load chess position:', e);
//       }
//     }

//     // Set player color
//     const player = gameState.players.find((p: any) => p.id === currentPlayer);
//     setPlayerColor(player?.chessColor || 'white');
//   }, [gameState, currentPlayer]);


//   // after updating FEN and playerColor
// useEffect(() => {
//   setLocalGameState(gameState);
// }, [gameState]);


// // const handleMove = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string }) => {
// //   try {
// //     // Use props gameState, not localGameState
// //     if (gameState.currentTurn !== currentPlayer) {
// //       console.log("Not your turn");
// //       return null;
// //     }

// //     const player = gameState.players.find((p: any) => p.id === currentPlayer);
// //     const moveColor = game.turn();
// //     if ((moveColor === 'w' && player?.chessColor !== 'white') ||
// //         (moveColor === 'b' && player?.chessColor !== 'black')) {
// //       console.log("Not your color's turn");
// //       return null;
// //     }

// //     const move = game.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
// //     if (move) {
// //       setFen(game.fen());
// //       setLocalGameState((prev: any) => ({
// //         ...prev,
// //         chessState: {
// //           ...prev?.chessState,
// //           board: game.fen(),
// //           moves: [...(prev?.chessState?.moves || []), `${sourceSquare}${targetSquare}`]
// //         }
// //       }));
// //       onChessMove(`${sourceSquare}${targetSquare}`);
// //     }
// //   } catch (e) {
// //     console.error('Invalid move:', e);
// //     return null;
// //   }
// // };
//   // Update your handleMove to use localGameState
//   const handleMove = ({ sourceSquare, targetSquare }: { 
//     sourceSquare: string; 
//     targetSquare: string 
//   }) => {
//     try {
//       if (localGameState.currentTurn !== currentPlayer) {
//         console.log("Not your turn");
//         return null;
//       }

//       const player = localGameState.players.find((p: any) => p.id === currentPlayer);
//       const moveColor = game.turn();

//       if ((moveColor === 'w' && player?.chessColor !== 'white') || 
//           (moveColor === 'b' && player?.chessColor !== 'black')) {
//         console.log("Not your color's turn");
//         return null;
//       }

//       const move = game.move({
//         from: sourceSquare,
//         to: targetSquare,
//         promotion: 'q',
//       });

//       if (move) {
//         setFen(game.fen());
//         setLocalGameState((prev:any) => ({
//           ...prev,
//           chessState: {
//             ...prev.chessState,
//             board: game.fen(),
//             moves: [...(prev.chessState?.moves || []), `${sourceSquare}${targetSquare}`]
//           }
//         }));
//         onChessMove(`${sourceSquare}${targetSquare}`);
//       }
//     } catch (e) {
//       console.error('Invalid move:', e);
//       return null;
//     }
//   };

//   return (
//     <div className="flex flex-col items-center justify-center h-full">
//       <div className="w-full max-w-lg mb-4">
//         <Chessboard
//           position={fen}
//           onDrop={handleMove}
//           orientation={playerColor}
//           draggable={gameState.currentTurn === currentPlayer}
//           boardStyle={{
//             borderRadius: '8px',
//             boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
//           }}
//           width={500}
//           transitionDuration={300}
//         />
//       </div>
//       <div className="text-center">
//   <p className="text-gray-400">
//     {gameState.gameOver 
//       ? `Game Over! Winner: ${gameState.winner}`
//       : `Current Turn: ${gameState.currentTurn === currentPlayer 
//           ? 'Your turn' 
//           : 'Opponent\'s turn'}`
//     }
//   </p>
//   <p className="text-sm text-gray-500">
//     You are playing as: {playerColor}
//   </p>
//   {gameState.chessState?.moves?.length > 0 && (
//     <p className="text-sm text-gray-500 mt-2">
//       Last move: {gameState.chessState.moves.slice(-1)[0]}
//     </p>
//   )}
// </div>
//     </div>
//   );
// };

