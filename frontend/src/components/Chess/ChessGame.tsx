import React, { useEffect, useState } from 'react';
import Chessboard from 'chessboardjsx';
import { Chess } from 'chess.js';

interface GameRenderProps {
  socket: any;
  roomId: string;
  currentPlayer: string;
  gameState: any;
  onChessMove: (move: string) => void;
  playerIdToUsername: Record<string, string>;
}

export const ChessGame: React.FC<GameRenderProps> = ({ 
  socket, 
  roomId, 
  currentPlayer, 
  gameState, 
  onChessMove,
  playerIdToUsername
}) => {
  // REMOVED: Local chess game instance and fen state
  // We now rely entirely on server state
  
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [showFireworks, setShowFireworks] = useState(false);
  const [pendingMove, setPendingMove] = useState<string | null>(null);
  const [moveInProgress, setMoveInProgress] = useState(false);

  // Set player color based on chess player assignments
  useEffect(() => {
    if (gameState?.chessPlayers) {
      if (gameState.chessPlayers.player1Id === currentPlayer) {
        setPlayerColor('white');
      } else if (gameState.chessPlayers.player2Id === currentPlayer) {
        setPlayerColor('black');
      }
    }
  }, [gameState?.chessPlayers, currentPlayer]);

  // Listen for server updates
  useEffect(() => {
    if (!socket) return;

    const handleChessBoardUpdate = (data: {
      board: string;
      move: string;
      gameState: any;
    }) => {
      console.log('Received chessBoardUpdate from server:', {
        newBoard: data.board,
        move: data.move,
        serverCurrentTurn: data.gameState.currentTurn,
        pendingMove: pendingMove
      });
      
      // Always clear pending move state when we get server confirmation
      console.log('Clearing pending move state due to server update');
      setPendingMove(null);
      setMoveInProgress(false);
      
      // Handle game over states
      if (data.gameState.gameOver) {
        setShowFireworks(true);
      }
    };

    const handleGameState = (gameStateUpdate: any) => {
      console.log('Received gameState update:', {
        gameType: gameStateUpdate.gameType,
        currentTurn: gameStateUpdate.currentTurn,
        gameStarted: gameStateUpdate.gameStarted,
        chessBoard: gameStateUpdate.chessState?.board,
        pendingMove: pendingMove,
        moveInProgress: moveInProgress
      });
      
      // If this is a chess game and we have a board update, clear pending state
      if (gameStateUpdate.gameType === 'chess' && gameStateUpdate.chessState?.board) {
        console.log('Clearing pending move state due to gameState update with board');
        setPendingMove(null);
        setMoveInProgress(false);
      }
    };

    // Also listen for move confirmation directly
    const handleMoveResponse = (response: any) => {
      console.log('Received move response:', response);
      if (response.success) {
        setPendingMove(null);
        setMoveInProgress(false);
      } else {
        console.error('Move failed:', response.error);
        setPendingMove(null);
        setMoveInProgress(false);
      }
    };

    socket.on('chessBoardUpdate', handleChessBoardUpdate);
    socket.on('gameState', handleGameState);
    socket.on('chessMove', handleMoveResponse);

    return () => {
      socket.off('chessBoardUpdate', handleChessBoardUpdate);
      socket.off('gameState', handleGameState);
      socket.off('chessMove', handleMoveResponse);
    };
  }, [socket, pendingMove, moveInProgress]);

  // Show fireworks when game ends
  useEffect(() => {
    if (gameState.gameOver && !showFireworks) {
      setShowFireworks(true);
    }
  }, [gameState.gameOver, showFireworks]);

  // Get current board state from server (or fallback to initial position)
  const getCurrentFen = (): string => {
    return gameState?.chessState?.board || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  };

  // Helper function to get player's assigned color from server
  const getPlayerColor = (): 'w' | 'b' | null => {
    if (!gameState?.chessPlayers) return null;
    
    if (gameState.chessPlayers.player1Id === currentPlayer) return 'w';
    if (gameState.chessPlayers.player2Id === currentPlayer) return 'b';
    return null;
  };

  const canMakeMove = (): boolean => {
    // Game state checks
    if (!gameState.gameStarted) return false;
    if (gameState.gameOver) return false;
    if (!gameState.chessPlayers) return false;
    if (moveInProgress) return false; // Prevent moves while one is being processed

    // Player role checks
    const isChessPlayer = gameState.chessPlayers.player1Id === currentPlayer || 
                         gameState.chessPlayers.player2Id === currentPlayer;
    if (!isChessPlayer) return false;

    // Turn validation using SERVER state, not local chess.js
    // The server's currentTurn field should match the chess player whose turn it is
    const isMyTurn = gameState.currentTurn === currentPlayer;
    
    console.log('Turn check:', {
      serverCurrentTurn: gameState.currentTurn,
      currentPlayer: currentPlayer,
      isMyTurn: isMyTurn,
      boardFen: getCurrentFen()
    });
    
    return isMyTurn;
  };

  const isValidMove = (from: string, to: string): boolean => {
    try {
      // Use chess.js only for move validation, not state management
      const tempChess = new Chess(getCurrentFen());
      const move = tempChess.move({ from, to });
      return move !== null;
    } catch (error) {
      console.error('Error validating move:', error);
      return false;
    }
  };

  const handleMove = ({ sourceSquare, targetSquare }: { 
    sourceSquare: string; 
    targetSquare: string 
  }) => {
    // Early validation
    if (!canMakeMove()) {
      console.log('Move blocked: not player turn or game conditions not met');
      return null;
    }
    
    // Additional validation to prevent invalid moves from being sent
    if (!isValidMove(sourceSquare, targetSquare)) {
      console.log('Invalid move blocked:', sourceSquare, '->', targetSquare);
      return null;
    }
    
    console.log(`Attempting move: ${sourceSquare} -> ${targetSquare}`);
    
    // Check if it's a promotion move (pawn reaching end rank)
    let promotionChar = '';
    const currentFen = getCurrentFen();
    const tempChess = new Chess(currentFen);
    const piece = tempChess.get(sourceSquare as any);
    
    if (piece && piece.type === 'p') {
      const isPromotion = (piece.color === 'w' && targetSquare[1] === '8') || 
                         (piece.color === 'b' && targetSquare[1] === '1');
      if (isPromotion) {
        promotionChar = 'q'; // Always promote to queen for simplicity
      }
    }
    
    // Set move in progress to prevent multiple moves
    const moveString = `${sourceSquare}${targetSquare}${promotionChar}`;
    setMoveInProgress(true);
    setPendingMove(moveString);
    
    // Send move to server
    console.log('Move sent to server:', moveString);
    onChessMove(moveString);
    
    // Backup timeout to clear pending state if something goes wrong
    setTimeout(() => {
      console.log('Move timeout check - clearing if still pending:', moveString);
      setPendingMove(prev => prev === moveString ? null : prev);
      setMoveInProgress(prev => prev ? false : false);
    }, 3000); // Reduced to 3 seconds for better UX
    
    return true;
  };

  const getCurrentTurnDisplay = () => {
    if (gameState.gameOver) {
      if (gameState.winner === 'draw') {
        return 'Game Over! It\'s a draw!';
      }
      const winnerId = gameState.winner;
      const winnerName = playerIdToUsername[winnerId] || 
                        gameState.players.find((p: any) => p.id === winnerId)?.name || 
                        'Unknown';
      return `Game Over! Winner: ${winnerName}`;
    }
    
    if (!gameState.gameStarted) {
      return 'Waiting for game to start...';
    }
    
    if (!gameState.chessPlayers) {
      return 'Waiting for chess players to be selected...';
    }
    
    const isPlayer1 = gameState.chessPlayers.player1Id === currentPlayer;
    const isPlayer2 = gameState.chessPlayers.player2Id === currentPlayer;
    
    if (!isPlayer1 && !isPlayer2) {
      return 'You are spectating this chess game';
    }
    
    if (moveInProgress) {
      return 'Processing move...';
    }
    
    // Use SERVER turn state
    if (gameState.currentTurn === currentPlayer) {
      return 'Your turn to move';
    } else {
      const opponentId = isPlayer1 ? gameState.chessPlayers.player2Id : gameState.chessPlayers.player1Id;
      const opponentName = playerIdToUsername[opponentId] || 
                          gameState.players.find((p: any) => p.id === opponentId)?.name || 
                          'Opponent';
      
      // Determine color from server state
      const currentFen = getCurrentFen();
      const tempChess = new Chess(currentFen);
      const currentTurnColor = tempChess.turn() === 'w' ? 'White' : 'Black';
      
      return `${opponentName}'s turn (${currentTurnColor})`;
    }
  };

  const isDraggable = (): boolean => {
    return canMakeMove() && !moveInProgress;
  };

  const getPlayerNames = () => {
    if (!gameState.chessPlayers) return { white: '', black: '' };
    
    const whiteName = playerIdToUsername[gameState.chessPlayers.player1Id] || 
                     gameState.players.find((p: any) => p.id === gameState.chessPlayers.player1Id)?.name || 
                     'White';
    const blackName = playerIdToUsername[gameState.chessPlayers.player2Id] || 
                     gameState.players.find((p: any) => p.id === gameState.chessPlayers.player2Id)?.name || 
                     'Black';
    
    return { white: whiteName, black: blackName };
  };

  const getGameStatusInfo = () => {
    const currentFen = getCurrentFen();
    if (currentFen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
      return null; // Initial position, don't show info
    }
    
    try {
      const tempChess = new Chess(currentFen);
      return {
        inCheck: tempChess.inCheck(),
        moveNumber: tempChess.moveNumber(),
        currentTurn: tempChess.turn() === 'w' ? 'White' : 'Black'
      };
    } catch (error) {
      console.error('Error getting game status:', error);
      return null;
    }
  };

  const playerNames = getPlayerNames();
  const gameStatus = getGameStatusInfo();

  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* Fireworks component */}
      {showFireworks && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="animate-pulse text-6xl text-center mt-20">🎉🎊✨</div>
        </div>
      )}
      
      {/* Player names */}
      {gameState.chessPlayers && (
        <div className="w-full max-w-lg mb-2 flex justify-between text-sm">
          <div className="text-white">
            ♔ {playerNames.white} (White)
          </div>
          <div className="text-gray-400">
            ♚ {playerNames.black} (Black)
          </div>
        </div>
      )}
      
      <div className="w-full max-w-lg mb-4">
        <Chessboard
          position={getCurrentFen()}
          onDrop={handleMove}
          orientation={playerColor}
          draggable={isDraggable()}
          boardStyle={{
            borderRadius: '8px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
          }}
          width={500}
          transitionDuration={300}
        />
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-lg text-gray-300 font-medium">
          {getCurrentTurnDisplay()}
        </p>
        
        {pendingMove && (
          <p className="text-sm text-yellow-500">
            Move pending: {pendingMove}
          </p>
        )}
        
        {gameState.chessPlayers && 
         (gameState.chessPlayers.player1Id === currentPlayer || 
          gameState.chessPlayers.player2Id === currentPlayer) && (
          <p className="text-sm text-gray-500">
            You are playing as: {playerColor === 'white' ? 'White' : 'Black'}
          </p>
        )}
        
        {gameState.chessState?.moves?.length > 0 && (
          <p className="text-sm text-gray-500">
            Last move: {gameState.chessState.moves.slice(-1)[0]}
          </p>
        )}
        
        {/* Game status indicators based on server state */}
        {gameStatus && (
          <div className="text-xs text-gray-600 space-y-1">
            {gameStatus.inCheck && (
              <p className="text-yellow-500">Check!</p>
            )}
            <p>Move #{gameStatus.moveNumber}</p>
            <p>Turn: {gameStatus.currentTurn}</p>
          </div>
        )}
        
        {/* Debug info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-700 mt-4 p-2 bg-gray-800 rounded">
            <p>Server Turn: {gameState.currentTurn}</p>
            <p>Current Player: {currentPlayer}</p>
            <p>Can Move: {canMakeMove().toString()}</p>
            <p>Move In Progress: {moveInProgress.toString()}</p>
          </div>
        )}
      </div>
    </div>
  );
};


// import React, { useEffect, useState, useRef } from 'react';
// import Chessboard from 'chessboardjsx';
// import { Chess } from 'chess.js';

// interface GameRenderProps {
//   socket: any;
//   roomId: string;
//   currentPlayer: string;
//   gameState: any;
//   onChessMove: (move: string) => void;
//   playerIdToUsername: Record<string, string>;
// }

// export const ChessGame: React.FC<GameRenderProps> = ({ 
//   socket, 
//   roomId, 
//   currentPlayer, 
//   gameState, 
//   onChessMove,
//   playerIdToUsername
// }) => {
//   // Use a ref for the game instance to ensure it's the same reference
//   const gameRef = useRef(new Chess());
//   const [fen, setFen] = useState('start');
//   const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
//   const [showFireworks, setShowFireworks] = useState(false);

//   // Initialize chess game and set player color
//   useEffect(() => {
//     if (gameState?.chessState?.board) {
//       try {
//         console.log('Loading board from server:', gameState.chessState.board);
//         gameRef.current.load(gameState.chessState.board);
//         setFen(gameState.chessState.board); // Use server board state directly
//       } catch (e) {
//         console.error('Failed to load chess position:', e);
//       }
//     }

//     // Set player color based on chess player assignments
//     if (gameState?.chessPlayers) {
//       if (gameState.chessPlayers.player1Id === currentPlayer) {
//         setPlayerColor('white');
//       } else if (gameState.chessPlayers.player2Id === currentPlayer) {
//         setPlayerColor('black');
//       }
//     }
//   }, [gameState?.chessState?.board, gameState?.chessPlayers, currentPlayer]);

//   // Listen for board updates from the server
//   useEffect(() => {
//     if (!socket) return;

//     const handleChessBoardUpdate = (data: {
//       board: string;
//       move: string;
//       gameState: any;
//     }) => {
//       console.log('Received board update from server:', data);
      
//       try {
//         // Update the local chess instance with the new board state
//         gameRef.current.load(data.board);
//         setFen(data.board);
        
//         // Handle game over states
//         if (data.gameState.gameOver) {
//           setShowFireworks(true);
//         }
        
//       } catch (error) {
//         console.error('Error handling board update:', error);
//       }
//     };

//     socket.on('chessBoardUpdate', handleChessBoardUpdate);

//     // Cleanup function
//     return () => {
//       socket.off('chessBoardUpdate', handleChessBoardUpdate);
//     };
//   }, [socket]);

//   // Show fireworks when game ends
//   useEffect(() => {
//     if (gameState.gameOver && !showFireworks) {
//       setShowFireworks(true);
//     }
//   }, [gameState.gameOver, showFireworks]);

//   // Helper function to get player's assigned color
//   const getPlayerColor = (): 'w' | 'b' | null => {
//     if (!gameState?.chessPlayers) return null;
    
//     if (gameState.chessPlayers.player1Id === currentPlayer) return 'w';
//     if (gameState.chessPlayers.player2Id === currentPlayer) return 'b';
//     return null;
//   };

//   const canMakeMove = (): boolean => {
//     // Game state checks
//     if (!gameState.gameStarted) return false;
//     if (gameState.gameOver) return false;
//     if (!gameState.chessPlayers) return false;

//     // Player role checks
//     const isChessPlayer = gameState.chessPlayers.player1Id === currentPlayer || 
//                          gameState.chessPlayers.player2Id === currentPlayer;
//     if (!isChessPlayer) return false;

//     // Turn validation using chess.js turn state
//     const chessJSTurn = gameRef.current.turn(); // 'w' or 'b'
//     const playerChessColor = getPlayerColor();
    
//     const isMyTurn = playerChessColor === chessJSTurn;
//     console.log('Turn check:', {
//       chessJSTurn,
//       playerChessColor,
//       currentPlayer,
//       isMyTurn,
//       boardFen: gameRef.current.fen()
//     });
    
//     return isMyTurn;
//   };

//   const handleMove = ({ sourceSquare, targetSquare }: { 
//     sourceSquare: string; 
//     targetSquare: string 
//   }) => {
//     // Early validation - prevent even trying invalid moves
//     if (!canMakeMove()) {
//       console.log('Move blocked: not player turn');
//       return null;
//     }
    
//     try {
//       console.log(`Attempting move: ${sourceSquare} -> ${targetSquare}`);
      
//       // Create a backup of the current position
//       const currentFen = gameRef.current.fen();
      
//       // Create a move structure for both regular and promotion attempts
//       const moveAttempt = {
//         from: sourceSquare,
//         to: targetSquare,
//       };
      
//       // Try regular move first
//       let move = gameRef.current.move(moveAttempt);
//       let promotionChar = '';
      
//       // If failed, try with queen promotion (common case)
//       if (!move) {
//         const promotionMove = {
//           ...moveAttempt,
//           promotion: 'q'
//         };
        
//         move = gameRef.current.move(promotionMove);
//         if (move) promotionChar = 'q';
//       }
      
//       if (move) {
//         console.log('Move successful:', {
//           move: move.san,
//           newFen: gameRef.current.fen()
//         });
        
//         // Send move to server - server will handle the board update
//         onChessMove(`${sourceSquare}${targetSquare}${promotionChar}`);
        
//         // Revert to backup state - let server update be authoritative
//         gameRef.current.load(currentFen);
        
//         return move;
//       } else {
//         // Restore original position if move failed
//         gameRef.current.load(currentFen);
//         console.log('Invalid move, position restored');
//       }
//     } catch (e) {
//       console.error('Error making move:', e);
//       // Restore original position on error
//       const currentFen = gameRef.current.fen();
//       gameRef.current.load(currentFen);
//     }
//     return null;
//   };

//   const getCurrentTurnDisplay = () => {
//     if (gameState.gameOver) {
//       if (gameState.winner === 'draw') {
//         return 'Game Over! It\'s a draw!';
//       }
//       const winnerId = gameState.winner;
//       const winnerName = playerIdToUsername[winnerId] || 
//                         gameState.players.find((p: any) => p.id === winnerId)?.name || 
//                         'Unknown';
//       return `Game Over! Winner: ${winnerName}`;
//     }
    
//     if (!gameState.gameStarted) {
//       return 'Waiting for game to start...';
//     }
    
//     if (!gameState.chessPlayers) {
//       return 'Waiting for chess players to be selected...';
//     }
    
//     const isPlayer1 = gameState.chessPlayers.player1Id === currentPlayer;
//     const isPlayer2 = gameState.chessPlayers.player2Id === currentPlayer;
    
//     if (!isPlayer1 && !isPlayer2) {
//       return 'You are spectating this chess game';
//     }
    
//     // Use chess.js turn state for display
//     const chessJSTurn = gameRef.current.turn();
//     const playerChessColor = getPlayerColor();
    
//     if (playerChessColor === chessJSTurn) {
//       return 'Your turn to move';
//     } else {
//       const opponentId = isPlayer1 ? gameState.chessPlayers.player2Id : gameState.chessPlayers.player1Id;
//       const opponentName = playerIdToUsername[opponentId] || 
//                           gameState.players.find((p: any) => p.id === opponentId)?.name || 
//                           'Opponent';
//       const opponentColor = chessJSTurn === 'w' ? 'White' : 'Black';
//       return `${opponentName}'s turn (${opponentColor})`;
//     }
//   };

//   // Simplified draggable function
//   const isDraggable = (): boolean => {
//     return canMakeMove();
//   };

//   const getPlayerNames = () => {
//     if (!gameState.chessPlayers) return { white: '', black: '' };
    
//     const whiteName = playerIdToUsername[gameState.chessPlayers.player1Id] || 
//                      gameState.players.find((p: any) => p.id === gameState.chessPlayers.player1Id)?.name || 
//                      'White';
//     const blackName = playerIdToUsername[gameState.chessPlayers.player2Id] || 
//                      gameState.players.find((p: any) => p.id === gameState.chessPlayers.player2Id)?.name || 
//                      'Black';
    
//     return { white: whiteName, black: blackName };
//   };

//   const playerNames = getPlayerNames();

//   return (
//     <div className="flex flex-col items-center justify-center h-full">
//       {/* Fireworks component */}
//       {showFireworks && (
//         <div className="fixed inset-0 pointer-events-none z-50">
//           <div className="animate-pulse text-6xl text-center mt-20">🎉🎊✨</div>
//         </div>
//       )}
      
//       {/* Player names */}
//       {gameState.chessPlayers && (
//         <div className="w-full max-w-lg mb-2 flex justify-between text-sm">
//           <div className="text-white">
//             ♔ {playerNames.white} (White)
//           </div>
//           <div className="text-gray-400">
//             ♚ {playerNames.black} (Black)
//           </div>
//         </div>
//       )}
      
//       <div className="w-full max-w-lg mb-4">
//         <Chessboard
//           position={fen}
//           onDrop={handleMove}
//           orientation={playerColor}
//           draggable={isDraggable()}
//           boardStyle={{
//             borderRadius: '8px',
//             boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
//           }}
//           width={500}
//           transitionDuration={300}
//         />
//       </div>
      
//       <div className="text-center space-y-2">
//         <p className="text-lg text-gray-300 font-medium">
//           {getCurrentTurnDisplay()}
//         </p>
        
//         {gameState.chessPlayers && 
//          (gameState.chessPlayers.player1Id === currentPlayer || 
//           gameState.chessPlayers.player2Id === currentPlayer) && (
//           <p className="text-sm text-gray-500">
//             You are playing as: {playerColor === 'white' ? 'White' : 'Black'}
//           </p>
//         )}
        
//         {gameState.chessState?.moves?.length > 0 && (
//           <p className="text-sm text-gray-500">
//             Last move: {gameState.chessState.moves.slice(-1)[0]}
//           </p>
//         )}
        
//         {/* Game status indicators */}
//         {gameRef.current && gameRef.current.fen() !== 'start' && (
//           <div className="text-xs text-gray-600 space-y-1">
//             {gameRef.current.inCheck() && (
//               <p className="text-yellow-500">Check!</p>
//             )}
//             <p>Move #{gameRef.current.moveNumber()}</p>
//             <p>Turn: {gameRef.current.turn() === 'w' ? 'White' : 'Black'}</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };