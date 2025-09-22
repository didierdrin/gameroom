import React, { useEffect, useState, useRef } from 'react';
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
  console.log('ChessGame initialized for room:', roomId);
  
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [showFireworks, setShowFireworks] = useState(false);
  const [pendingMove, setPendingMove] = useState<string | null>(null);
  const [moveInProgress, setMoveInProgress] = useState(false);
  const pendingMoveRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (!socket) return;

    const handleChessBoardUpdate = (data: {
      board: string;
      move: string;
      gameState: any;
    }) => {
      console.log('Received chessBoardUpdate from server:', data);
      console.log('Clearing pending move state due to server update');
      setPendingMove(null);
      setMoveInProgress(false);
      pendingMoveRef.current = null;
      
      if (data.gameState?.gameOver) {
        console.log('Game over detected from server update');
        setShowFireworks(true);
      }
    };

    const handleGameState = (gameStateUpdate: any) => {
      console.log('Received gameState update:', gameStateUpdate);
      if (gameStateUpdate.gameType === 'chess' && gameStateUpdate.chessState?.board) {
        console.log('Clearing pending move state due to gameState update with board');
        setPendingMove(null);
        setMoveInProgress(false);
        pendingMoveRef.current = null;
      }
    };

    // Handle move confirmation from server
    const handleMoveResponse = (response: any) => {
      console.log('Received move response:', response);
      if (response.success && response.move === pendingMoveRef.current) {
        setPendingMove(null);
        setMoveInProgress(false);
        pendingMoveRef.current = null;
        console.log('Move confirmed by server');
      } else if (!response.success) {
        // Handle move rejection
        setPendingMove(null);
        setMoveInProgress(false);
        pendingMoveRef.current = null;
        console.log('Move rejected by server:', response.message);
        alert(`Move rejected: ${response.message || 'Unknown error'}`);
      }
    };

    // Handle server errors to clear pending state
    const handleError = (err: { message: string; type?: string }) => {
      console.log('Received error from server:', err);
      if (err.type === 'chessMoveError') {
        setPendingMove(null);
        setMoveInProgress(false);
        pendingMoveRef.current = null;
        // Show error to user
        alert(`Move failed: ${err.message}`);
      }
    };

    socket.on('chessBoardUpdate', handleChessBoardUpdate);
    socket.on('gameState', handleGameState);
    socket.on('chessMove', handleMoveResponse);
    socket.on('error', handleError);

    return () => {
      socket.off('chessBoardUpdate', handleChessBoardUpdate);
      socket.off('gameState', handleGameState);
      socket.off('chessMove', handleMoveResponse);
      socket.off('error', handleError);
    };
  }, [socket, pendingMove, moveInProgress]);

  // Show fireworks when game ends
  useEffect(() => {
    if (gameState?.gameOver && !showFireworks) {
      setShowFireworks(true);
    }
  }, [gameState?.gameOver, showFireworks]);

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

  // Simplified canMakeMove function - rely more on server validation
  const canMakeMove = (): boolean => {
    console.log('Checking canMakeMove with state:', {
      gameStarted: gameState?.gameStarted,
      gameOver: gameState?.gameOver,
      hasChessPlayers: !!gameState?.chessPlayers,
      currentTurn: gameState?.currentTurn,
      currentPlayer,
      moveInProgress,
      isPlayer1: gameState?.chessPlayers?.player1Id === currentPlayer,
      isPlayer2: gameState?.chessPlayers?.player2Id === currentPlayer
    });

    // Basic game state checks
    if (!gameState?.gameStarted) {
      console.log('Game not started');
      return false;
    }
    if (gameState?.gameOver) {
      console.log('Game is over');
      return false;
    }
    if (!gameState?.chessPlayers) {
      console.log('No chess players assigned');
      return false;
    }
    if (moveInProgress) {
      console.log('Move already in progress');
      return false;
    }

    // Player role checks
    const isChessPlayer = gameState.chessPlayers.player1Id === currentPlayer || 
                         gameState.chessPlayers.player2Id === currentPlayer;
    if (!isChessPlayer) {
      console.log('Not a chess player');
      return false;
    }

    // Turn validation - simplified to trust server state more
    const isMyTurn = gameState.currentTurn === currentPlayer;
    console.log('Turn check result:', { isMyTurn, serverTurn: gameState.currentTurn, myId: currentPlayer });
    
    return isMyTurn;
  };

  const isValidMove = (from: string, to: string): boolean => {
    try {
      // Use chess.js only for basic move validation
      const tempChess = new Chess(getCurrentFen());
      const move = tempChess.move({ from, to });
      return move !== null;
    } catch (error) {
      console.error('Error validating move:', error);
      return false;
    }
  };

  // Enhanced handleMove function with better validation and error handling
  const handleMove = ({ sourceSquare, targetSquare }: { 
    sourceSquare: string; 
    targetSquare: string 
  }) => {
    console.log(`Move attempt: ${sourceSquare} -> ${targetSquare}`);
    console.log('Current game state for move:', {
      gameStarted: gameState?.gameStarted,
      gameOver: gameState?.gameOver,
      currentTurn: gameState?.currentTurn,
      currentPlayer,
      canMove: canMakeMove()
    });

    // Early validation
    if (!canMakeMove()) {
      console.log('Move blocked: canMakeMove returned false');
      return null;
    }
    
    // Validate move format
    if (!sourceSquare || !targetSquare || sourceSquare === targetSquare) {
      console.log('Invalid move: same source and target squares');
      return null;
    }
    
    // Additional validation to prevent invalid moves from being sent
    if (!isValidMove(sourceSquare, targetSquare)) {
      console.log('Invalid move blocked by chess.js validation:', sourceSquare, '->', targetSquare);
      return null;
    }
    
    console.log(`Valid move detected: ${sourceSquare} -> ${targetSquare}`);
    
    try {
      // Check if it's a promotion move
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
      pendingMoveRef.current = moveString;
      
      // Send move to server
      console.log('Sending move to server:', moveString);
      onChessMove(moveString);
      
      // Backup timeout to clear pending state if something goes wrong
      const timeoutId = setTimeout(() => {
        console.log('Move timeout - clearing pending state for:', moveString);
        if (pendingMoveRef.current === moveString) {
          setPendingMove(null);
          setMoveInProgress(false);
          pendingMoveRef.current = null;
          console.warn('Move timed out - server did not respond');
        }
      }, 8000); // Increased timeout for slower connections
      
      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error processing move:', error);
      setMoveInProgress(false);
      setPendingMove(null);
      pendingMoveRef.current = null;
      return null;
    }
  };

  const getCurrentTurnDisplay = () => {
    if (gameState?.gameOver) {
      if (gameState.winner === 'draw') {
        return 'Game Over! It\'s a draw!';
      }
      const winnerId = gameState.winner;
      const winnerName = playerIdToUsername[winnerId] || 
                        gameState.players?.find((p: any) => p.id === winnerId)?.name || 
                        'Unknown';
      return `Game Over! Winner: ${winnerName}`;
    }
    
    if (!gameState?.gameStarted) {
      return 'Waiting for game to start...';
    }
    
    if (!gameState?.chessPlayers) {
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
                          gameState.players?.find((p: any) => p.id === opponentId)?.name || 
                          'Opponent';
      
      // Determine color from server state
      try {
        const currentFen = getCurrentFen();
        const tempChess = new Chess(currentFen);
        const currentTurnColor = tempChess.turn() === 'w' ? 'White' : 'Black';
        return `${opponentName}'s turn (${currentTurnColor})`;
      } catch (error) {
        console.error('Error determining turn color:', error);
        return `${opponentName}'s turn`;
      }
    }
  };

  const isDraggable = (): boolean => {
    const draggable = canMakeMove() && !moveInProgress;
    console.log('isDraggable result:', draggable);
    return draggable;
  };

  const getPlayerNames = () => {
    if (!gameState?.chessPlayers) return { white: '', black: '' };
    
    const whiteName = playerIdToUsername[gameState.chessPlayers.player1Id] || 
                     gameState.players?.find((p: any) => p.id === gameState.chessPlayers.player1Id)?.name || 
                     'White';
    const blackName = playerIdToUsername[gameState.chessPlayers.player2Id] || 
                     gameState.players?.find((p: any) => p.id === gameState.chessPlayers.player2Id)?.name || 
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
        currentTurn: tempChess.turn() === 'w' ? 'White' : 'Black',
        isGameOver: tempChess.isGameOver(),
        isCheckmate: tempChess.isCheckmate(),
        isStalemate: tempChess.isStalemate()
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
      {gameState?.chessPlayers && (
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
        
        {gameState?.chessPlayers && 
         (gameState.chessPlayers.player1Id === currentPlayer || 
          gameState.chessPlayers.player2Id === currentPlayer) && (
          <p className="text-sm text-gray-500">
            You are playing as: {playerColor === 'white' ? 'White' : 'Black'}
          </p>
        )}
        
        {/* Move history display */}
        {gameState?.chessState?.moves?.length > 0 && (
          <div className="text-sm text-gray-500">
            <p className="font-medium">Last move: {gameState.chessState.moves.slice(-1)[0]}</p>
            {gameState.chessState.moves.length > 1 && (
              <p className="text-xs text-gray-600">
                Total moves: {gameState.chessState.moves.length}
              </p>
            )}
          </div>
        )}
        
        {/* Game status indicators based on server state */}
        {gameStatus && (
          <div className="text-xs text-gray-600 space-y-1">
            {gameStatus.inCheck && (
              <p className="text-yellow-500 font-bold">Check!</p>
            )}
            {gameStatus.isCheckmate && (
              <p className="text-red-500 font-bold">Checkmate!</p>
            )}
            {gameStatus.isStalemate && (
              <p className="text-blue-500 font-bold">Stalemate!</p>
            )}
            <p>Move #{gameStatus.moveNumber}</p>
            <p>Turn: {gameStatus.currentTurn}</p>
            {gameStatus.isGameOver && (
              <p className="text-orange-500">Game Over (by rules)</p>
            )}
          </div>
        )}
        
        {/* Move history for recent moves */}
        {gameState?.chessState?.moves?.length > 0 && gameState.chessState.moves.length <= 10 && (
          <div className="text-xs text-gray-600 mt-2">
            <p className="font-medium mb-1">Recent moves:</p>
            <div className="flex flex-wrap gap-1">
              {gameState.chessState.moves.slice(-5).map((move: string, index: number) => (
                <span key={index} className="bg-gray-700 px-2 py-1 rounded">
                  {move}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Debug info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-700 mt-4 p-2 bg-gray-800 rounded">
            <p>Server Turn: {gameState?.currentTurn}</p>
            <p>Current Player: {currentPlayer}</p>
            <p>Can Move: {canMakeMove().toString()}</p>
            <p>Move In Progress: {moveInProgress.toString()}</p>
            <p>Game Started: {gameState?.gameStarted?.toString()}</p>
            <p>Game Over: {gameState?.gameOver?.toString()}</p>
            <p>Player1: {gameState?.chessPlayers?.player1Id}</p>
            <p>Player2: {gameState?.chessPlayers?.player2Id}</p>
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
//   // roomId is used for socket room management in the parent component
//   console.log('ChessGame initialized for room:', roomId);
//   // REMOVED: Local chess game instance and fen state
//   // We now rely entirely on server state
  
//   const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
//   const [showFireworks, setShowFireworks] = useState(false);
//   const [pendingMove, setPendingMove] = useState<string | null>(null);
//   const [moveInProgress, setMoveInProgress] = useState(false);
//   const pendingMoveRef = useRef<string | null>(null);

//   // Set player color based on chess player assignments
//   useEffect(() => {
//     if (gameState?.chessPlayers) {
//       if (gameState.chessPlayers.player1Id === currentPlayer) {
//         setPlayerColor('white');
//       } else if (gameState.chessPlayers.player2Id === currentPlayer) {
//         setPlayerColor('black');
//       }
//     }
//   }, [gameState?.chessPlayers, currentPlayer]);

//   useEffect(() => {
//     if (!socket) return;

//     const handleChessBoardUpdate = (data: {
//       board: string;
//       move: string;
//       gameState: any;
//     }) => {
//       console.log('Received chessBoardUpdate from server:', (data));
//       console.log('Clearing pending move state due to server update');
//       setPendingMove(null);
//       setMoveInProgress(false);
//       pendingMoveRef.current = null;
//       if (data.gameState.gameOver) {
//         setShowFireworks(true);
//       }
//     };

//     const handleGameState = (gameStateUpdate: any) => {
//       console.log('Received gameState update:', (gameStateUpdate));
//       if (gameStateUpdate.gameType === 'chess' && gameStateUpdate.chessState?.board) {
//         console.log('Clearing pending move state due to gameState update with board');
//         setPendingMove(null);
//         setMoveInProgress(false);
//         pendingMoveRef.current = null;
//       }
//     };

//     // Handle move confirmation from server
//     const handleMoveResponse = (response: any) => {
//       console.log('Received move response:', response);
//       if (response.success && response.move === pendingMoveRef.current) {
//         setPendingMove(null);
//         setMoveInProgress(false);
//         pendingMoveRef.current = null;
//         console.log('Move confirmed by server');
//       } else if (!response.success) {
//         // Handle move rejection
//         setPendingMove(null);
//         setMoveInProgress(false);
//         pendingMoveRef.current = null;
//         console.log('Move rejected by server:', response.message);
//         alert(`Move rejected: ${response.message || 'Unknown error'}`);
//       }
//     };

//     // Handle server errors to clear pending state
//     const handleError = (err: { message: string; type?: string }) => {
//       console.log('Received error from server:', err);
//       if (err.type === 'chessMoveError') {
//         setPendingMove(null);
//         setMoveInProgress(false);
//         pendingMoveRef.current = null;
//         // Show error to user
//         alert(`Move failed: ${err.message}`);
//       }
//     };

//     socket.on('chessBoardUpdate', handleChessBoardUpdate);
//     socket.on('gameState', handleGameState);
//     socket.on('chessMove', handleMoveResponse);
//     socket.on('error', handleError);

//     return () => {
//       socket.off('chessBoardUpdate', handleChessBoardUpdate);
//       socket.off('gameState', handleGameState);
//       socket.off('chessMove', handleMoveResponse);
//       socket.off('error', handleError);
//     };
//   }, [socket, pendingMove, moveInProgress]);

//   // Show fireworks when game ends
//   useEffect(() => {
//     if (gameState.gameOver && !showFireworks) {
//       setShowFireworks(true);
//     }
//   }, [gameState.gameOver, showFireworks]);

//   // Get current board state from server (or fallback to initial position)
//   const getCurrentFen = (): string => {
//     return gameState?.chessState?.board || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
//   };

//   // Helper function to get player's assigned color from server
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
//     if (moveInProgress) return false;
  
//     // Player role checks
//     const isChessPlayer = gameState.chessPlayers.player1Id === currentPlayer || 
//                          gameState.chessPlayers.player2Id === currentPlayer;
//     if (!isChessPlayer) return false;
  
//     // Turn validation using SERVER state
//     const isMyTurn = gameState.currentTurn === currentPlayer;
    
//     // Additional validation: check if the move would be for the correct color
//     if (isMyTurn) {
//       try {
//         const currentFen = getCurrentFen();
//         const tempChess = new Chess(currentFen);
//         const playerColor = getPlayerColor();
        
//         if (playerColor && tempChess.turn() !== playerColor) {
//           console.log('Move blocked: not the correct color to move');
//           return false;
//         }
//       } catch (error) {
//         console.error('Error validating turn:', error);
//         return false;
//       }
//     }
    
//     return isMyTurn;
//   };

//   const isValidMove = (from: string, to: string): boolean => {
//     try {
//       // Use chess.js only for move validation, not state management
//       const tempChess = new Chess(getCurrentFen());
//       const move = tempChess.move({ from, to });
//       return move !== null;
//     } catch (error) {
//       console.error('Error validating move:', error);
//       return false;
//     }
//   };


//   // Enhanced handleMove function with better validation and error handling
// const handleMove = ({ sourceSquare, targetSquare }: { 
//   sourceSquare: string; 
//   targetSquare: string 
// }) => {
//   // Early validation
//   if (!canMakeMove()) {
//     console.log('Move blocked: not player turn or game conditions not met');
//     return null;
//   }
  
//   // Validate move format
//   if (!sourceSquare || !targetSquare || sourceSquare === targetSquare) {
//     console.log('Invalid move: same source and target squares');
//     return null;
//   }
  
//   // Additional validation to prevent invalid moves from being sent
//   if (!isValidMove(sourceSquare, targetSquare)) {
//     console.log('Invalid move blocked:', sourceSquare, '->', targetSquare);
//     return null;
//   }
  
//   console.log(`Attempting move: ${sourceSquare} -> ${targetSquare}`);
  
//   try {
//     // Check if it's a promotion move
//     let promotionChar = '';
//     const currentFen = getCurrentFen();
//     const tempChess = new Chess(currentFen);
//     const piece = tempChess.get(sourceSquare as any);
    
//     if (piece && piece.type === 'p') {
//       const isPromotion = (piece.color === 'w' && targetSquare[1] === '8') || 
//                          (piece.color === 'b' && targetSquare[1] === '1');
//       if (isPromotion) {
//         promotionChar = 'q'; // Always promote to queen for simplicity
//       }
//     }
    
//     // Set move in progress to prevent multiple moves
//     const moveString = `${sourceSquare}${targetSquare}${promotionChar}`;
//     setMoveInProgress(true);
//     setPendingMove(moveString);
//     pendingMoveRef.current = moveString;
    
//     // Send move to server
//     console.log('Move sent to server:', moveString);
//     onChessMove(moveString);
    
//     // Backup timeout to clear pending state if something goes wrong
//     const timeoutId = setTimeout(() => {
//       console.log('Move timeout check - clearing if still pending:', moveString);
//       if (pendingMoveRef.current === moveString) {
//         setPendingMove(null);
//         setMoveInProgress(false);
//         pendingMoveRef.current = null;
//         console.warn('Move timed out - server did not respond');
//       }
//     }, 5000); // 5 seconds timeout
    
//     return () => clearTimeout(timeoutId);
//   } catch (error) {
//     console.error('Error processing move:', error);
//     return null;
//   }
// };


//   // const handleMove = ({ sourceSquare, targetSquare }: { 
//   //   sourceSquare: string; 
//   //   targetSquare: string 
//   // }) => {
//   //   // Early validation
//   //   if (!canMakeMove()) {
//   //     console.log('Move blocked: not player turn or game conditions not met');
//   //     return null;
//   //   }
    
//   //   // Additional validation to prevent invalid moves from being sent
//   //   if (!isValidMove(sourceSquare, targetSquare)) {
//   //     console.log('Invalid move blocked:', sourceSquare, '->', targetSquare);
//   //     return null;
//   //   }
    
//   //   console.log(`Attempting move: ${sourceSquare} -> ${targetSquare}`);
    
//   //   // Check if it's a promotion move (pawn reaching end rank)
//   //   let promotionChar = '';
//   //   const currentFen = getCurrentFen();
//   //   const tempChess = new Chess(currentFen);
//   //   const piece = tempChess.get(sourceSquare as any);
    
//   //   if (piece && piece.type === 'p') {
//   //     const isPromotion = (piece.color === 'w' && targetSquare[1] === '8') || 
//   //                        (piece.color === 'b' && targetSquare[1] === '1');
//   //     if (isPromotion) {
//   //       promotionChar = 'q'; // Always promote to queen for simplicity
//   //     }
//   //   }
    
//   //   // Set move in progress to prevent multiple moves
//   //   const moveString = `${sourceSquare}${targetSquare}${promotionChar}`;
//   //   setMoveInProgress(true);
//   //   setPendingMove(moveString);
    
//   //   // Send move to server
//   //   console.log('Move sent to server:', moveString);
//   //   onChessMove(moveString);
    
//   //   // Backup timeout to clear pending state if something goes wrong
//   //   setTimeout(() => {
//   //     console.log('Move timeout check - clearing if still pending:', moveString);
//   //     setPendingMove(prev => prev === moveString ? null : prev);
//   //     setMoveInProgress(prev => prev ? false : false);
//   //   }, 3000); // Reduced to 3 seconds for better UX
    
//   //   return true;
//   // };

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
    
//     if (moveInProgress) {
//       return 'Processing move...';
//     }
    
//     // Use SERVER turn state
//     if (gameState.currentTurn === currentPlayer) {
//       return 'Your turn to move';
//     } else {
//       const opponentId = isPlayer1 ? gameState.chessPlayers.player2Id : gameState.chessPlayers.player1Id;
//       const opponentName = playerIdToUsername[opponentId] || 
//                           gameState.players.find((p: any) => p.id === opponentId)?.name || 
//                           'Opponent';
      
//       // Determine color from server state
//       try {
//         const currentFen = getCurrentFen();
//         const tempChess = new Chess(currentFen);
//         const currentTurnColor = tempChess.turn() === 'w' ? 'White' : 'Black';
//         return `${opponentName}'s turn (${currentTurnColor})`;
//       } catch (error) {
//         console.error('Error determining turn color:', error);
//         return `${opponentName}'s turn`;
//       }
//     }
//   };

//   const isDraggable = (): boolean => {
//     return canMakeMove() && !moveInProgress;
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

//   const getGameStatusInfo = () => {
//     const currentFen = getCurrentFen();
//     if (currentFen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
//       return null; // Initial position, don't show info
//     }
    
//     try {
//       const tempChess = new Chess(currentFen);
//       return {
//         inCheck: tempChess.inCheck(),
//         moveNumber: tempChess.moveNumber(),
//         currentTurn: tempChess.turn() === 'w' ? 'White' : 'Black'
//       };
//     } catch (error) {
//       console.error('Error getting game status:', error);
//       return null;
//     }
//   };

//   const playerNames = getPlayerNames();
//   const gameStatus = getGameStatusInfo();

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
//           position={getCurrentFen()}
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
        
//         {pendingMove && (
//           <p className="text-sm text-yellow-500">
//             Move pending: {pendingMove}
//           </p>
//         )}
        
//         {gameState.chessPlayers && 
//          (gameState.chessPlayers.player1Id === currentPlayer || 
//           gameState.chessPlayers.player2Id === currentPlayer) && (
//           <p className="text-sm text-gray-500">
//             You are playing as: {playerColor === 'white' ? 'White' : 'Black'}
//           </p>
//         )}
        
//         {/* Move history display */}
//         {gameState.chessState?.moves?.length > 0 && (
//           <div className="text-sm text-gray-500">
//             <p className="font-medium">Last move: {gameState.chessState.moves.slice(-1)[0]}</p>
//             {gameState.chessState.moves.length > 1 && (
//               <p className="text-xs text-gray-600">
//                 Total moves: {gameState.chessState.moves.length}
//               </p>
//             )}
//           </div>
//         )}
        
//         {/* Game status indicators based on server state */}
//         {gameStatus && (
//           <div className="text-xs text-gray-600 space-y-1">
//             {gameStatus.inCheck && (
//               <p className="text-yellow-500 font-bold">Check!</p>
//             )}
//             <p>Move #{gameStatus.moveNumber}</p>
//             <p>Turn: {gameStatus.currentTurn}</p>
//           </div>
//         )}
        
//         {/* Move history for recent moves */}
//         {gameState.chessState?.moves?.length > 0 && gameState.chessState.moves.length <= 10 && (
//           <div className="text-xs text-gray-600 mt-2">
//             <p className="font-medium mb-1">Recent moves:</p>
//             <div className="flex flex-wrap gap-1">
//               {gameState.chessState.moves.slice(-5).map((move: string, index: number) => (
//                 <span key={index} className="bg-gray-700 px-2 py-1 rounded">
//                   {move}
//                 </span>
//               ))}
//             </div>
//           </div>
//         )}
        
//         {/* Debug info (remove in production) */}
//         {process.env.NODE_ENV === 'development' && (
//           <div className="text-xs text-gray-700 mt-4 p-2 bg-gray-800 rounded">
//             <p>Server Turn: {gameState.currentTurn}</p>
//             <p>Current Player: {currentPlayer}</p>
//             <p>Can Move: {canMakeMove().toString()}</p>
//             <p>Move In Progress: {moveInProgress.toString()}</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

