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
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState('start');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [showFireworks, setShowFireworks] = useState(false);

  useEffect(() => {
    // Initialize game from gameState
    if (gameState?.chessState?.board) {
      try {
        game.load(gameState.chessState.board);
        setFen(game.fen());
        console.log('Chess board updated:', {
          fen: game.fen(),
          turn: game.turn(),
          moveNumber: game.moveNumber()
        });
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
    }
    
    console.log('ChessGame State Updated:', {
      board: gameState.chessState?.board,
      currentTurn: gameState.currentTurn,
      currentPlayer,
      gameStarted: gameState.gameStarted,
      gameOver: gameState.gameOver,
      chessPlayers: gameState.chessPlayers,
      chessTurn: game.turn()
    });
  }, [gameState, currentPlayer, game]);

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

 

const canMakeMove = (): boolean => {
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
  if (!gameState.chessPlayers) {
    console.log('No chess players selected');
    return false;
  }

  const isChessPlayer = gameState.chessPlayers.player1Id === currentPlayer || 
                       gameState.chessPlayers.player2Id === currentPlayer;
  if (!isChessPlayer) {
    console.log('Only selected chess players can make moves');
    return false;
  }

  // FIXED: Use chess.js as the ONLY source of truth for turn validation
  const chessJSTurn = game.turn(); // 'w' or 'b'
  const playerChessColor = getPlayerColor();
  
  // The core fix: Only check if it's the player's turn according to the chess position
  if (playerChessColor !== chessJSTurn) {
    console.log(`Not your turn according to chess position! Chess.js turn: ${chessJSTurn}, Your color: ${playerChessColor}`);
    return false;
  }

  console.log(`Move allowed - Chess turn: ${chessJSTurn}, Player color: ${playerChessColor}`);
  return true;
};

  const handleMove = ({ sourceSquare, targetSquare }: { 
    sourceSquare: string; 
    targetSquare: string 
  }) => {
    try {
      console.log(`Attempting move: ${sourceSquare} -> ${targetSquare}`);
      
      // Validate move using canMakeMove first
      if (!canMakeMove()) {
        console.log('Move blocked by canMakeMove validation');
        return null;
      }
  
      // Create a fresh chess instance to test the move
      const testGame = new Chess(game.fen());
  
      // Try to make the move without promotion first
      let move = testGame.move({
        from: sourceSquare,
        to: targetSquare,
      });
  
      let promotionChar = '';
      if (!move) {
        // If failed, try with promotion
        move = testGame.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q',
        });
        promotionChar = 'q';
      }
  
      if (move) {
        console.log('Valid move made locally:', move);
        
        // Update local state immediately for responsive UI
        game.load(testGame.fen());
        setFen(testGame.fen());
        
        // Send move to server
        onChessMove(`${sourceSquare}${targetSquare}${promotionChar}`);
        
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
    
    // Check if current user is a chess player
    const isPlayer1 = gameState.chessPlayers.player1Id === currentPlayer;
    const isPlayer2 = gameState.chessPlayers.player2Id === currentPlayer;
    
    if (!isPlayer1 && !isPlayer2) {
      return 'You are spectating this chess game';
    }
    
    // Use chess.js turn state as the source of truth for display
    const chessJSTurn = game.turn(); // 'w' or 'b'
    const playerChessColor = getPlayerColor();
    
    if (playerChessColor === chessJSTurn) {
      return 'Your turn to move';
    } else {
      // Determine opponent
      const opponentId = isPlayer1 ? gameState.chessPlayers.player2Id : gameState.chessPlayers.player1Id;
      const opponentName = playerIdToUsername[opponentId] || 
                          gameState.players.find((p: any) => p.id === opponentId)?.name || 
                          'Opponent';
      const opponentColor = chessJSTurn === 'w' ? 'White' : 'Black';
      return `${opponentName}'s turn (${opponentColor})`;
    }
  };

  // Simplified draggable logic
  const isDraggable = (): boolean => {
    return canMakeMove();
  };

  // Get current player names for display
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

  const playerNames = getPlayerNames();

  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* Fireworks component - you'll need to implement this or remove it */}
      {showFireworks && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {/* Simple fireworks effect */}
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
      
      <div className="text-center space-y-2">
        <p className="text-lg text-gray-300 font-medium">
          {getCurrentTurnDisplay()}
        </p>
        
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
        
        {/* Game status indicators */}
        {game && game.fen() !== 'start' && (
          <div className="text-xs text-gray-600 space-y-1">
            {game.inCheck() && (
              <p className="text-yellow-500">Check!</p>
            )}
            <p>Move #{game.moveNumber()}</p>
            <p>Turn: {game.turn() === 'w' ? 'White' : 'Black'}</p>
          </div>
        )}
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
//   const [game] = useState(() => new Chess());
//   const [fen, setFen] = useState('start');
//   const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
//   const [showFireworks, setShowFireworks] = useState(false);

//   useEffect(() => {
//     // Initialize game from gameState
//     if (gameState?.chessState?.board) {
//       try {
//         game.load(gameState.chessState.board);
//         setFen(game.fen());
//         console.log('Chess board updated:', {
//           fen: game.fen(),
//           turn: game.turn(),
//           moveNumber: game.moveNumber()
//         });
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
    
//     console.log('ChessGame State Updated:', {
//       board: gameState.chessState?.board,
//       currentTurn: gameState.currentTurn,
//       currentPlayer,
//       gameStarted: gameState.gameStarted,
//       gameOver: gameState.gameOver,
//       chessPlayers: gameState.chessPlayers,
//       chessTurn: game.turn()
//     });
//   }, [gameState, currentPlayer, game]);

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
//     // Check if game has started
//     if (!gameState.gameStarted) {
//       console.log('Game has not started yet');
//       return false;
//     }
  
//     // Check if game is over
//     if (gameState.gameOver) {
//       console.log('Game is over');
//       return false;
//     }
  
//     // Check if player is a selected chess player
//     if (!gameState.chessPlayers) {
//       console.log('No chess players selected');
//       return false;
//     }
  
//     const isChessPlayer = gameState.chessPlayers.player1Id === currentPlayer || 
//                          gameState.chessPlayers.player2Id === currentPlayer;
//     if (!isChessPlayer) {
//       console.log('Only selected chess players can make moves');
//       return false;
//     }
  
//     // CRITICAL: Use chess.js as source of truth for whose turn it is
//     const chessJSTurn = game.turn(); // 'w' or 'b'
//     const playerChessColor = getPlayerColor();
    
//     // Check if it's the player's turn according to chess.js position
//     if (playerChessColor !== chessJSTurn) {
//       console.log(`Not your turn according to chess position! Chess.js turn: ${chessJSTurn}, Your color: ${playerChessColor}`);
//       return false;
//     }
  
//     // Additional check: verify backend state matches chess.js state
//     if (gameState.currentTurn !== currentPlayer) {
//       console.log(`Not your turn according to backend! Backend turn: ${gameState.currentTurn}, Your ID: ${currentPlayer}`);
//       return false;
//     }
  
//     return true;
//   };

//   const handleMove = ({ sourceSquare, targetSquare }: { 
//     sourceSquare: string; 
//     targetSquare: string 
//   }) => {
//     try {
//       console.log(`Attempting move: ${sourceSquare} -> ${targetSquare}`);
      
//       // Validate move using canMakeMove first
//       if (!canMakeMove()) {
//         console.log('Move blocked by canMakeMove validation');
//         return null;
//       }
  
//       // Create a fresh chess instance to test the move
//       const testGame = new Chess(game.fen());
  
//       // Try to make the move without promotion first
//       let move = testGame.move({
//         from: sourceSquare,
//         to: targetSquare,
//       });
  
//       let promotionChar = '';
//       if (!move) {
//         // If failed, try with promotion
//         move = testGame.move({
//           from: sourceSquare,
//           to: targetSquare,
//           promotion: 'q',
//         });
//         promotionChar = 'q';
//       }
  
//       if (move) {
//         console.log('Valid move made locally:', move);
        
//         // Update local state immediately for responsive UI
//         game.load(testGame.fen());
//         setFen(testGame.fen());
        
//         // Send move to server
//         onChessMove(`${sourceSquare}${targetSquare}${promotionChar}`);
        
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
    
//     // Check if current user is a chess player
//     const isPlayer1 = gameState.chessPlayers.player1Id === currentPlayer;
//     const isPlayer2 = gameState.chessPlayers.player2Id === currentPlayer;
    
//     if (!isPlayer1 && !isPlayer2) {
//       return 'You are spectating this chess game';
//     }
    
//     // Use chess.js turn state as the source of truth
//     const chessJSTurn = game.turn(); // 'w' or 'b'
//     const playerChessColor = getPlayerColor();
    
//     // Also check backend state for consistency
//     const isBackendTurn = gameState.currentTurn === currentPlayer;
    
//     if (playerChessColor === chessJSTurn && isBackendTurn) {
//       return 'Your turn to move';
//     } else {
//       // Determine opponent
//       const opponentId = isPlayer1 ? gameState.chessPlayers.player2Id : gameState.chessPlayers.player1Id;
//       const opponentName = playerIdToUsername[opponentId] || 
//                           gameState.players.find((p: any) => p.id === opponentId)?.name || 
//                           'Opponent';
//       const opponentColor = chessJSTurn === 'w' ? 'White' : 'Black';
//       return `${opponentName}'s turn (${opponentColor})`;
//     }
//   };

//   // FIXED: Simpler draggable logic
//   const isDraggable = (): boolean => {
//     return canMakeMove();
//   };

//   // Get current player names for display
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
//       <Fireworks 
//         show={showFireworks} 
//         onComplete={() => setShowFireworks(false)} 
//       />
      
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
//         {game && game.fen() !== 'start' && (
//           <div className="text-xs text-gray-600 space-y-1">
//             {game.inCheck() && (
//               <p className="text-yellow-500">Check!</p>
//             )}
//             <p>Move #{game.moveNumber()}</p>
//             <p>Turn: {game.turn() === 'w' ? 'White' : 'Black'}</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

