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
  playerIdToUsername: Record<string, string>; // Added prop
}

export const ChessGame: React.FC<GameRenderProps> = ({ 
  socket, 
  roomId, 
  currentPlayer, 
  gameState, 
  onChessMove,
  playerIdToUsername
}) => {
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState('start');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [localGameState, setLocalGameState] = useState(gameState);
  const [showFireworks, setShowFireworks] = useState(false);

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

    // Set player color based on chess player assignments
    if (gameState?.chessPlayers) {
      if (gameState.chessPlayers.player1Id === currentPlayer) {
        setPlayerColor('white');
      } else if (gameState.chessPlayers.player2Id === currentPlayer) {
        setPlayerColor('black');
      }
    } else {
      // Fallback to player object color if available
      const player = gameState.players.find((p: any) => p.id === currentPlayer);
      setPlayerColor(player?.chessColor || 'white');
    }
    
    // Update local game state
    setLocalGameState(gameState);
    
    console.log('ChessGame State Updated:', {
      board: gameState.chessState?.board,
      currentTurn: gameState.currentTurn,
      currentPlayer,
      gameStarted: gameState.gameStarted,
      gameOver: gameState.gameOver,
      chessPlayers: gameState.chessPlayers
    });
  }, [gameState, currentPlayer]);

  useEffect(() => {
    // Sync the local chess.js game with the server state
    if (gameState?.chessState?.board) {
      try {
        game.load(gameState.chessState.board);
        setFen(game.fen());
        
        // Debug: Check if the turn is synchronized
        const chessJSTurn = game.turn(); // 'w' or 'b'
        const currentTurnPlayer = gameState.currentTurn;
        
        // Determine what color should be playing based on chess.js
        const expectedColor = chessJSTurn === 'w' ? 'white' : 'black';
        
        // Find which player should be playing this color
        let expectedPlayerId = null;
        if (gameState?.chessPlayers) {
          if (expectedColor === 'white') {
            expectedPlayerId = gameState.chessPlayers.player1Id;
          } else {
            expectedPlayerId = gameState.chessPlayers.player2Id;
          }
        }
        
        console.log('Turn synchronization:', {
          chessJSTurn,
          expectedColor,
          expectedPlayerId,
          currentTurnPlayer,
          isSync: expectedPlayerId === currentTurnPlayer,
          chessPlayers: gameState.chessPlayers
        });
        
        // If turns are out of sync, log a warning
        if (expectedPlayerId && expectedPlayerId !== currentTurnPlayer) {
          console.warn('Turn desynchronization detected!', {
            expected: expectedPlayerId,
            actual: currentTurnPlayer
          });
        }
        
      } catch (e) {
        console.error('Failed to sync chess position:', e);
      }
    }
  }, [gameState.chessState?.board, gameState.currentTurn, gameState.chessPlayers]);

  // Show fireworks when game ends
  useEffect(() => {
    if (gameState.gameOver && !showFireworks) {
      setShowFireworks(true);
    }
  }, [gameState.gameOver, showFireworks]);

  // Helper function to get player's assigned color
  const getPlayerColor = (): 'w' | 'b' | null => {
    if (!gameState?.chessPlayers) return null;
    
    if (gameState.chessPlayers.player1Id === currentPlayer) return 'w';
    if (gameState.chessPlayers.player2Id === currentPlayer) return 'b';
    return null;
  };

  // Updated canMakeMove function
  const canMakeMove = (sourceSquare: string, targetSquare: string): boolean => {
    // Check if game has started
    if (!gameState.gameStarted) {
      console.log('Game has not started yet');
      return false;
    }

    // Check if game is over
    if (gameState.gameOver) {
      console.log('Game is over');
      return false;
    }

    // Check if player is a selected chess player
    if (gameState.chessPlayers) {
      const isChessPlayer = gameState.chessPlayers.player1Id === currentPlayer || 
                           gameState.chessPlayers.player2Id === currentPlayer;
      if (!isChessPlayer) {
        console.log('Only selected chess players can make moves');
        return false;
      }
    }

    // Get the current chess.js turn and player's color
    const chessJSTurn = game.turn(); // 'w' or 'b'
    const playerChessColor = getPlayerColor();
    
    // Check if it's the player's turn according to chess.js
    if (playerChessColor !== chessJSTurn) {
      console.log(`Not your turn according to chess position! Chess.js turn: ${chessJSTurn}, Your color: ${playerChessColor}`);
      return false;
    }

    // Additional backend turn validation
    if (gameState.currentTurn !== currentPlayer) {
      console.log('Not your turn according to backend:', {
        currentTurn: gameState.currentTurn,
        currentPlayer: currentPlayer
      });
      return false;
    }

    return true;
  };

  const handleMove = ({ sourceSquare, targetSquare }: { 
    sourceSquare: string; 
    targetSquare: string 
  }) => {
    try {
      console.log(`Attempting move: ${sourceSquare} -> ${targetSquare}`);
      
      // Load the current board state from gameState before making the move
      if (gameState?.chessState?.board) {
        try {
          game.load(gameState.chessState.board);
          setFen(game.fen());
        } catch (e) {
          console.error('Failed to load chess position before move:', e);
          return null;
        }
      }

      // Validate move
      if (!canMakeMove(sourceSquare, targetSquare)) {
        return null;
      }

      // Try to make the move
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move) {
        console.log('Valid move made:', move);
        
        // Update local state immediately for responsive UI
        setFen(game.fen());
        
        // Send move to server
        onChessMove(`${sourceSquare}${targetSquare}`);
        
        return move;
      } else {
        console.log('Invalid move attempted:', sourceSquare, 'to', targetSquare);
      }
    } catch (e) {
      console.error('Error making move:', e);
      return null;
    }
    return null;
  };

  // Updated function to display usernames
  const getCurrentTurnDisplay = () => {
    if (gameState.gameOver) {
      const winnerId = gameState.winner;
      const winnerName = playerIdToUsername[winnerId] || gameState.players.find((p: any) => p.id === winnerId)?.name || 'Unknown';
      return `Game Over! Winner: ${winnerName}`;
    }
    
    if (gameState.chessPlayers && 
        gameState.chessPlayers.player1Id !== currentPlayer && 
        gameState.chessPlayers.player2Id !== currentPlayer) {
      return 'You are spectating this chess game';
    }
    
    // Use chess.js turn state as the source of truth
    const chessJSTurn = game.turn();
    const playerChessColor = getPlayerColor();
    
    if (playerChessColor === chessJSTurn) {
      return 'Your turn';
    } else {
      // Find the opponent
      let opponentId = '';
      if (gameState.chessPlayers) {
        if (currentPlayer === gameState.chessPlayers.player1Id) {
          opponentId = gameState.chessPlayers.player2Id;
        } else {
          opponentId = gameState.chessPlayers.player1Id;
        }
      }
      
      const opponentName = playerIdToUsername[opponentId] || 
                          gameState.players.find((p: any) => p.id === opponentId)?.name || 
                          'Opponent';
      return `${opponentName}'s turn`;
    }
  };

  // Updated isDraggable function to ensure backend turn validation
  const isDraggable = (): boolean => {
    if (!gameState.gameStarted || gameState.gameOver) {
      console.log('Board not draggable: Game not started or over');
      return false;
    }
    
    // Check if player is a chess player
    if (gameState.chessPlayers) {
      const isChessPlayer = gameState.chessPlayers.player1Id === currentPlayer || 
                           gameState.chessPlayers.player2Id === currentPlayer;
      if (!isChessPlayer) {
        console.log('Board not draggable: Not a chess player');
        return false;
      }
    }
    
    // Check both chess.js and backend turn
    const chessJSTurn = game.turn();
    const playerChessColor = getPlayerColor();
    
    const isClientTurn = playerChessColor === chessJSTurn;
    const isServerTurn = gameState.currentTurn === currentPlayer;
    
    if (!isClientTurn) {
      console.log('Board not draggable: Not your turn (chess.js)', { chessJSTurn, playerChessColor });
    }
    if (!isServerTurn) {
      console.log('Board not draggable: Not your turn (backend)', { currentTurn: gameState.currentTurn, currentPlayer });
    }
    
    return isClientTurn && isServerTurn;
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
          draggable={isDraggable()}
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
          {getCurrentTurnDisplay()}
        </p>
        {gameState.chessPlayers && 
         (gameState.chessPlayers.player1Id === currentPlayer || 
          gameState.chessPlayers.player2Id === currentPlayer) && (
          <p className="text-sm text-gray-500">
            You are playing as: {playerColor}
          </p>
        )}
        {gameState.chessState?.moves?.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            Last move: {gameState.chessState.moves.slice(-1)[0]}
          </p>
        )}
        {/* Debug info - remove in production */}
        <div className="text-xs text-gray-600 mt-2 space-y-1">
          <p>Backend Turn: {playerIdToUsername[gameState.currentTurn] || gameState.currentTurn}</p>
          <p>Chess.js Turn: {game.turn()} ({game.turn() === 'w' ? 'White' : 'Black'})</p>
          <p>Your Color: {getPlayerColor() === 'w' ? 'White' : getPlayerColor() === 'b' ? 'Black' : 'Spectator'}</p>
          <p>Can Move: {isDraggable() ? 'Yes' : 'No'}</p>
          {gameState.chessPlayers && (
            <>
              <p>Player 1 (White): {playerIdToUsername[gameState.chessPlayers.player1Id] || gameState.chessPlayers.player1Id}</p>
              <p>Player 2 (Black): {playerIdToUsername[gameState.chessPlayers.player2Id] || gameState.chessPlayers.player2Id}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// import React, { useEffect, useState } from 'react';
// import Chessboard from 'chessboardjsx';
// import { Chess } from 'chess.js';
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
//   const [game] = useState(() => new Chess());
//   const [fen, setFen] = useState('start');
//   const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
//   const [localGameState, setLocalGameState] = useState(gameState);
//   const [showFireworks, setShowFireworks] = useState(false);

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

//     // Set player color based on chess player assignments
//     if (gameState?.chessPlayers) {
//       if (gameState.chessPlayers.player1Id === currentPlayer) {
//         setPlayerColor('white');
//       } else if (gameState.chessPlayers.player2Id === currentPlayer) {
//         setPlayerColor('black');
//       }
//     } else {
//       // Fallback to player object color if available
//       const player = gameState.players.find((p: any) => p.id === currentPlayer);
//       setPlayerColor(player?.chessColor || 'white');
//     }
    
//     // Update local game state
//     setLocalGameState(gameState);
    
//     console.log('ChessGame State Updated:', {
//       board: gameState.chessState?.board,
//       currentTurn: gameState.currentTurn,
//       currentPlayer,
//       gameStarted: gameState.gameStarted,
//       gameOver: gameState.gameOver,
//       chessPlayers: gameState.chessPlayers
//     });
//   }, [gameState, currentPlayer]);

//   useEffect(() => {
//     // Sync the local chess.js game with the server state
//     if (gameState?.chessState?.board) {
//       try {
//         game.load(gameState.chessState.board);
//         setFen(game.fen());
        
//         // Debug: Check if the turn is synchronized
//         const chessJSTurn = game.turn(); // 'w' or 'b'
//         const currentTurnPlayer = gameState.currentTurn;
        
//         // Determine what color should be playing based on chess.js
//         const expectedColor = chessJSTurn === 'w' ? 'white' : 'black';
        
//         // Find which player should be playing this color
//         let expectedPlayerId = null;
//         if (gameState?.chessPlayers) {
//           if (expectedColor === 'white') {
//             expectedPlayerId = gameState.chessPlayers.player1Id;
//           } else {
//             expectedPlayerId = gameState.chessPlayers.player2Id;
//           }
//         }
        
//         console.log('Turn synchronization:', {
//           chessJSTurn,
//           expectedColor,
//           expectedPlayerId,
//           currentTurnPlayer,
//           isSync: expectedPlayerId === currentTurnPlayer,
//           chessPlayers: gameState.chessPlayers
//         });
        
//         // If turns are out of sync, this indicates a server-side issue
//         if (expectedPlayerId && expectedPlayerId !== currentTurnPlayer) {
//           console.warn('Turn desynchronization detected!', {
//             expected: expectedPlayerId,
//             actual: currentTurnPlayer
//           });
//         }
        
//       } catch (e) {
//         console.error('Failed to sync chess position:', e);
//       }
//     }
//   }, [gameState.chessState?.board, gameState.currentTurn, gameState.chessPlayers]);

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

//  // Update the canMakeMove function to be more robust
// const canMakeMove = (sourceSquare: string, targetSquare: string): boolean => {
//   // Check if game has started
//   if (!gameState.gameStarted) {
//     console.log('Game has not started yet');
//     return false;
//   }

//   // Check if game is over
//   if (gameState.gameOver) {
//     console.log('Game is over');
//     return false;
//   }

//   // Check if player is a selected chess player
//   if (gameState.chessPlayers) {
//     const isChessPlayer = gameState.chessPlayers.player1Id === currentPlayer || 
//                          gameState.chessPlayers.player2Id === currentPlayer;
//     if (!isChessPlayer) {
//       console.log('Only selected chess players can make moves');
//       return false;
//     }
//   }

//   // Get the current chess.js turn and player's color
//   const chessJSTurn = game.turn(); // 'w' or 'b'
//   const playerChessColor = getPlayerColor();
  
//   // Check if it's actually the player's turn according to chess.js
//   if (playerChessColor !== chessJSTurn) {
//     console.log(`Not your turn according to chess position! Chess.js turn: ${chessJSTurn}, Your color: ${playerChessColor}`);
//     return false;
//   }

//   // Additional backend turn validation
//   if (gameState.currentTurn !== currentPlayer) {
//     console.log('Not your turn according to backend:', {
//       currentTurn: gameState.currentTurn,
//       currentPlayer: currentPlayer
//     });
//     return false;
//   }

//   return true;
// };

//   const handleMove = ({ sourceSquare, targetSquare }: { 
//     sourceSquare: string; 
//     targetSquare: string 
//   }) => {
//     try {
//       console.log(`Attempting move: ${sourceSquare} -> ${targetSquare}`);
      
//       // IMPORTANT: Load the current board state from gameState before making the move
//       if (gameState?.chessState?.board) {
//         try {
//           game.load(gameState.chessState.board);
//           setFen(game.fen());
//         } catch (e) {
//           console.error('Failed to load chess position before move:', e);
//           return null;
//         }
//       }

//       // Use the comprehensive validation function
//       if (!canMakeMove(sourceSquare, targetSquare)) {
//         return null;
//       }

//       // Try to make the move
//       const move = game.move({
//         from: sourceSquare,
//         to: targetSquare,
//         promotion: 'q',
//       });

//       if (move) {
//         console.log('Valid move made:', move);
        
//         // Update local state immediately for responsive UI
//         setFen(game.fen());
        
//         // Send move to server
//         onChessMove(`${sourceSquare}${targetSquare}`);
        
//         return move;
//       } else {
//         console.log('Invalid move attempted:', sourceSquare, 'to', targetSquare);
//       }
//     } catch (e) {
//       console.error('Error making move:', e);
//       return null;
//     }
//     return null;
//   };

//   // Helper function to determine whose turn it is for display
//   const getCurrentTurnDisplay = () => {
//     if (gameState.gameOver) {
//       return `Game Over! Winner: ${gameState.winner}`;
//     }
    
//     if (gameState.chessPlayers && 
//         gameState.chessPlayers.player1Id !== currentPlayer && 
//         gameState.chessPlayers.player2Id !== currentPlayer) {
//       return 'You are spectating this chess game';
//     }
    
//     // Use chess.js turn state as the source of truth
//     const chessJSTurn = game.turn();
//     const playerChessColor = getPlayerColor();
    
//     if (playerChessColor === chessJSTurn) {
//       return 'Your turn';
//     } else {
//       // Find the opponent
//       let opponentId = '';
//       if (gameState.chessPlayers) {
//         if (currentPlayer === gameState.chessPlayers.player1Id) {
//           opponentId = gameState.chessPlayers.player2Id;
//         } else {
//           opponentId = gameState.chessPlayers.player1Id;
//         }
//       }
      
//       const opponentPlayer = gameState.players.find((p: any) => p.id === opponentId);
//       return `${opponentPlayer?.name || 'Opponent'}'s turn`;
//     }
//   };

//   // Determine if the board should be draggable
//   const isDraggable = (): boolean => {
//     if (!gameState.gameStarted || gameState.gameOver) return false;
    
//     // Check if player is a chess player
//     if (gameState.chessPlayers) {
//       const isChessPlayer = gameState.chessPlayers.player1Id === currentPlayer || 
//                            gameState.chessPlayers.player2Id === currentPlayer;
//       if (!isChessPlayer) return false;
//     }
    
//     // Check if it's the player's turn according to chess.js
//     const chessJSTurn = game.turn();
//     const playerChessColor = getPlayerColor();
    
//     return playerChessColor === chessJSTurn;
//   };

//   return (
//     <div className="flex flex-col items-center justify-center h-full">
//       <Fireworks 
//         show={showFireworks} 
//         onComplete={() => setShowFireworks(false)} 
//       />
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
//       <div className="text-center">
//         <p className="text-gray-400">
//           {getCurrentTurnDisplay()}
//         </p>
//         {gameState.chessPlayers && 
//          (gameState.chessPlayers.player1Id === currentPlayer || 
//           gameState.chessPlayers.player2Id === currentPlayer) && (
//           <p className="text-sm text-gray-500">
//             You are playing as: {playerColor}
//           </p>
//         )}
//         {gameState.chessState?.moves?.length > 0 && (
//           <p className="text-sm text-gray-500 mt-2">
//             Last move: {gameState.chessState.moves.slice(-1)[0]}
//           </p>
//         )}
//         {/* Debug info - remove in production */}
//         <div className="text-xs text-gray-600 mt-2 space-y-1">
//           <p>Backend Turn: {gameState.currentTurn}</p>
//           <p>Chess.js Turn: {game.turn()} ({game.turn() === 'w' ? 'White' : 'Black'})</p>
//           <p>Your Color: {getPlayerColor() === 'w' ? 'White' : getPlayerColor() === 'b' ? 'Black' : 'Spectator'}</p>
//           <p>Can Move: {isDraggable() ? 'Yes' : 'No'}</p>
//           {gameState.chessPlayers && (
//             <>
//               <p>Player 1 (White): {gameState.chessPlayers.player1Id}</p>
//               <p>Player 2 (Black): {gameState.chessPlayers.player2Id}</p>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };
