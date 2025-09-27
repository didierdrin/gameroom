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
  const gameRef = useRef<Chess>(new Chess());
  const [fen, setFen] = useState('start');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gameStatus, setGameStatus] = useState('');
  const [lastProcessedMove, setLastProcessedMove] = useState<number>(0);

  // Initialize game state
  useEffect(() => {
    console.log('===== Game State Update =====');
    console.log('currentTurn:', gameState?.currentTurn);
    console.log('currentPlayer:', currentPlayer);
    console.log('board:', gameState?.chessState?.board);
    console.log('players:', gameState?.players);
    
    if (gameState?.chessState?.board) {
      try {
        const newFen = gameState.chessState.board;
        // Only update if the FEN has actually changed
        if (newFen !== gameRef.current.fen()) {
          gameRef.current = new Chess(newFen);
          setFen(newFen);
        }
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
      console.log(`Player ${currentPlayer} is playing as ${player.chessColor}`);
    }

    // CRITICAL: Check if it's current player's turn
    const myTurn = gameState.currentTurn === currentPlayer;
    setIsMyTurn(myTurn);
    console.log(`Turn check: currentTurn=${gameState.currentTurn}, currentPlayer=${currentPlayer}, isMyTurn=${myTurn}`);
  }, [gameState, currentPlayer]);

  // Listen for chess moves from other players
  useEffect(() => {
    if (!socket) return;

    const handleChessMove = (data: any) => {
      console.log('===== Chess Move Event =====');
      console.log('Move data:', data);
      
      // Update board from the move event
      if (data.board) {
        try {
          // Only update if this is a new move (prevent duplicate processing)
          const moveTimestamp = data.timestamp || Date.now();
          if (moveTimestamp > lastProcessedMove) {
            gameRef.current = new Chess(data.board);
            setFen(data.board);
            setLastProcessedMove(moveTimestamp);
            
            // CRITICAL: Update turn from the move event
            if (data.currentTurn !== undefined) {
              const myTurn = data.currentTurn === currentPlayer;
              setIsMyTurn(myTurn);
              console.log(`Turn updated from move: currentTurn=${data.currentTurn}, isMyTurn=${myTurn}`);
            }
            
            // If move was successful and it wasn't our move, show a status update
            if (data.playerId !== currentPlayer) {
              setGameStatus("Opponent moved");
              setTimeout(() => setGameStatus(''), 2000);
            }
          }
        } catch (e) {
          console.error('Failed to update board from move:', e);
        }
      }
    };

    const handleGameState = (newGameState: any) => {
      console.log('===== Full Game State Update =====');
      console.log('New game state:', {
        currentTurn: newGameState?.currentTurn,
        currentPlayer: newGameState?.currentPlayer,
        players: newGameState?.players
      });
      
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
      
      // CRITICAL: Always update turn status from game state
      if (newGameState.currentTurn !== undefined) {
        const myTurn = newGameState.currentTurn === currentPlayer;
        setIsMyTurn(myTurn);
        console.log(`Turn from game state: currentTurn=${newGameState.currentTurn}, isMyTurn=${myTurn}`);
      }
    };

    const handleTurnChanged = (data: any) => {
      console.log('===== Explicit Turn Change =====');
      console.log('Turn change data:', data);
      if (data.roomId === roomId && data.currentTurn !== undefined) {
        const myTurn = data.currentTurn === currentPlayer;
        setIsMyTurn(myTurn);
        console.log(`Turn explicitly changed: currentTurn=${data.currentTurn}, isMyTurn=${myTurn}`);
        
        // Show status update
        if (myTurn) {
          setGameStatus("Your turn!");
          setTimeout(() => setGameStatus(''), 3000);
        }
      }
    };

    const handleChessMoveError = (data: any) => {
      console.error('Chess move error:', data);
      // Revert to the last known good state
      if (gameState?.chessState?.board) {
        gameRef.current = new Chess(gameState.chessState.board);
        setFen(gameState.chessState.board);
      }
      setGameStatus(`Move error: ${data.message}`);
      setTimeout(() => setGameStatus(''), 3000);
    };

    socket.on('chessMove', handleChessMove);
    socket.on('gameState', handleGameState);
    socket.on('turnChanged', handleTurnChanged);
    socket.on('chessMoveError', handleChessMoveError);

    return () => {
      socket.off('chessMove', handleChessMove);
      socket.off('gameState', handleGameState);
      socket.off('turnChanged', handleTurnChanged);
      socket.off('chessMoveError', handleChessMoveError);
    };
  }, [socket, currentPlayer, roomId, lastProcessedMove]);

  const handleMove = useCallback(({ sourceSquare, targetSquare }: { 
    sourceSquare: string; 
    targetSquare: string 
  }) => {
    try {
      console.log(`Attempting move: ${sourceSquare} to ${targetSquare}, isMyTurn=${isMyTurn}`);
      
      // Check if it's player's turn
      if (!isMyTurn) {
        console.log("Not your turn - blocked");
        setGameStatus("Not your turn!");
        setTimeout(() => setGameStatus(''), 2000);
        return null;
      }

      // Check if moving correct color
      const moveColor = gameRef.current.turn();
      const expectedColor = playerColor === 'white' ? 'w' : 'b';
      
      if (moveColor !== expectedColor) {
        console.log(`Wrong color turn: moveColor=${moveColor}, expectedColor=${expectedColor}`);
        setGameStatus("Not your color's turn!");
        setTimeout(() => setGameStatus(''), 2000);
        return null;
      }

      // Try the move locally first (for immediate feedback)
      const tempGame = new Chess(gameRef.current.fen());
      const move = tempGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move) {
        console.log(`Move valid locally: ${move.san}`);
        
        // Send move to backend
        const moveString = `${sourceSquare}${targetSquare}${move.promotion || ''}`;
        console.log(`Sending move to server: ${moveString}`);
        onChessMove(moveString);
        
        // Optimistically update UI (will be confirmed/corrected by server)
        gameRef.current = tempGame;
        setFen(tempGame.fen());
        setIsMyTurn(false);
        setGameStatus("Move sent...");
        setTimeout(() => setGameStatus(''), 1000);
        
        return move;
      } else {
        console.log("Invalid move");
        setGameStatus("Invalid move!");
        setTimeout(() => setGameStatus(''), 2000);
        return null;
      }
    } catch (e) {
      console.error('Move error:', e);
      setGameStatus("Error making move!");
      setTimeout(() => setGameStatus(''), 2000);
      return null;
    }
  }, [isMyTurn, playerColor, onChessMove]);

  // Get game status display
  const getGameStatusDisplay = () => {
    if (gameStatus) {
      return gameStatus; // Show temporary status messages
    }
    
    if (gameState.gameOver) {
      if (gameState.winner === 'draw') {
        return `Game Over - Draw (${gameState.winCondition})`;
      }
      return `Game Over - Winner: ${gameState.winner === currentPlayer ? 'You!' : 'Opponent'}`;
    }
    
    if (gameRef.current.isCheck()) {
      return `Check! ${isMyTurn ? 'Your turn' : "Opponent's turn"}`;
    }
    
    return isMyTurn ? 'Your turn to move' : "Waiting for opponent's move";
  };

  // Get current player info
  const getCurrentTurnInfo = () => {
    const currentTurnPlayer = gameState.players?.find((p: any) => p.id === gameState.currentTurn);
    const turnColor = currentTurnPlayer?.chessColor || 'unknown';
    return {
      playerId: gameState.currentTurn,
      color: turnColor,
      isYou: gameState.currentTurn === currentPlayer
    };
  };

  const turnInfo = getCurrentTurnInfo();

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
          isMyTurn ? 'text-green-400 animate-pulse' : 'text-gray-400'
        }`}>
          {getGameStatusDisplay()}
        </p>
        
        <div className="flex items-center justify-center space-x-4 text-sm">
          <div className="text-gray-500">
            You are: <span className="font-bold text-white">
              {playerColor === 'white' ? '⚪ White' : '⚫ Black'}
            </span>
          </div>
          
          <div className="text-gray-500">
            Current turn: <span className={`font-bold ${turnInfo.isYou ? 'text-green-400' : 'text-yellow-400'}`}>
              {turnInfo.color === 'white' ? '⚪ White' : '⚫ Black'}
              {turnInfo.isYou && ' (You)'}
            </span>
          </div>
        </div>
        
        {gameState.chessState?.moves?.length > 0 && (
          <p className="text-sm text-gray-500">
            Moves played: {gameState.chessState.moves.length}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChessGame;

// import React, { useEffect, useState, useRef, useCallback } from 'react';
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
//   // Use ref to maintain chess instance across renders
//   const gameRef = useRef<Chess>(new Chess());
//   const [fen, setFen] = useState('start');
//   const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
//   const [isMyTurn, setIsMyTurn] = useState(false);
//   const [gameStatus, setGameStatus] = useState('');

//   // Initialize game state
//   useEffect(() => {
//     console.log('Game state update received:', {
//       currentTurn: gameState?.currentTurn,
//       currentPlayer: currentPlayer,
//       board: gameState?.chessState?.board
//     });

//     if (gameState?.chessState?.board) {
//       try {
//         const newFen = gameState.chessState.board;
//         gameRef.current = new Chess(newFen);
//         setFen(newFen);
//       } catch (e) {
//         console.error('Failed to load chess position:', e);
//         gameRef.current = new Chess();
//         setFen(gameRef.current.fen());
//       }
//     }

//     // Determine player color
//     const player = gameState.players?.find((p: any) => p.id === currentPlayer);
//     if (player?.chessColor) {
//       setPlayerColor(player.chessColor);
//       console.log(`Player ${currentPlayer} is playing as ${player.chessColor}`);
//     }

//     // CRITICAL: Check if it's current player's turn
//     const myTurn = gameState.currentTurn === currentPlayer;
//     setIsMyTurn(myTurn);
//     console.log(`Turn check: currentTurn=${gameState.currentTurn}, currentPlayer=${currentPlayer}, isMyTurn=${myTurn}`);
//   }, [gameState, currentPlayer]);

//   // Listen for chess moves from other players
//   useEffect(() => {
//     if (!socket) return;

//     const handleChessMove = (data: any) => {
//       console.log('Received chess move event:', data);
      
//       // Update board from the move event
//       if (data.board) {
//         try {
//           gameRef.current = new Chess(data.board);
//           setFen(data.board);
          
//           // Update turn if included in move event
//           if (data.currentTurn !== undefined) {
//             const myTurn = data.currentTurn === currentPlayer;
//             setIsMyTurn(myTurn);
//             console.log(`Turn updated from move: currentTurn=${data.currentTurn}, isMyTurn=${myTurn}`);
//           }
//         } catch (e) {
//           console.error('Failed to update board from move:', e);
//         }
//       }
//     };

//     const handleGameState = (newGameState: any) => {
//       console.log('Received game state update:', {
//         currentTurn: newGameState?.currentTurn,
//         players: newGameState?.players
//       });
      
//       if (newGameState?.chessState?.board) {
//         try {
//           const newFen = newGameState.chessState.board;
//           if (newFen !== gameRef.current.fen()) {
//             gameRef.current = new Chess(newFen);
//             setFen(newFen);
//           }
//         } catch (e) {
//           console.error('Failed to sync game state:', e);
//         }
//       }
      
//       // CRITICAL: Update turn status from game state
//       const myTurn = newGameState.currentTurn === currentPlayer;
//       setIsMyTurn(myTurn);
//       console.log(`Turn from game state: currentTurn=${newGameState.currentTurn}, isMyTurn=${myTurn}`);
//     };

//     const handleTurnChanged = (data: any) => {
//       console.log('Turn changed event:', data);
//       if (data.roomId === roomId) {
//         const myTurn = data.currentTurn === currentPlayer;
//         setIsMyTurn(myTurn);
//         console.log(`Turn explicitly changed: currentTurn=${data.currentTurn}, isMyTurn=${myTurn}`);
//       }
//     };

//     socket.on('chessMove', handleChessMove);
//     socket.on('gameState', handleGameState);
//     socket.on('turnChanged', handleTurnChanged);

//     return () => {
//       socket.off('chessMove', handleChessMove);
//       socket.off('gameState', handleGameState);
//       socket.off('turnChanged', handleTurnChanged);
//     };
//   }, [socket, currentPlayer, roomId]);

//   const handleMove = useCallback(({ sourceSquare, targetSquare }: { 
//     sourceSquare: string; 
//     targetSquare: string 
//   }) => {
//     try {
//       console.log(`Attempting move: ${sourceSquare} to ${targetSquare}, isMyTurn=${isMyTurn}`);
      
//       // Check if it's player's turn
//       if (!isMyTurn) {
//         console.log("Not your turn - blocked");
//         setGameStatus("Not your turn!");
//         setTimeout(() => setGameStatus(''), 2000);
//         return null;
//       }

//       // Check if moving correct color
//       const moveColor = gameRef.current.turn();
//       const expectedColor = playerColor === 'white' ? 'w' : 'b';
      
//       if (moveColor !== expectedColor) {
//         console.log(`Wrong color turn: moveColor=${moveColor}, expectedColor=${expectedColor}`);
//         setGameStatus("Not your color's turn!");
//         setTimeout(() => setGameStatus(''), 2000);
//         return null;
//       }

//       // Try the move locally first
//       const move = gameRef.current.move({
//         from: sourceSquare,
//         to: targetSquare,
//         promotion: 'q',
//       });

//       if (move) {
//         console.log(`Move successful locally: ${move.san}`);
        
//         // Update local state immediately for responsiveness
//         setFen(gameRef.current.fen());
        
//         // Send move to backend
//         const moveString = `${sourceSquare}${targetSquare}${move.promotion || ''}`;
//         console.log(`Sending move to server: ${moveString}`);
//         onChessMove(moveString);
        
//         // Optimistically update turn (will be confirmed by server)
//         setIsMyTurn(false);
        
//         return move;
//       } else {
//         console.log("Invalid move");
//         setGameStatus("Invalid move!");
//         setTimeout(() => setGameStatus(''), 2000);
//         return null;
//       }
//     } catch (e) {
//       console.error('Move error:', e);
//       setGameStatus("Error making move!");
//       setTimeout(() => setGameStatus(''), 2000);
//       return null;
//     }
//   }, [isMyTurn, playerColor, onChessMove]);

//   // Get game status display
//   const getGameStatusDisplay = () => {
//     if (gameStatus) {
//       return gameStatus; // Show temporary status messages
//     }
    
//     if (gameState.gameOver) {
//       if (gameState.winner === 'draw') {
//         return `Game Over - Draw (${gameState.winCondition})`;
//       }
//       return `Game Over - Winner: ${gameState.winner === currentPlayer ? 'You!' : 'Opponent'}`;
//     }
    
//     if (gameRef.current.isCheck()) {
//       return `Check! ${isMyTurn ? 'Your turn' : "Opponent's turn"}`;
//     }
    
//     return isMyTurn ? 'Your turn to move' : "Waiting for opponent's move";
//   };

//   // Get current player info
//   const getCurrentTurnInfo = () => {
//     const currentTurnPlayer = gameState.players?.find((p: any) => p.id === gameState.currentTurn);
//     const turnColor = currentTurnPlayer?.chessColor || 'unknown';
//     return {
//       playerId: gameState.currentTurn,
//       color: turnColor,
//       isYou: gameState.currentTurn === currentPlayer
//     };
//   };

//   const turnInfo = getCurrentTurnInfo();

//   return (
//     <div className="flex flex-col items-center justify-center h-full">
//       <div className="mb-4 text-center">
//         <h3 className="text-xl font-bold text-white mb-2">Chess Game</h3>
//         <p className="text-gray-400">Room: {roomId}</p>
//       </div>
      
//       <div className="w-full max-w-lg mb-4">
//         <Chessboard
//           position={fen}
//           onDrop={handleMove}
//           orientation={playerColor}
//           draggable={isMyTurn && !gameState.gameOver}
//           boardStyle={{
//             borderRadius: '8px',
//             boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
//           }}
//           width={500}
//           transitionDuration={300}
//           darkSquareStyle={{ backgroundColor: '#B58863' }}
//           lightSquareStyle={{ backgroundColor: '#F0D9B5' }}
//         />
//       </div>
      
//       <div className="text-center space-y-2">
//         <p className={`text-lg font-semibold ${
//           isMyTurn ? 'text-green-400 animate-pulse' : 'text-gray-400'
//         }`}>
//           {getGameStatusDisplay()}
//         </p>
        
//         <div className="flex items-center justify-center space-x-4 text-sm">
//           <div className="text-gray-500">
//             You are: <span className="font-bold text-white">
//               {playerColor === 'white' ? '⚪ White' : '⚫ Black'}
//             </span>
//           </div>
          
//           <div className="text-gray-500">
//             Current turn: <span className={`font-bold ${turnInfo.isYou ? 'text-green-400' : 'text-yellow-400'}`}>
//               {turnInfo.color === 'white' ? '⚪ White' : '⚫ Black'}
//               {turnInfo.isYou && ' (You)'}
//             </span>
//           </div>
//         </div>
        
//         {gameState.chessState?.moves?.length > 0 && (
//           <p className="text-sm text-gray-500">
//             Moves played: {gameState.chessState.moves.length}
//           </p>
//         )}
        
//         {/* Debug info - remove in production */}
//         <div className="text-xs text-gray-600 mt-2">
//           Debug: Turn={gameState.currentTurn}, You={currentPlayer}, MyTurn={isMyTurn.toString()}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ChessGame;
