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
  const [showFireworks, setShowFireworks] = useState(false);

  // Sync the local game state with the server state
  useEffect(() => {
    if (gameState?.chessState?.board) {
      try {
        // Load the board state from server
        game.load(gameState.chessState.board);
        setFen(game.fen());
        
        console.log('Chess board synced:', {
          serverBoard: gameState.chessState.board,
          localBoard: game.fen(),
          turn: game.turn(),
          currentTurn: gameState.currentTurn
        });
      } catch (e) {
        console.error('Failed to load chess position:', e);
        // Reset to initial position if loading fails
        game.reset();
        setFen(game.fen());
      }
    } else {
      // Reset to initial position if no server state
      game.reset();
      setFen(game.fen());
    }
  }, [gameState?.chessState?.board, game]);

  // Set player color based on gameState players
  useEffect(() => {
    if (gameState?.players) {
      const player = gameState.players.find((p: any) => p.id === currentPlayer);
      if (player?.chessColor) {
        setPlayerColor(player.chessColor);
        console.log('Player color set:', {
          playerId: currentPlayer,
          chessColor: player.chessColor
        });
      }
    }
  }, [gameState?.players, currentPlayer]);

  // Show fireworks when game ends
  useEffect(() => {
    if (gameState?.gameOver && !showFireworks) {
      setShowFireworks(true);
    }
  }, [gameState?.gameOver, showFireworks]);

  const handleMove = ({ sourceSquare, targetSquare }: { 
    sourceSquare: string; 
    targetSquare: string 
  }) => {
    try {
      console.log('Move attempt:', {
        from: sourceSquare,
        to: targetSquare,
        currentPlayer,
        currentTurn: gameState.currentTurn,
        gameStarted: gameState.gameStarted,
        gameOver: gameState.gameOver
      });

      // Check if game has started
      if (!gameState.gameStarted) {
        console.log("Game has not started yet");
        return null;
      }

      // Check if it's the player's turn
      if (gameState.currentTurn !== currentPlayer) {
        console.log("Not your turn - current turn:", gameState.currentTurn, "your ID:", currentPlayer);
        return null;
      }

      // Check if the game is over
      if (gameState.gameOver) {
        console.log("Game is over");
        return null;
      }

      // Get player's color and validate against chess board turn
      const player = gameState.players.find((p: any) => p.id === currentPlayer);
      if (!player) {
        console.log("Player not found in game state");
        return null;
      }

      const currentBoardTurn = game.turn(); // 'w' or 'b'
      const expectedColor = currentBoardTurn === 'w' ? 'white' : 'black';
      
      // Validate that the player's color matches the current chess turn
      if (player.chessColor !== expectedColor) {
        console.log("Color mismatch:", {
          playerColor: player.chessColor,
          expectedColor,
          boardTurn: currentBoardTurn
        });
        return null;
      }

      // Create a temporary game instance to test the move
      const tempGame = new Chess(game.fen());
      
      // Try to make the move
      const move = tempGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Auto-promote to queen
      });

      if (!move) {
        console.log("Invalid move attempted");
        return null;
      }

      console.log('Valid move detected:', {
        move: move.san,
        from: sourceSquare,
        to: targetSquare,
        newFen: tempGame.fen()
      });

      // Update local state immediately for responsive UI
      game.load(tempGame.fen());
      setFen(game.fen());
      
      // Send move to server
      const moveNotation = `${sourceSquare}${targetSquare}`;
      onChessMove(moveNotation);
      
      return move;
    } catch (e) {
      console.error('Move error:', e);
      return null;
    }
  };

  // Get current player info for display
  const getCurrentPlayerInfo = () => {
    if (!gameState?.players) return { name: 'Unknown', color: 'white' };
    
    const currentTurnPlayer = gameState.players.find((p: any) => p.id === gameState.currentTurn);
    if (!currentTurnPlayer) return { name: 'Unknown', color: 'white' };
    
    return {
      name: currentTurnPlayer.name || currentTurnPlayer.id,
      color: currentTurnPlayer.chessColor || 'white'
    };
  };

  const getGameStatus = () => {
    if (gameState?.gameOver) {
      if (gameState.winner === 'draw') {
        return "Game Over - Draw!";
      }
      const winnerPlayer = gameState.players.find((p: any) => p.id === gameState.winner);
      return `Game Over! Winner: ${winnerPlayer?.name || gameState.winner}`;
    }
    
    if (!gameState?.gameStarted) {
      return "Game not started yet";
    }
    
    const currentPlayerInfo = getCurrentPlayerInfo();
    const isMyTurn = gameState.currentTurn === currentPlayer;
    
    return isMyTurn 
      ? `Your turn (${playerColor})` 
      : `${currentPlayerInfo.name}'s turn (${currentPlayerInfo.color})`;
  };

  // Determine if the board should be draggable
  const isDraggable = () => {
    return (
      gameState?.gameStarted && 
      !gameState?.gameOver && 
      gameState?.currentTurn === currentPlayer
    );
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
      
      <div className="text-center space-y-2">
        <p className="text-gray-300 font-medium">
          {getGameStatus()}
        </p>
        
        <div className="text-sm text-gray-400 space-y-1">
          <p>You are playing as: <span className="text-white">{playerColor}</span></p>
          
          {gameState?.chessState?.moves?.length > 0 && (
            <p>Last move: <span className="text-white">{gameState.chessState.moves.slice(-1)[0]}</span></p>
          )}
          
          {gameState?.gameStarted && !gameState?.gameOver && (
            <p className="text-xs">
              {isDraggable() ? "🟢 You can move" : "🔴 Wait for your turn"}
            </p>
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
    
    
    
    
//     console.log('ChessGame State Updated:', {
//       board: gameState.chessState?.board,
//       currentTurn: gameState.currentTurn,
//       currentPlayer,
//       gameStarted: gameState.gameStarted,
//       gameOver: gameState.gameOver
//     });
//   }, [gameState, currentPlayer]);

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


//   // Update your handleMove to use localGameState
//   const handleMove = ({ sourceSquare, targetSquare }: { 
//     sourceSquare: string; 
//     targetSquare: string 
//   }) => {
//     try {
//       // Check if it's the player's turn
//       if (gameState.currentTurn !== currentPlayer) {
//         console.log("Not your turn");
//         return null;
//       }
  
//       // Check if the game is over
//       if (gameState.gameOver) {
//         console.log("Game is over");
//         return null;
//       }
  
//       const player = gameState.players.find((p: any) => p.id === currentPlayer);
//       const moveColor = game.turn();
      
//       // Validate player color matches current turn
//       if ((moveColor === 'w' && player?.chessColor !== 'white') || 
//           (moveColor === 'b' && player?.chessColor !== 'black')) {
//         console.log("Not your color's turn");
//         return null;
//       }
  
//       // Try to make the move
//       const move = game.move({
//         from: sourceSquare,
//         to: targetSquare,
//         promotion: 'q',
//       });
  
//       if (move) {
//         // Update local state immediately for responsive UI
//         setFen(game.fen());
        
//         // Send move to server
//         onChessMove(`${sourceSquare}${targetSquare}`);
//       }
//     } catch (e) {
//       console.error('Invalid move:', e);
//       return null;
//     }
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
//           draggable={gameState.currentTurn === currentPlayer && !gameState.gameOver}
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
