import React, { useEffect, useState, useCallback, useRef } from 'react';
import Chessboard from 'chessboardjsx';
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
  const [fen, setFen] = useState('start');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [showFireworks, setShowFireworks] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [lastMoveTime, setLastMoveTime] = useState<number>(0);
  const [pendingMove, setPendingMove] = useState<string | null>(null);
  
  // Ref to track the latest game state
  const gameStateRef = useRef(gameState);
  const currentPlayerRef = useRef(currentPlayer);
  const pendingMoveRef = useRef<string | null>(null);

  // Update refs when props change
  useEffect(() => {
    gameStateRef.current = gameState;
    currentPlayerRef.current = currentPlayer;
    console.log('Updated refs:', {
      gameStateExists: !!gameState,
      chessStateExists: !!gameState?.chessState,
      currentPlayer,
      timestamp: new Date().toISOString()
    });
  }, [gameState, currentPlayer]);

  // Update pending move ref
  useEffect(() => {
    pendingMoveRef.current = pendingMove;
  }, [pendingMove]);

  // Handle game state updates from server
  useEffect(() => {
    if (!gameState) {
      console.warn('Game state is undefined. Skipping update.');
      setFen('start');
      setIsMyTurn(false);
      setPendingMove(null);
      return;
    }

    if (!gameState.chessState) {
      console.warn('Chess state is undefined. Using default FEN.');
      const defaultFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      setFen(defaultFen);
      setIsMyTurn(false);
      setPendingMove(null);
      return;
    }

    console.log('=== CHESS FRONTEND STATE UPDATE ===');
    console.log('Received game state:', {
      currentTurn: gameState?.currentTurn,
      currentPlayer,
      chessState: gameState?.chessState,
      players: gameState?.players?.map((p: any) => ({ 
        id: p.id, 
        name: p.name, 
        chessColor: p.chessColor 
      })),
      gameStarted: gameState?.gameStarted,
      gameOver: gameState?.gameOver,
      timestamp: new Date().toISOString()
    });

    // Sync board state
    const newFen = gameState.chessState.board || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    if (fen !== newFen) {
      console.log('📋 Board FEN update:', {
        old: fen,
        new: newFen,
        same: fen === newFen
      });
      setFen(newFen);
      
      // CRITICAL FIX: Clear pending move when board updates from server
      // This indicates the move was processed successfully
      if (pendingMove) {
        console.log('🔄 Clearing pending move due to board update:', pendingMove);
        setPendingMove(null);
      }
    }

    // Update player color
    const player = gameState?.players?.find((p: any) => p.id === currentPlayer);
    if (player?.chessColor && playerColor !== player.chessColor) {
      console.log('🎨 Player color updated:', {
        old: playerColor,
        new: player.chessColor
      });
      setPlayerColor(player.chessColor);
    }

    // Update turn
    const serverCurrentTurn = gameState?.currentTurn;
    const gameStarted = gameState?.gameStarted;
    const gameOver = gameState?.gameOver;
    
    const myTurn = serverCurrentTurn === currentPlayer && gameStarted && !gameOver;
    
    console.log('🔄 Turn validation:', {
      playerId: currentPlayer,
      serverCurrentTurn,
      gameStarted,
      gameOver,
      calculatedIsMyTurn: myTurn,
      previousIsMyTurn: isMyTurn,
      pendingMove
    });
    
    setIsMyTurn(myTurn);

  }, [gameState, currentPlayer, fen, playerColor, isMyTurn, pendingMove]);

  // Show fireworks when game ends
  useEffect(() => {
    if (gameState?.gameOver && !showFireworks) {
      console.log('🎆 Game over - showing fireworks');
      setShowFireworks(true);
    }
  }, [gameState?.gameOver, showFireworks]);

  // Handle chess moves and errors
  useEffect(() => {
    const handleChessMove = (data: any) => {
      console.log('✅ Chess move confirmed from server:', {
        move: data.move,
        playerId: data.playerId,
        timestamp: data.timestamp,
        success: data.success,
        currentPendingMove: pendingMoveRef.current
      });
      
      // Clear pending move if this matches our pending move
      if (pendingMoveRef.current && data.success) {
        console.log('🔄 Clearing confirmed pending move:', pendingMoveRef.current);
        setPendingMove(null);
      }
      
      setLastMoveTime(Date.now());
    };

    const handleChessMoveError = (error: any) => {
      console.error('❌ Chess move error from server:', {
        error: error.message,
        move: error.move,
        playerId: error.playerId,
        timestamp: error.timestamp,
        currentPendingMove: pendingMoveRef.current
      });
      
      // Always clear pending move on error
      if (pendingMoveRef.current) {
        console.log('🔄 Clearing pending move due to error:', pendingMoveRef.current);
        setPendingMove(null);
      }
      
      // Reset board to last known valid state
      const lastKnownFen = gameStateRef.current?.chessState?.board || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      console.log('🔄 Forcing board refresh after error to:', lastKnownFen);
      setFen(lastKnownFen);
      
      alert(`Chess move failed: ${error.message || 'Invalid move'}`);
    };

    const handleGameState = (newGameState: any) => {
      console.log('🔄 Game state update received via socket:', {
        currentTurn: newGameState?.currentTurn,
        gameOver: newGameState?.gameOver,
        boardChanged: newGameState?.chessState?.board !== gameStateRef.current?.chessState?.board
      });
      
      // Clear pending move if game state indicates move was processed
      if (pendingMoveRef.current && newGameState?.chessState?.board !== gameStateRef.current?.chessState?.board) {
        console.log('🔄 Clearing pending move due to game state update');
        setPendingMove(null);
      }
    };

    if (socket) {
      socket.on('chessMove', handleChessMove);
      socket.on('chessMoveError', handleChessMoveError);
      socket.on('gameState', handleGameState);

      return () => {
        socket.off('chessMove', handleChessMove);
        socket.off('chessMoveError', handleChessMoveError);
        socket.off('gameState', handleGameState);
      };
    }
  }, [socket]);

  // Enhanced move handler with timeout fallback
  const handleMove = useCallback(({ sourceSquare, targetSquare }: { 
    sourceSquare: string; 
    targetSquare: string 
  }) => {
    if (!gameStateRef.current) {
      console.warn('Game state ref is undefined. Move canceled.');
      return null;
    }

    if (!gameStateRef.current.chessState) {
      console.warn('Chess state is undefined. Move canceled.');
      return null;
    }

    if (!isMyTurn) {
      console.warn('Not your turn. Move canceled.');
      return null;
    }

    console.log('=== CHESS MOVE ATTEMPT ===');
    
    const currentGameState = gameStateRef.current;
    const currentPlayerId = currentPlayerRef.current;
    const moveString = `${sourceSquare}${targetSquare}`;
    
    console.log('Move attempt details:', {
      from: sourceSquare,
      to: targetSquare,
      moveString,
      currentPlayerId,
      serverCurrentTurn: currentGameState?.currentTurn,
      isMyTurn,
      gameOver: currentGameState?.gameOver,
      gameStarted: currentGameState?.gameStarted,
      pendingMove: pendingMoveRef.current,
      timestamp: new Date().toISOString()
    });

    // Prevent rapid moves
    const now = Date.now();
    if (now - lastMoveTime < 300) {
      console.log('❌ Move blocked - too rapid (300ms cooldown)');
      return null;
    }

    // Prevent moves while another is pending
    if (pendingMoveRef.current) {
      console.log('❌ Move blocked - another move is pending:', pendingMoveRef.current);
      return null;
    }

    // Client-side validation
    if (currentGameState?.gameOver) {
      console.log('❌ Move blocked - game is over');
      return null;
    }

    if (!currentGameState?.gameStarted) {
      console.log('❌ Move blocked - game not started');
      return null;
    }

    if (!/^[a-h][1-8][a-h][1-8]$/.test(moveString)) {
      console.log('❌ Move blocked - invalid format:', moveString);
      return null;
    }

    console.log('✅ Move validation passed - sending to server');
    
    try {
      setPendingMove(moveString);
      onChessMove(moveString);
      setLastMoveTime(now);
      
      // CRITICAL FIX: Add timeout fallback to clear pending move
      const timeoutId = setTimeout(() => {
        if (pendingMoveRef.current === moveString) {
          console.warn('⚠️ Timeout: Clearing pending move after 10 seconds:', moveString);
          setPendingMove(null);
        }
      }, 10000); // 10 second timeout
      
      console.log('📤 Move sent to server:', {
        move: moveString,
        timestamp: new Date().toISOString(),
        timeoutSet: true
      });
      
      // Store timeout ID for potential cleanup
      (window as any).chessMoveTimeout = timeoutId;
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send move:', error);
      setPendingMove(null);
      return null;
    }
  }, [isMyTurn, onChessMove, lastMoveTime]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if ((window as any).chessMoveTimeout) {
        clearTimeout((window as any).chessMoveTimeout);
      }
    };
  }, []);

  // Get current turn display text
  const getCurrentTurnText = () => {
    if (gameState?.gameOver) {
      if (gameState.winner === 'draw') {
        return `Game Over - Draw (${gameState.winCondition || 'unknown reason'})`;
      }
      const winnerPlayer = gameState?.players?.find((p: any) => p.id === gameState.winner);
      const winnerName = winnerPlayer?.name || gameState.winner;
      return `Game Over! Winner: ${winnerName}`;
    }
    
    if (!gameState?.gameStarted) {
      return 'Game not started';
    }
    
    if (pendingMove) {
      return 'Move in progress...';
    }
    
    if (isMyTurn) {
      return 'Your turn';
    }
    
    // Find the current player's name
    const currentTurnPlayer = gameState?.players?.find((p: any) => p.id === gameState.currentTurn);
    const opponentName = currentTurnPlayer?.name || 'Opponent';
    
    return `${opponentName}'s turn`;
  };

  // Get move count
  const getMoveCount = () => {
    const moves = gameState?.chessState?.moves || [];
    return Math.ceil(moves.length / 2);
  };

  // Get turn indicator color
  const getTurnIndicatorColor = () => {
    if (gameState?.gameOver) return 'text-gray-600';
    if (pendingMove) return 'text-yellow-600';
    if (isMyTurn) return 'text-green-600';
    return 'text-blue-600';
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Fireworks 
        show={showFireworks} 
        onComplete={() => setShowFireworks(false)} 
      />
      
      {/* Game Status */}
      <div className="mb-4 text-center">
        <div className={`text-lg font-semibold mb-2 ${getTurnIndicatorColor()}`}>
          {getCurrentTurnText()}
        </div>
        <div className="text-sm text-gray-500 space-x-4">
          <span>Playing as: <span className="font-medium capitalize">{playerColor}</span></span>
          <span>Move: {getMoveCount()}</span>
          {gameState?.chessState?.moves?.length > 0 && (
            <span>Last: {gameState.chessState.moves.slice(-1)[0]}</span>
          )}
          {pendingMove && (
            <span className="text-yellow-600">Pending: {pendingMove}</span>
          )}
        </div>
      </div>

      {/* Chess Board */}
      <div className="w-full max-w-lg">
        <Chessboard
          position={fen}
          onDrop={handleMove}
          orientation={playerColor}
          draggable={isMyTurn && !pendingMove && !gameState?.gameOver}
          boardStyle={{
            borderRadius: '8px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
            opacity: pendingMove ? 0.7 : 1,
          }}
          width={500}
          transitionDuration={300}
        />
      </div>

      {/* Game Info */}
      <div className="mt-4 text-center text-sm text-gray-500">
        {gameState?.players && (
          <div className="flex justify-center space-x-6">
            {gameState.players.map((player: any) => (
              <div key={player.id} className={`flex items-center space-x-2 ${
                player.id === gameState.currentTurn ? 'font-bold text-blue-600' : ''
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  player.chessColor === 'white' ? 'bg-gray-200 border border-gray-400' : 'bg-gray-800'
                }`}></div>
                <span>{player.name}</span>
                {player.id === gameState.currentTurn && !gameState.gameOver && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Turn
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Move History */}
      {gameState?.chessState?.moves && gameState.chessState.moves.length > 0 && (
        <div className="mt-4 w-full max-w-lg">
          <div className="text-sm font-semibold mb-2">Move History:</div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 max-h-32 overflow-y-auto">
            <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
              {gameState.chessState.moves.map((move: string, index: number) => (
                <span key={index} className="mr-3">
                  {index % 2 === 0 ? `${Math.floor(index / 2) + 1}.` : ''} {move}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 text-xs text-gray-400 bg-gray-100 p-2 rounded max-w-lg w-full">
          <div>Player ID: {currentPlayer}</div>
          <div>Current Turn: {gameState?.currentTurn}</div>
          <div>Is My Turn: {isMyTurn ? 'Yes' : 'No'}</div>
          <div>Game Started: {gameState?.gameStarted ? 'Yes' : 'No'}</div>
          <div>Game Over: {gameState?.gameOver ? 'Yes' : 'No'}</div>
          <div>Player Color: {playerColor}</div>
          <div>Pending Move: {pendingMove || 'None'}</div>
          <div>Board FEN: {fen.substring(0, 20)}...</div>
        </div>
      )}
    </div>
  );
};


// import React, { useEffect, useState, useCallback, useRef } from 'react';
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
//   const [pendingMove, setPendingMove] = useState<string | null>(null);
  
//   // Ref to track the latest game state to prevent stale closures
//   const gameStateRef = useRef(gameState);
//   const currentPlayerRef = useRef(currentPlayer);

//   // Update refs when props change
//   useEffect(() => {
//     gameStateRef.current = gameState;
//     currentPlayerRef.current = currentPlayer;
//   }, [gameState, currentPlayer]);

//   // Handle game state updates from server with better logging
//   useEffect(() => {

//     // Add a guard clause at the top of the useEffect
//   if (!gameState?.chessState) {
//     console.warn('gameState or chessState is undefined. Skipping board update.');
//     return;
//   }

//     console.log('=== CHESS FRONTEND STATE UPDATE ===');
//     console.log('Received game state:', {
//       currentTurn: gameState?.currentTurn,
//       currentPlayer,
//       chessState: gameState?.chessState,
//       players: gameState?.players?.map((p: any) => ({ 
//         id: p.id, 
//         name: p.name, 
//         chessColor: p.chessColor 
//       })),
//       gameStarted: gameState?.gameStarted,
//       gameOver: gameState?.gameOver,
//       timestamp: new Date().toISOString()
//     });

//     // CRITICAL: Always sync with server board state - this is the source of truth
//     if (gameState?.chessState?.board) {
//       const newFen = gameState.chessState.board;
//       console.log('📋 Board FEN update:', {
//         old: fen,
//         new: newFen,
//         same: fen === newFen
//       });
//       setFen(newFen);
//     } else {
//       // Reset to starting position if no chess state
//       const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
//       console.log('📋 Resetting to start position');
//       setFen(startFen);
//     }

//     // Determine player color based on server data
//     const player = gameState?.players?.find((p: any) => p.id === currentPlayer);
//     if (player?.chessColor) {
//       const newColor = player.chessColor;
//       if (playerColor !== newColor) {
//         console.log('🎨 Player color updated:', {
//           old: playerColor,
//           new: newColor
//         });
//         setPlayerColor(newColor);
//       }
//     }

//     // CRITICAL: Turn validation with detailed logging
//     const serverCurrentTurn = gameState?.currentTurn;
//     const gameStarted = gameState?.gameStarted;
//     const gameOver = gameState?.gameOver;
    
//     const myTurn = serverCurrentTurn === currentPlayer && 
//                    gameStarted && 
//                    !gameOver;
    
//     console.log('🔄 Turn validation:', {
//       playerId: currentPlayer,
//       serverCurrentTurn,
//       gameStarted,
//       gameOver,
//       calculatedIsMyTurn: myTurn,
//       previousIsMyTurn: isMyTurn
//     });
    
//     // Update turn state
//     setIsMyTurn(myTurn);

//     // Clear any pending moves since we got fresh state
//     if (pendingMove) {
//       console.log('🔄 Clearing pending move due to state update');
//       setPendingMove(null);
//     }

//   }, [gameState, currentPlayer]); // Remove fen and playerColor from dependencies

//   // Show fireworks when game ends
//   useEffect(() => {
//     if (gameState?.gameOver && !showFireworks) {
//       console.log('🎆 Game over - showing fireworks');
//       setShowFireworks(true);
//     }
//   }, [gameState?.gameOver, showFireworks]);

//   // Enhanced chess move and error handlers
//   useEffect(() => {
//     // Add a guard clause at the top of the useEffect
//   if (!gameState?.chessState) {
//     console.warn('gameState or chessState is undefined. Skipping board update.');
//     return;
//   }

//     const handleChessMove = (data: any) => {
//       console.log('✅ Chess move confirmed from server:', {
//         move: data.move,
//         playerId: data.playerId,
//         timestamp: data.timestamp,
//         success: data.success
//       });
      
//       // Clear pending move if it matches
//       if (pendingMove && data.success) {
//         console.log('🔄 Clearing confirmed pending move:', pendingMove);
//         setPendingMove(null);
//       }
      
//       setLastMoveTime(Date.now());
//     };

//     const handleChessMoveError = (error: any) => {
//       console.error('❌ Chess move error from server:', {
//         error: error.message,
//         move: error.move,
//         playerId: error.playerId,
//         timestamp: error.timestamp
//       });
      
//       // Clear pending move on error
//       if (pendingMove) {
//         console.log('🔄 Clearing pending move due to error');
//         setPendingMove(null);
//       }
      
//       // Force refresh the board state from server
//       if (gameStateRef.current?.chessState?.board) {
//         console.log('🔄 Forcing board refresh after error');
//         setFen(gameStateRef.current.chessState.board);
//       }
      
//       // Show error to user
//       alert(`Chess move failed: ${error.message || 'Invalid move'}`);
//     };

//     // Enhanced game state handler specifically for chess moves
//     const handleGameStateUpdate = (newGameState: any) => {
//       console.log('🔄 Game state update received:', {
//         currentTurn: newGameState.currentTurn,
//         board: newGameState.chessState?.board,
//         gameStarted: newGameState.gameStarted,
//         gameOver: newGameState.gameOver
//       });
//       // Note: Main state update is handled by the parent component
//     };

//     if (socket) {
//       socket.on('chessMove', handleChessMove);
//       socket.on('chessMoveError', handleChessMoveError);
//       socket.on('gameState', handleGameStateUpdate);

//       return () => {
//         socket.off('chessMove', handleChessMove);
//         socket.off('chessMoveError', handleChessMoveError);
//         socket.off('gameState', handleGameStateUpdate);
//       };
//     }
//   }, [socket, pendingMove]); // Include pendingMove in dependencies

//   // Enhanced move handler with better validation
//   const handleMove = useCallback(({ sourceSquare, targetSquare }: { 
//     sourceSquare: string; 
//     targetSquare: string 
//   }) => {

//     // Add a guard clause at the top of the useCallback
//   if (!gameStateRef.current?.chessState || !isMyTurn) {
//     console.warn('Game state not ready or not your turn. Move canceled.');
//     return;
//   }
//     console.log('=== CHESS MOVE ATTEMPT ===');
    
//     // Use refs to get current values (prevents stale closure issues)
//     const currentGameState = gameStateRef.current;
//     const currentPlayerId = currentPlayerRef.current;
    
//     const moveString = `${sourceSquare}${targetSquare}`;
    
//     console.log('Move attempt details:', {
//       from: sourceSquare,
//       to: targetSquare,
//       moveString,
//       currentPlayerId,
//       serverCurrentTurn: currentGameState?.currentTurn,
//       isMyTurn,
//       gameOver: currentGameState?.gameOver,
//       gameStarted: currentGameState?.gameStarted,
//       pendingMove,
//       timestamp: new Date().toISOString()
//     });

//     // Prevent rapid-fire moves
//     const now = Date.now();
//     if (now - lastMoveTime < 300) {
//       console.log('❌ Move blocked - too rapid (300ms cooldown)');
//       return null;
//     }

//     // Prevent moves while another is pending
//     if (pendingMove) {
//       console.log('❌ Move blocked - another move is pending');
//       return null;
//     }

//     // CRITICAL: Client-side validation with current state
//     if (!isMyTurn) {
//       console.log('❌ Move blocked - not your turn', {
//         currentPlayerId,
//         serverCurrentTurn: currentGameState?.currentTurn
//       });
//       return null;
//     }

//     if (currentGameState?.gameOver) {
//       console.log('❌ Move blocked - game is over');
//       return null;
//     }

//     if (!currentGameState?.gameStarted) {
//       console.log('❌ Move blocked - game not started');
//       return null;
//     }

//     // Validate move string format
//     if (!/^[a-h][1-8][a-h][1-8]$/.test(moveString)) {
//       console.log('❌ Move blocked - invalid format:', moveString);
//       return null;
//     }

//     console.log('✅ Move validation passed - sending to server');
    
//     try {
//       // Set pending move before sending
//       setPendingMove(moveString);
      
//       // Send move to server
//       onChessMove(moveString);
//       setLastMoveTime(now);
      
//       console.log('📤 Move sent to server:', {
//         move: moveString,
//         timestamp: new Date().toISOString()
//       });
      
//       // Allow the visual move temporarily (optimistic update)
//       return true;
      
//     } catch (error) {
//       console.error('❌ Failed to send move:', error);
//       setPendingMove(null); // Clear pending on error
//       return null;
//     }
//   }, [isMyTurn, onChessMove, lastMoveTime, pendingMove]);
