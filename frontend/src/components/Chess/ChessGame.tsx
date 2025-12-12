import React, { useEffect, useState, useRef, useCallback } from 'react';
import Chessboard from 'chessboardjsx';
import { Chess, Square } from 'chess.js';
import { Trophy, Crown } from 'lucide-react';

interface PlayerPoints {
  playerId: string;
  name: string;
  color?: string;
  position: number;
  points: number;
}

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
  const [showPointsTable, setShowPointsTable] = useState(false);
  const [playerPoints, setPlayerPoints] = useState<PlayerPoints[]>([]);
  
  // New state for click-to-move
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  
  // ✅ NEW: Responsive board width state
  const [boardWidth, setBoardWidth] = useState(500);
  const containerRef = useRef<HTMLDivElement>(null);

  // ✅ RESPONSIVE WIDTH CALCULATION
  useEffect(() => {
    const updateBoardWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const newWidth = Math.min(500, Math.max(280, containerWidth * 0.85));
        setBoardWidth(newWidth);
      } else {
        // Fallback for SSR
        const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 500;
        setBoardWidth(Math.min(500, Math.max(280, windowWidth * 0.85)));
      }
    };

    updateBoardWidth();
    window.addEventListener('resize', updateBoardWidth);
    return () => window.removeEventListener('resize', updateBoardWidth);
  }, []);

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

    const player = gameState.players?.find((p: any) => p.id === currentPlayer);
    if (player?.chessColor) {
      setPlayerColor(player.chessColor);
      console.log(`Player ${currentPlayer} is playing as ${player.chessColor}`);
    }

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
      
      if (data.board) {
        try {
          const moveTimestamp = data.timestamp || Date.now();
          if (moveTimestamp > lastProcessedMove) {
            gameRef.current = new Chess(data.board);
            setFen(data.board);
            setLastProcessedMove(moveTimestamp);
            
            // Clear selection after opponent's move
            setSelectedSquare(null);
            setValidMoves([]);
            
            if (data.currentTurn !== undefined) {
              const myTurn = data.currentTurn === currentPlayer;
              setIsMyTurn(myTurn);
              console.log(`Turn updated from move: currentTurn=${data.currentTurn}, isMyTurn=${myTurn}`);
            }
            
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
        
        if (myTurn) {
          setGameStatus("Your turn!");
          setTimeout(() => setGameStatus(''), 3000);
        }
      }
    };

    const handleChessMoveError = (data: any) => {
      console.error('Chess move error:', data);
      if (gameState?.chessState?.board) {
        gameRef.current = new Chess(gameState.chessState.board);
        setFen(gameState.chessState.board);
      }
      setSelectedSquare(null);
      setValidMoves([]);
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

  // Handle square click for click-to-move
  const handleSquareClick = useCallback((square: string) => {
    console.log(`Square clicked: ${square}, isMyTurn=${isMyTurn}, selectedSquare=${selectedSquare}`);
    
    // Check if it's player's turn
    if (!isMyTurn) {
      console.log("Not your turn - blocked");
      setGameStatus("Not your turn!");
      setTimeout(() => setGameStatus(''), 2000);
      return;
    }

    // Check if moving correct color
    const moveColor = gameRef.current.turn();
    const expectedColor = playerColor === 'white' ? 'w' : 'b';
    
    if (moveColor !== expectedColor) {
      console.log(`Wrong color turn: moveColor=${moveColor}, expectedColor=${expectedColor}`);
      setGameStatus("Not your color's turn!");
      setTimeout(() => setGameStatus(''), 2000);
      return;
    }

    // If no square is selected, select this one (if it has a piece of the player's color)
    if (!selectedSquare) {
      const sq = square as Square;
      const piece = gameRef.current.get(sq);
      
      if (piece && piece.color === expectedColor) {
        // Get all valid moves for this piece
        const moves = gameRef.current.moves({ square: sq, verbose: true });
        const targetSquares = moves.map(m => m.to);
        
        if (targetSquares.length > 0) {
          setSelectedSquare(square);
          setValidMoves(targetSquares);
          console.log(`Selected ${square}, valid moves:`, targetSquares);
        } else {
          setGameStatus("No valid moves for this piece");
          setTimeout(() => setGameStatus(''), 2000);
        }
      } else {
        setGameStatus("Select one of your pieces");
        setTimeout(() => setGameStatus(''), 2000);
      }
    } else {
      // A square is already selected
      if (square === selectedSquare) {
        // Clicking the same square deselects it
        setSelectedSquare(null);
        setValidMoves([]);
        console.log("Deselected square");
      } else if (validMoves.includes(square)) {
        // Valid move - execute it
        try {
          const tempGame = new Chess(gameRef.current.fen());
          const move = tempGame.move({
            from: selectedSquare,
            to: square,
            promotion: 'q',
          });

          if (move) {
            console.log(`Move valid locally: ${move.san}`);
            
            const moveString = `${selectedSquare}${square}${move.promotion || ''}`;
            console.log(`Sending move to server: ${moveString}`);
            onChessMove(moveString);
            
            // Optimistically update UI
            gameRef.current = tempGame;
            setFen(tempGame.fen());
            setSelectedSquare(null);
            setValidMoves([]);
            setIsMyTurn(false);
            setGameStatus("Move sent...");
            setTimeout(() => setGameStatus(''), 1000);
          }
        } catch (e) {
          console.error('Move error:', e);
          setGameStatus("Error making move!");
          setTimeout(() => setGameStatus(''), 2000);
          setSelectedSquare(null);
          setValidMoves([]);
        }
      } else {
        // Clicked another piece of the player's color - switch selection
        const sq = square as Square;
        const piece = gameRef.current.get(sq);
        if (piece && piece.color === expectedColor) {
          const moves = gameRef.current.moves({ square: sq, verbose: true });
          const targetSquares = moves.map(m => m.to);
          
          if (targetSquares.length > 0) {
            setSelectedSquare(square);
            setValidMoves(targetSquares);
            console.log(`Switched to ${square}, valid moves:`, targetSquares);
          } else {
            setGameStatus("No valid moves for this piece");
            setTimeout(() => setGameStatus(''), 2000);
            setSelectedSquare(null);
            setValidMoves([]);
          }
        } else {
          // Invalid target square
          setGameStatus("Invalid move!");
          setTimeout(() => setGameStatus(''), 2000);
          setSelectedSquare(null);
          setValidMoves([]);
        }
      }
    }
  }, [isMyTurn, playerColor, onChessMove, selectedSquare, validMoves]);

  // Get game status display
  const getGameStatusDisplay = () => {
    if (gameStatus) {
      return gameStatus;
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
    
    if (selectedSquare) {
      return 'Click a highlighted square to move';
    }
    
    return isMyTurn ? 'Your turn - Select a piece to move' : "Waiting for opponent's move";
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

  // Custom square styles to highlight selected and valid moves
  const getSquareStyles = () => {
    const styles: Record<string, React.CSSProperties> = {};
    
    // Highlight selected square
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(255, 255, 0, 0.4)',
        cursor: 'pointer'
      };
    }
    
    // Highlight valid move targets
    validMoves.forEach(square => {
      styles[square] = {
        background: 'radial-gradient(circle, rgba(0, 255, 0, 0.5) 25%, transparent 25%)',
        cursor: 'pointer'
      };
    });
    
    return styles;
  };



  // Add this useEffect to handle game restarts specifically
useEffect(() => {
  if (!socket) return;

  const handleGameRestarted = (data: any) => {
    console.log('===== CHESS GAME RESTARTED =====');
    
    // Reset all local state
    gameRef.current = new Chess();
    setFen('start');
    setSelectedSquare(null);
    setValidMoves([]);
    setLastProcessedMove(0);
    
    // If we have new game state, apply it
    if (data.gameState) {
      try {
        if (data.gameState.chessState?.board) {
          gameRef.current = new Chess(data.gameState.chessState.board);
          setFen(data.gameState.chessState.board);
        }
      } catch (e) {
        console.error('Failed to load chess position after restart:', e);
        gameRef.current = new Chess();
        setFen(gameRef.current.fen());
      }
    }
    
    setGameStatus('Game restarted!');
    setTimeout(() => setGameStatus(''), 3000);
  };

  socket.on('gameRestarted', handleGameRestarted);

  return () => {
    socket.off('gameRestarted', handleGameRestarted);
  };
}, [socket]);

  useEffect(() => {
    if (gameState.gameOver && !showPointsTable) {
      calculateChessPoints();
      setTimeout(() => setShowPointsTable(true), 1000);
    }
  }, [gameState.gameOver, gameState.winner]);

  const calculateChessPoints = () => {
    if (!gameState.players) return;
    
    // Winner 20, Loser 2
    const pointsData = gameState.players.map((p: any) => {
      const isWinner = p.id === gameState.winner;
      return {
        playerId: p.id,
        name: p.name,
        color: p.chessColor,
        position: isWinner ? 1 : 2,
        points: isWinner ? 20 : 2
      };
    });
    
    // Sort so winner is first
    pointsData.sort((a: any, b: any) => a.position - b.position);
    
    setPlayerPoints(pointsData);
  };

  const handleRestartGame = () => {
    if (socket) {
        socket.emit('restartGame', { roomId, hostId: currentPlayer });
    }
  };


  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="mb-4 text-center">
        <h3 className="text-xl font-bold text-white mb-2">Chess Game</h3>
      </div>
      
      {/* ✅ RESPONSIVE CONTAINER */}
      <div ref={containerRef} className="w-full max-w-[90vw] mb-4 px-2">
        <Chessboard
          position={fen}
          onSquareClick={handleSquareClick}
          orientation={playerColor}
          draggable={false}
          boardStyle={{
            borderRadius: '8px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
          }}
          // ✅ DYNAMIC RESPONSIVE WIDTH
          width={boardWidth}
          transitionDuration={300}
          darkSquareStyle={{ backgroundColor: '#B58863' }}
          lightSquareStyle={{ backgroundColor: '#F0D9B5' }}
          squareStyles={getSquareStyles()}
        />
      </div>
      
      {/* ✅ RESPONSIVE STATUS SECTION */}
      <div className="text-center space-y-2 w-full max-w-lg px-2">
        <p className={`text-lg font-semibold ${
          isMyTurn ? 'text-green-400 animate-pulse' : 'text-gray-400'
        }`}>
          {getGameStatusDisplay()}
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm">
          <div className="text-gray-500 text-center sm:text-left">
            You are: <span className="font-bold text-white">
              {playerColor === 'white' ? '⚪ White' : '⚫ Black'}
            </span>
          </div>
          
          <div className="text-gray-500 text-center sm:text-left">
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
        
        {selectedSquare && (
          <p className="text-xs text-blue-400 mt-2">
            Selected: {selectedSquare.toUpperCase()} • Click to deselect
          </p>
        )}
      </div>

      {/* Points Table Modal */}
      {showPointsTable && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl border border-purple-500/30 max-w-md w-full p-6 shadow-2xl">
            <div className="text-center mb-6">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">Game Results</h2>
              <p className="text-purple-200">Final Points Distribution</p>
            </div>

            <div className="space-y-3 mb-6">
              {playerPoints.map((player, index) => (
                <div
                  key={player.playerId}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 ${
                    index === 0
                      ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-400 shadow-lg shadow-yellow-500/25'
                      : 'bg-gradient-to-r from-purple-800/20 to-purple-900/20 border-purple-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
                      {index === 0 ? <Crown className="w-5 h-5 text-yellow-400" /> : 
                       <span className="text-white text-sm font-bold">{index + 1}</span>}
                    </div>
                    <span className="text-white font-semibold">{player.name || player.playerId}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-2xl font-bold text-white">{player.points}</span>
                    <span className="text-xs text-yellow-400 uppercase tracking-wider font-bold">PTS</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowPointsTable(false);
                  handleRestartGame();
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all transform hover:scale-105"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChessGame;
