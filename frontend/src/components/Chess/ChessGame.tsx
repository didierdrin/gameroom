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
}

export const ChessGame: React.FC<GameRenderProps> = ({ 
  socket, 
  roomId, 
  currentPlayer, 
  gameState, 
  onChessMove 
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
        
        // If turns are out of sync, this indicates a server-side issue
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

  // Debug logging
  useEffect(() => {
    const isMyTurn = gameState.currentTurn === currentPlayer;
    const canIDrag = isMyTurn && 
                    !gameState.gameOver &&
                    (!gameState.chessPlayers || 
                     gameState.chessPlayers.player1Id === currentPlayer || 
                     gameState.chessPlayers.player2Id === currentPlayer);
    
    console.log('ChessGame Debug:', {
      currentTurn: gameState.currentTurn,
      currentPlayer,
      gameOver: gameState.gameOver,
      playerColor,
      isMyTurn,
      draggable: canIDrag,
      chessPlayers: gameState.chessPlayers,
      players: gameState.players.map((p: any) => ({ id: p.id, chessColor: p.chessColor }))
    });
  }, [gameState.currentTurn, currentPlayer, gameState.gameOver, playerColor, gameState.players, gameState.chessPlayers]);

  // Add this useEffect to debug turn changes
  useEffect(() => {
    console.log('Turn changed:', {
      currentTurn: gameState.currentTurn,
      currentPlayer: currentPlayer,
      isMyTurn: gameState.currentTurn === currentPlayer,
      chessPlayers: gameState.chessPlayers
    });
  }, [gameState.currentTurn, currentPlayer, gameState.chessPlayers]);

  const handleMove = ({ sourceSquare, targetSquare }: { 
    sourceSquare: string; 
    targetSquare: string 
  }) => {
    try {
      // Check if it's the player's turn
      if (gameState.currentTurn !== currentPlayer) {
        console.log("Not your turn - currentTurn:", gameState.currentTurn, "currentPlayer:", currentPlayer);
        return null;
      }

      // Check if the game is over
      if (gameState.gameOver) {
        console.log("Game is over");
        return null;
      }

      // Check if player is a selected chess player
      if (gameState.chessPlayers) {
        const isChessPlayer = gameState.chessPlayers.player1Id === currentPlayer || 
                             gameState.chessPlayers.player2Id === currentPlayer;
        if (!isChessPlayer) {
          console.log("Only selected chess players can make moves");
          return null;
        }
        
        // Additional validation: check if the player's assigned color matches the current chess turn
        const chessJSTurn = game.turn(); // 'w' or 'b'
        const expectedColor = chessJSTurn === 'w' ? 'white' : 'black';
        const isPlayer1 = gameState.chessPlayers.player1Id === currentPlayer;
        const isPlayer2 = gameState.chessPlayers.player2Id === currentPlayer;
        
        if (isPlayer1 && expectedColor !== 'white') {
          console.log("Player 1 (white) trying to move on black's turn");
          return null;
        }
        if (isPlayer2 && expectedColor !== 'black') {
          console.log("Player 2 (black) trying to move on white's turn");
          return null;
        }
      }

      // IMPORTANT: Load the current board state from gameState before making the move
      if (gameState?.chessState?.board) {
        try {
          game.load(gameState.chessState.board);
          setFen(game.fen());
        } catch (e) {
          console.error('Failed to load chess position before move:', e);
          return null;
        }
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

  // Helper function to determine whose turn it is for display
  const getCurrentTurnDisplay = () => {
    if (gameState.gameOver) {
      return `Game Over! Winner: ${gameState.winner}`;
    }
    
    if (gameState.chessPlayers && 
        gameState.chessPlayers.player1Id !== currentPlayer && 
        gameState.chessPlayers.player2Id !== currentPlayer) {
      return 'You are spectating this chess game';
    }
    
    if (gameState.currentTurn === currentPlayer) {
      return 'Your turn';
    } else {
      // Find the name of the current turn player
      const currentTurnPlayer = gameState.players.find((p: any) => p.id === gameState.currentTurn);
      return `${currentTurnPlayer?.name || 'Opponent'}'s turn`;
    }
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
          draggable={
            gameState.currentTurn === currentPlayer && 
            !gameState.gameOver &&
            (!gameState.chessPlayers || 
             gameState.chessPlayers.player1Id === currentPlayer || 
             gameState.chessPlayers.player2Id === currentPlayer)
          }
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
          <p>Current Turn: {gameState.currentTurn}</p>
          <p>Current Player: {currentPlayer}</p>
          <p>Chess.js Turn: {game.turn()}</p>
          {gameState.chessPlayers && (
            <>
              <p>Player 1 (White): {gameState.chessPlayers.player1Id}</p>
              <p>Player 2 (Black): {gameState.chessPlayers.player2Id}</p>
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
//   // const [game, setGame] = useState(new Chess());
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

//     // Set player color
//     const player = gameState.players.find((p: any) => p.id === currentPlayer);
//     setPlayerColor(player?.chessColor || 'white');
    
//     // Update local game state
//     setLocalGameState(gameState);
    
//     console.log('ChessGame State Updated:', {
//       board: gameState.chessState?.board,
//       currentTurn: gameState.currentTurn,
//       currentPlayer,
//       gameStarted: gameState.gameStarted,
//       gameOver: gameState.gameOver
//     });
//   }, [gameState, currentPlayer]);


//   useEffect(() => {
//     // Sync the local chess.js game with the server state
//     if (gameState?.chessState?.board) {
//       try {
//         game.load(gameState.chessState.board);
//         setFen(game.fen());
        
//         // Debug: Check if the turn is synchronized
//         const moveColor = game.turn();
//         const currentPlayerObj = gameState.players.find((p: any) => p.id === gameState.currentTurn);
//         console.log('Turn synchronization:', {
//           chessJSTurn: moveColor,
//           currentPlayer: currentPlayerObj?.id,
//           currentPlayerColor: currentPlayerObj?.chessColor,
//           shouldMatch: (moveColor === 'w' && currentPlayerObj?.chessColor === 'white') || 
//                       (moveColor === 'b' && currentPlayerObj?.chessColor === 'black')
//         });
//       } catch (e) {
//         console.error('Failed to sync chess position:', e);
//       }
//     }
//   }, [gameState.chessState?.board, gameState.currentTurn]);

//   // Show fireworks when game ends
//   useEffect(() => {
//     if (gameState.gameOver && !showFireworks) {
//       setShowFireworks(true);
//     }
//   }, [gameState.gameOver, showFireworks]);

//   // Debug logging
//   useEffect(() => {
//     console.log('ChessGame Debug:', {
//       currentTurn: gameState.currentTurn,
//       currentPlayer,
//       gameOver: gameState.gameOver,
//       playerColor,
//       draggable: gameState.currentTurn === currentPlayer && !gameState.gameOver,
//       players: gameState.players.map((p: any) => ({ id: p.id, chessColor: p.chessColor }))
//     });
//   }, [gameState.currentTurn, currentPlayer, gameState.gameOver, playerColor, gameState.players]);


//   // Add this useEffect to debug turn changes
// useEffect(() => {
//   console.log('Turn changed:', {
//     currentTurn: gameState.currentTurn,
//     currentPlayer: currentPlayer,
//     isMyTurn: gameState.currentTurn === currentPlayer,
//     chessPlayers: gameState.chessPlayers
//   });
// }, [gameState.currentTurn, currentPlayer, gameState.chessPlayers]);


// useEffect(() => {
//   // Sync the local chess.js game with the server state
//   if (gameState?.chessState?.board) {
//     try {
//       game.load(gameState.chessState.board);
//       setFen(game.fen());
      
//       // Debug: Check if the turn is synchronized
//       const moveColor = game.turn();
//       const currentPlayerObj = gameState.players.find((p: any) => p.id === gameState.currentTurn);
//       console.log('Turn synchronization:', {
//         chessJSTurn: moveColor,
//         currentPlayer: currentPlayerObj?.id,
//         currentPlayerColor: currentPlayerObj?.chessColor,
//         shouldMatch: (moveColor === 'w' && currentPlayerObj?.chessColor === 'white') || 
//                     (moveColor === 'b' && currentPlayerObj?.chessColor === 'black')
//       });
//     } catch (e) {
//       console.error('Failed to sync chess position:', e);
//     }
//   }
// }, [gameState.chessState?.board, gameState.currentTurn]);

// const handleMove = ({ sourceSquare, targetSquare }: { 
//   sourceSquare: string; 
//   targetSquare: string 
// }) => {
//   try {
//     // Check if it's the player's turn
//     if (gameState.currentTurn !== currentPlayer) {
//       console.log("Not your turn");
//       return null;
//     }

//     // Check if the game is over
//     if (gameState.gameOver) {
//       console.log("Game is over");
//       return null;
//     }

//     // Check if player is a selected chess player
//     if (gameState.chessPlayers) {
//       const isChessPlayer = gameState.chessPlayers.player1Id === currentPlayer || 
//                            gameState.chessPlayers.player2Id === currentPlayer;
//       if (!isChessPlayer) {
//         console.log("Only selected chess players can make moves");
//         return null;
//       }
//     }

//     // IMPORTANT: Load the current board state from gameState before making the move
//     if (gameState?.chessState?.board) {
//       try {
//         game.load(gameState.chessState.board);
//         setFen(game.fen());
//       } catch (e) {
//         console.error('Failed to load chess position:', e);
//         return null;
//       }
//     }

//     // Try to make the move
//     const move = game.move({
//       from: sourceSquare,
//       to: targetSquare,
//       promotion: 'q',
//     });

//     if (move) {
//       // Update local state immediately for responsive UI
//       setFen(game.fen());
      
//       // Send move to server
//       onChessMove(`${sourceSquare}${targetSquare}`);
      
//       return move;
//     }
//   } catch (e) {
//     console.error('Invalid move:', e);
//     return null;
//   }
//   return null;
// };

//   // const handleMove = ({ sourceSquare, targetSquare }: { 
//   //   sourceSquare: string; 
//   //   targetSquare: string 
//   // }) => {
//   //   try {
//   //     // Check if it's the player's turn
//   //     if (gameState.currentTurn !== currentPlayer) {
//   //       console.log("Not your turn");
//   //       return null;
//   //     }
  
//   //     // Check if the game is over
//   //     if (gameState.gameOver) {
//   //       console.log("Game is over");
//   //       return null;
//   //     }

//   //     // Check if player is a selected chess player
//   //     if (gameState.chessPlayers) {
//   //       const isChessPlayer = gameState.chessPlayers.player1Id === currentPlayer || 
//   //                            gameState.chessPlayers.player2Id === currentPlayer;
//   //       if (!isChessPlayer) {
//   //         console.log("Only selected chess players can make moves");
//   //         return null;
//   //       }
//   //     }
  
//   //     const player = gameState.players.find((p: any) => p.id === currentPlayer);
//   //     const moveColor = game.turn();
      
//   //     // Validate player color matches current turn
//   //     if ((moveColor === 'w' && player?.chessColor !== 'white') || 
//   //         (moveColor === 'b' && player?.chessColor !== 'black')) {
//   //       console.log("Not your color's turn");
//   //       return null;
//   //     }
  
//   //     // Try to make the move
//   //     const move = game.move({
//   //       from: sourceSquare,
//   //       to: targetSquare,
//   //       promotion: 'q',
//   //     });
  
//   //     if (move) {
//   //       // Update local state immediately for responsive UI
//   //       setFen(game.fen());
        
//   //       // Send move to server
//   //       onChessMove(`${sourceSquare}${targetSquare}`);
//   //     }
//   //   } catch (e) {
//   //     console.error('Invalid move:', e);
//   //     return null;
//   //   }
//   // };

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
//           draggable={
//             gameState.currentTurn === currentPlayer && 
//             !gameState.gameOver &&
//             (!gameState.chessPlayers || 
//              gameState.chessPlayers.player1Id === currentPlayer || 
//              gameState.chessPlayers.player2Id === currentPlayer)
//           }
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
//           {gameState.gameOver 
//             ? `Game Over! Winner: ${gameState.winner}`
//             : gameState.chessPlayers && 
//               gameState.chessPlayers.player1Id !== currentPlayer && 
//               gameState.chessPlayers.player2Id !== currentPlayer
//             ? 'You are spectating this chess game'
//             : `Current Turn: ${gameState.currentTurn === currentPlayer 
//                 ? 'Your turn' 
//                 : 'Opponent\'s turn'}`}
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
//       </div>
//     </div>
//   );
// };

