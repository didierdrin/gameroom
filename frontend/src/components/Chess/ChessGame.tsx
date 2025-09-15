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
  // const [game, setGame] = useState(new Chess());
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

    // Set player color
    const player = gameState.players.find((p: any) => p.id === currentPlayer);
    setPlayerColor(player?.chessColor || 'white');
    
    // Update local game state
    setLocalGameState(gameState);
    
    console.log('ChessGame State Updated:', {
      board: gameState.chessState?.board,
      currentTurn: gameState.currentTurn,
      currentPlayer,
      gameStarted: gameState.gameStarted,
      gameOver: gameState.gameOver
    });
  }, [gameState, currentPlayer]);

  // Show fireworks when game ends
  useEffect(() => {
    if (gameState.gameOver && !showFireworks) {
      setShowFireworks(true);
    }
  }, [gameState.gameOver, showFireworks]);

  // Debug logging
  useEffect(() => {
    console.log('ChessGame Debug:', {
      currentTurn: gameState.currentTurn,
      currentPlayer,
      gameOver: gameState.gameOver,
      playerColor,
      draggable: gameState.currentTurn === currentPlayer && !gameState.gameOver,
      players: gameState.players.map((p: any) => ({ id: p.id, chessColor: p.chessColor }))
    });
  }, [gameState.currentTurn, currentPlayer, gameState.gameOver, playerColor, gameState.players]);


  // Add this useEffect to debug turn changes
useEffect(() => {
  console.log('Turn changed:', {
    currentTurn: gameState.currentTurn,
    currentPlayer: currentPlayer,
    isMyTurn: gameState.currentTurn === currentPlayer,
    chessPlayers: gameState.chessPlayers
  });
}, [gameState.currentTurn, currentPlayer, gameState.chessPlayers]);


  // // Update your handleMove to use localGameState
  const handleMove = ({ sourceSquare, targetSquare }: { 
    sourceSquare: string; 
    targetSquare: string 
  }) => {
    try {
      // Check if it's the player's turn
      if (gameState.currentTurn !== currentPlayer) {
        console.log("Not your turn");
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
      }
  
      const player = gameState.players.find((p: any) => p.id === currentPlayer);
      const moveColor = game.turn();
      
      // Validate player color matches current turn
      if ((moveColor === 'w' && player?.chessColor !== 'white') || 
          (moveColor === 'b' && player?.chessColor !== 'black')) {
        console.log("Not your color's turn");
        return null;
      }
  
      // Try to make the move
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
  
      if (move) {
        // Update local state immediately for responsive UI
        setFen(game.fen());
        
        // Send move to server
        onChessMove(`${sourceSquare}${targetSquare}`);
        
        return move;
      }
    } catch (e) {
      console.error('Invalid move:', e);
      return null;
    }
    return null;
  };

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
  
  //     const player = gameState.players.find((p: any) => p.id === currentPlayer);
  //     const moveColor = game.turn();
      
  //     // Validate player color matches current turn
  //     if ((moveColor === 'w' && player?.chessColor !== 'white') || 
  //         (moveColor === 'b' && player?.chessColor !== 'black')) {
  //       console.log("Not your color's turn");
  //       return null;
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
  //     }
  //   } catch (e) {
  //     console.error('Invalid move:', e);
  //     return null;
  //   }
  // };

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
          {gameState.gameOver 
            ? `Game Over! Winner: ${gameState.winner}`
            : gameState.chessPlayers && 
              gameState.chessPlayers.player1Id !== currentPlayer && 
              gameState.chessPlayers.player2Id !== currentPlayer
            ? 'You are spectating this chess game'
            : `Current Turn: ${gameState.currentTurn === currentPlayer 
                ? 'Your turn' 
                : 'Opponent\'s turn'}`}
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
      </div>
    </div>
  );
};

