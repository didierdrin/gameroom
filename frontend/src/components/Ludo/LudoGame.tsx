import React, { useEffect, useState } from 'react';
import { GameState } from '../Ludo/types/game';
import { Dice } from './Dice';
import { SocketType } from "../../SocketContext";
import { Fireworks } from '../UI/Fireworks';
import { useUsername } from '../../hooks/useUsername';
import { MapPin, Star } from 'lucide-react';
import { useUserData } from '../../hooks/useUserData';

export interface LudoGameProps {
  gameState: GameState;
  currentPlayerId: string;
  onRollDice: () => void;
  onMoveCoin: (coinId: string) => void;
  onStartGame: () => void;
  socket: SocketType;
  roomId: string;
}

interface PlayerPoints {
  playerId: string;
  name: string;
  color?: string;
  position: number;
  points: number;
}

export const LudoGame: React.FC<LudoGameProps> = ({
  gameState,
  currentPlayerId,
  onRollDice,
  onMoveCoin,
  onStartGame,
}) => {
  const [movableCoins, setMovableCoins] = useState<number[]>([]);
  const [showFireworks, setShowFireworks] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [animatingCoin, setAnimatingCoin] = useState<{playerIndex: number, coinIndex: number, path: number[][], color: string} | null>(null);
  const [animationStep, setAnimationStep] = useState(0);

  if (!gameState || !currentPlayerId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 to-blue-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading Ludo Game...</div>
        </div>
      </div>
    );
  }

  const { players, currentPlayer, diceValue, diceRolled, winner, gameStarted, coins } = gameState;
  
  // Show fireworks and leaderboard when game ends
  useEffect(() => {
    if (winner !== null && !showFireworks) {
      setShowFireworks(true);
      const leaderboard = getLeaderboardData();
      setLeaderboardData(leaderboard);
    }
  }, [winner, showFireworks]);

  const getLeaderboardData = () => {
    if (!players || !coins) return [];

    const playerProgress = players.map(player => {
      const playerCoins = coins[player.id] || [0, 0, 0, 0];
      const coinsHome = playerCoins.filter(pos => pos === 57).length;
      return {
        playerId: player.id,
        name: player.name,
        coinsHome,
        totalProgress: playerCoins.reduce((sum, pos) => sum + pos, 0)
      };
    });

    const sortedPlayers = [...playerProgress].sort((a, b) => {
      if (b.coinsHome !== a.coinsHome) return b.coinsHome - a.coinsHome;
      return b.totalProgress - a.totalProgress;
    });

    const pointsMap: { [key: number]: number } = { 1: 20, 2: 15, 3: 10, 4: 5 };

    return sortedPlayers.map((player, index) => ({
      _id: player.playerId,
      score: pointsMap[index + 1] || 0,
      name: player.name,
      coinsHome: player.coinsHome
    }));
  };

  useEffect(() => {
    if (gameStarted && !gameState.gameOver && diceRolled && players[currentPlayer]?.id === currentPlayerId) {
      const currentPlayerData = players[currentPlayer];
      const playerCoins = coins![currentPlayerData.id] || [0, 0, 0, 0];
      const movable: number[] = [];
      
      // Get player index for calculations
      const playerIndex = players.findIndex(p => p.id === currentPlayerId);
      
      playerCoins.forEach((position, coinIndex) => {
        // Coin in base - can only move with 6
        if (position === 0) {
          if (diceValue === 6) {
            movable.push(coinIndex);
          }
          return;
        }
        
        // Coin already home - cannot move
        if (position === 57) {
          return;
        }
        
        const newPosition = position + diceValue!;
        
        // Cannot exceed home position
        if (newPosition > 57) {
          return;
        }
        
        // Check if entering home stretch
        if (position < 52 && newPosition >= 52) {
          const stepsFromStart = position - 1;
          // Must complete ~51 steps before entering home
          if (stepsFromStart >= 50) {
            movable.push(coinIndex);
          }
          return;
        }
        
        // Regular move or move within home stretch
        movable.push(coinIndex);
      });
      
      console.log(`Movable coins for player ${playerIndex}:`, movable, 'Dice:', diceValue);
      setMovableCoins(movable);
    } else {
      setMovableCoins([]);
    }
  }, [diceRolled, diceValue, currentPlayer, players, currentPlayerId, coins, gameStarted, gameState.gameOver]);
  
  // Animation effect
  useEffect(() => {
    if (!animatingCoin) return;
    
    if (animationStep < animatingCoin.path.length) {
      const timer = setTimeout(() => {
        setAnimationStep(prev => prev + 1);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      // Animation complete, execute move
      const coinId = `${players[animatingCoin.playerIndex].color}-${animatingCoin.coinIndex + 1}`;
      onMoveCoin(coinId);
      setAnimatingCoin(null);
      setAnimationStep(0);
    }
  }, [animatingCoin, animationStep]);
  
  
  const boardPath: number[][] = [
    // RED starting area (position 0) - moving right
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], 
    // Corner to BLUE area
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7], [0, 8],
    // BLUE starting area (position 13) - moving down
    [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    // Corner to GREEN area
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    [7, 14], [8, 14],
    // GREEN starting area (position 26) - moving left
    [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    // Corner to YELLOW area
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    [14, 7], [14, 6],
    // YELLOW starting area (position 39) - moving up
    [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    // Back to RED area
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    [7, 0], [6, 0] // Position 51
  ];


  
  // Starting positions for each player (Red: 0, Blue: 1, Green: 2, Yellow: 3)  
  // const startPositions: number[] = [1, 14, 27, 40];
  const startPositions: number[] = [0, 13, 26, 39]; // Red, Blue, Green, Yellow
  const safePositions = [0, 8, 13, 21, 26, 34, 39, 47];

const homeStretch: { [key: number]: number[][] } = {
  0: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], // Red
  1: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]], // Blue
  2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], // Green
  3: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], // Yellow
};


  const handleMoveCoin = (coinIndex: number) => {
    if (!gameStarted || gameState.gameOver || winner) return;
    if (players[currentPlayer]?.id !== currentPlayerId) return;
    if (!diceRolled) return;
    if (!movableCoins.includes(coinIndex)) return;
    
    const playerIndex = currentPlayer;
    const currentPos = coins![players[playerIndex].id][coinIndex];
    const newPos = currentPos === 0 ? 1 : currentPos + diceValue!;
    
    // Build animation path
    const path: number[][] = [];
    for (let i = currentPos === 0 ? 1 : currentPos + 1; i <= newPos; i++) {
      const pos = getBoardPosition(playerIndex, i);
      if (pos) path.push(pos);
    }
    
    setAnimatingCoin({
      playerIndex,
      coinIndex,
      path,
      color: players[playerIndex].color || 'gray'
    });
    setAnimationStep(0);
  };

  const getBoardPosition = (playerIndex: number, position: number): number[] | null => {
    if (position === 0) return null; // Coin in base
    if (position === 57) return [7, 7]; // Home center
    
    // Home stretch positions (52-57)
    if (position >= 52 && position <= 57) {
      const homeIndex = position - 52;
      return homeStretch[playerIndex][homeIndex];
    }
    
    // Regular board positions (1-51)
    const pathIndex = (startPositions[playerIndex] + (position - 1)) % 52;
    return boardPath[pathIndex];
  };



  const getCellColor = (row: number, col: number): string => {
    // Safe star positions - stars and special color
    const safeStarsWithStars = [[2, 6], [8, 2], [12, 8], [6, 12]];
    const safeStarsWithoutStars = [[6, 1], [13, 6], [8, 13], [1, 8]];
    
    // Map entry points to player colors
    const entryPointColors: {[key: string]: string} = {
      '6,1': 'red',      // Red entry
      '1,8': 'blue',     // Blue entry
      '8,13': 'green',   // Green entry
      '13,6': 'yellow'   // Yellow entry
    };
    
    // Center home area
    if (row === 7 && col === 7) return 'bg-gradient-to-br from-purple-600 to-pink-600';
    
    // Home stretch ends (where they connect to center)
    if (row === 6 && col === 7) return 'bg-gradient-to-br from-blue-500 to-blue-600';
    if (row === 7 && col === 6) return 'bg-gradient-to-br from-red-500 to-red-600';
    if (row === 8 && col === 7) return 'bg-gradient-to-br from-yellow-400 to-yellow-500';
    if (row === 7 && col === 8) return 'bg-gradient-to-br from-green-500 to-green-600';
    
    // Safe star positions with star icons
    if (safeStarsWithStars.some(([r, c]) => r === row && c === col)) {
      return 'bg-gradient-to-br from-indigo-700 to-indigo-800 border-2 border-indigo-500 shadow-inner';
    }
    
    // Entry point safe positions (colored by player)
    const posKey = `${row},${col}`;
    if (entryPointColors[posKey]) {
      const color = entryPointColors[posKey];
      return `bg-gradient-to-br from-${color}-800 to-${color}-900 border-2 border-${color}-600 shadow-inner`;
    }
    
    // Home stretch paths
    if (row === 7 && col >= 1 && col <= 5) {
      return 'bg-gradient-to-br from-red-800 to-red-900 border-2 border-red-600 shadow-inner';
    }
    if (col === 7 && row >= 1 && row <= 5) {
      return 'bg-gradient-to-br from-blue-800 to-blue-900 border-2 border-blue-600 shadow-inner';
    }
    if (row === 7 && col >= 9 && col <= 13) {
      return 'bg-gradient-to-br from-green-800 to-green-900 border-2 border-green-600 shadow-inner';
    }
    if (col === 7 && row >= 9 && row <= 13) {
      return 'bg-gradient-to-br from-yellow-700 to-yellow-800 border-2 border-yellow-600 shadow-inner';
    }
    
    // Regular board path
    if (boardPath.some(([r, c]) => r === row && c === col)) {
      return 'bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 shadow-sm';
    }
    
    // Player base areas
    const baseCells = {
      red: [[1, 1], [1, 3], [3, 1], [3, 3]],
      blue: [[1, 11], [1, 13], [3, 11], [3, 13]],
      green: [[11, 11], [11, 13], [13, 11], [13, 13]],
      yellow: [[11, 1], [11, 3], [13, 1], [13, 3]],
    };
    
    for (const [color, cells] of Object.entries(baseCells)) {
      if (cells.some(([r, c]) => r === row && c === col)) {
        return `bg-gradient-to-br from-${color}-900 to-${color}-950 border-2 border-${color}-700`;
      }
    }
    
    return 'bg-gradient-to-br from-gray-800 to-gray-900';
  };
  



  const getBasePositions = (playerIndex: number): number[][] => {
    const bases: { [key: number]: number[][] } = {
      0: [[1, 1], [1, 3], [3, 1], [3, 3]], // Red
      1: [[1, 11], [1, 13], [3, 11], [3, 13]], // Blue
      2: [[11, 11], [11, 13], [13, 11], [13, 13]], // Green
      3: [[11, 1], [11, 3], [13, 1], [13, 3]], // Yellow
    };
    return bases[playerIndex] || [];
  };

  // Get pin color styles based on player color
const getPinColor = (color: string | undefined) => { // Accept string | undefined
  switch (color) {
    case 'red':
      return 'text-red-500 fill-red-500';
    case 'blue':
      return 'text-blue-500 fill-blue-500';
    case 'green':
      return 'text-green-500 fill-green-500';
    case 'yellow':
      return 'text-yellow-400 fill-yellow-400';
    default:
      return 'text-gray-500 fill-gray-500';
  }
};

const renderBoard = () => {
  const board = [];
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      const cellColor = getCellColor(row, col);
      const coinsAtPosition: any[] = [];
      
      // Check if this is a star position
      const isStarPosition = [[2, 6], [8, 2], [12, 8], [6, 12]].some(([r, c]) => r === row && c === col);
      
      // Check for coins at this position
      players.forEach((player, playerIndex) => {
        const playerCoins = coins![player.id] || [0, 0, 0, 0];
        playerCoins.forEach((pos, coinIndex) => {
          // Coins on the board
          if (pos > 0) {
            const boardPos = getBoardPosition(playerIndex, pos);
            if (boardPos?.[0] === row && boardPos?.[1] === col) {
              coinsAtPosition.push({ playerIndex, coinIndex, player, pos });
            }
          }
          // Coins in base
          else if (pos === 0) {
            const basePos = getBasePositions(playerIndex);
            basePos.forEach((bp, idx) => {
              if (bp[0] === row && bp[1] === col && idx === coinIndex) {
                coinsAtPosition.push({ playerIndex, coinIndex, player, pos });
              }
            });
          }
        });
      });
      
      board.push(
        <div
          key={`${row}-${col}`}
          className={`flex items-center justify-center relative transition-all duration-200 hover:scale-105 ${cellColor}`}
          style={{ 
            aspectRatio: '1 / 1',
            minWidth: '100%',
            minHeight: '100%'
          }}
        >
          {/* Star icon for specific safe star positions */}
          {isStarPosition && coinsAtPosition.length === 0 && (
            <div className="flex items-center justify-center w-full h-full">
              <Star className="w-1/2 h-1/2 text-indigo-400 fill-indigo-500" />
            </div>
          )}
          
          {/* Animated coin overlay */}
          {animatingCoin && animationStep < animatingCoin.path.length && 
           animatingCoin.path[animationStep][0] === row && 
           animatingCoin.path[animationStep][1] === col && (
            <div
              className="flex items-center justify-center absolute z-50"
              style={{ width: '70%', height: '70%' }}
            >
              <div className="relative w-full h-full flex items-center justify-center animate-bounce">
                <MapPin className={`w-full h-full ${getPinColor(animatingCoin.color)} drop-shadow-2xl`} />
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-300">
                  <span className="text-gray-900 text-[8px] xs:text-[9px] sm:text-[10px] font-bold">
                    {animatingCoin.coinIndex + 1}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {coinsAtPosition.map((coin, idx) => (
            <div
              key={`${coin.playerIndex}-${coin.coinIndex}`}
              className={`flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-125 ${
                animatingCoin?.playerIndex === coin.playerIndex && animatingCoin?.coinIndex === coin.coinIndex ? 'opacity-0' : ''
              } ${
                movableCoins.includes(coin.coinIndex) && 
                coin.playerIndex === currentPlayer && 
                players[currentPlayer]?.id === currentPlayerId
                  ? 'animate-pulse ring-1 sm:ring-2 ring-white rounded-full'
                  : ''
              }`}
              onClick={() => handleMoveCoin(coin.coinIndex)}
              style={{
                position: 'absolute',
                transform: coinsAtPosition.length > 1 ? `translate(${idx * 2}px, ${idx * 2}px)` : 'none',
                zIndex: idx + 1,
                width: '70%',
                height: '70%'
              }}
              title={`${coin.player.name}'s coin ${coin.coinIndex + 1} at position ${coin.pos}`}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <MapPin 
                  className={`w-full h-full ${getPinColor(coin.player.color)} drop-shadow-lg`}
                />
                {/* Circular avatar badge for coin number */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-300">
                  <span className="text-gray-900 text-[8px] xs:text-[9px] sm:text-[10px] font-bold">
                    {coin.coinIndex + 1}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
  }
  return board;
};



  const currentPlayerUserId = players[currentPlayer]?.id || '';
const { username: currentPlayerName } = useUsername(currentPlayerUserId);
  
  // Use username resolver for winner
  const { username: winnerName } = useUsername(winner);
  const isCurrentPlayerTurn = players[currentPlayer]?.id === currentPlayerId;
  const canRollDice = gameStarted && !gameState.gameOver && !winner && isCurrentPlayerTurn && !diceRolled;

  const PlayerDisplay: React.FC<{ playerId: string }> = ({ playerId }) => {
    const { username, avatar } = useUserData(playerId);

    return (
      <div className="flex items-center">
        <img 
          src={avatar} 
          alt={username} 
          className="w-10 h-10 rounded-full border border-gray-600"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(playerId)}`;
          }}
        />
        <div className="ml-3">
          <div className="font-medium">{username || playerId}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center p-4  min-h-screen text-white">
      <Fireworks 
        show={showFireworks} 
        onComplete={() => setShowFireworks(false)} 
      />
      
      <div className='mb-6'></div>
    
      {/* Game Over Leaderboard */}
      {winner !== null && leaderboardData.length > 0 && (
        <div className="text-center p-6 mb-6 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700/50 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">
            {leaderboardData[0]._id === currentPlayerId ? 'Congratulations! 🎉' : 'Game Over!'}
          </h2>
          
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden mb-6">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {leaderboardData.map((player: any, index: number) => (
                  <tr key={player._id} className={index < 3 ? 'bg-gray-800/30' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-300' : 
                        index === 1 ? 'bg-gray-400/20 text-gray-300' : 
                        index === 2 ? 'bg-amber-700/20 text-amber-500' : 'bg-gray-700/50 text-gray-400'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PlayerDisplay playerId={player._id} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold">{player.score} points</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 px-8 rounded-xl font-bold shadow-lg transition-all transform hover:scale-105"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Winner announcement - only show if leaderboard not shown */}
      {winner !== null && leaderboardData.length === 0 && (
        <div className="mb-6 p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-2xl backdrop-blur-sm">
          <h2 className="text-3xl font-bold text-white text-center mb-3">
            🎉 {winnerName} Wins! 🎉
          </h2>
          <p className="text-green-200 text-center mb-4">
            Congratulations on an amazing victory!
          </p>
          <button
            onClick={() => {
              const leaderboard = getLeaderboardData();
              setLeaderboardData(leaderboard);
            }}
            className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 font-semibold shadow-lg"
          >
            View Results & Points
          </button>
        </div>
      )}
      
      {/* Start game button */}
      {!gameStarted && (
        <button
          onClick={onStartGame}
          className="mb-6 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-semibold text-lg shadow-2xl disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transform hover:scale-105"
          disabled={players.length < 2 || players[0].id !== currentPlayerId}
        >
          🚀 Start Game Adventure
        </button>
      )}
      
      {/* Game info */}
      <div className="flex gap-8 mb-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-3 text-purple-200">Current Player</h3>
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-2xl transition-all duration-300 ${
              players[currentPlayer]?.color === 'red'
                ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/50'
                : players[currentPlayer]?.color === 'blue'
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/50'
                : players[currentPlayer]?.color === 'green'
                ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-green-500/50'
                : 'bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-yellow-500/50'
            } ${isCurrentPlayerTurn ? 'ring-4 ring-white ring-offset-4 ring-offset-purple-900 animate-pulse' : 'opacity-80'}`}
          >
            {currentPlayerName}
          </div>
          {isCurrentPlayerTurn && (
            <p className="text-green-400 font-semibold mt-3 text-sm bg-green-500/20 px-3 py-1 rounded-full">
              ✨ Your Turn!
            </p>
          )}
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-3 text-purple-200">Dice Roll</h3>
          <Dice
            value={diceValue || 0}
            onRoll={onRollDice}
            disabled={!canRollDice}
          />
          {diceRolled && (
            <p className="text-blue-300 mt-3 text-sm bg-blue-500/20 px-3 py-1 rounded-full">
              Rolled: <span className="font-bold text-white">{diceValue}</span>
            </p>
          )}
        </div>
      </div>
      



{/* Game board */}
<div className="mb-4 sm:mb-6 md:mb-8 flex justify-center w-full px-2">
  <div className="w-full" style={{ maxWidth: 'min(95vw, 600px)' }}>
    <div className="grid grid-cols-15 grid-rows-15 gap-0 border-2 sm:border-4 border-gray-600 bg-gray-900 rounded-xl sm:rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden"
      style={{
        gridTemplateColumns: 'repeat(15, 1fr)',
        gridTemplateRows: 'repeat(15, 1fr)',
        width: '100%',
        height: 0,
        paddingBottom: '100%',
        position: 'relative'
      }}>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gridTemplateRows: 'repeat(15, 1fr)' }}>
        {renderBoard()}
      </div>
    </div>
  </div>
</div>
    
      
      {/* Player list */}
      <div className="mt-8 w-full max-w-2xl">
        <h3 className="text-2xl font-bold mb-4 text-white text-center">Players & Pins</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {players.map((player, index) => {
            const PlayerNameDisplay = ({ playerId }: { playerId: string }) => {
              const { username: playerName, isLoading } = useUsername(playerId);
              
              if (isLoading) return <span>Loading...</span>;
              
              if (playerId === currentPlayerId) {
                const currentUsername = localStorage.getItem('username');
                return <span>{currentUsername ? `${currentUsername} (You)` : 'You'}</span>;
              }
              
              return <span>{playerName || 'Unknown Player'}</span>;
            };
            
            return (
              <div
                key={player.id}
                className={`p-4 rounded-2xl border-2 backdrop-blur-sm transition-all duration-300 ${
                  index === currentPlayer && gameStarted
                    ? 'border-yellow-400 bg-yellow-500/20 shadow-lg shadow-yellow-500/25'
                    : 'border-white/20 bg-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <MapPin className={`w-8 h-8 ${getPinColor(player.color)}`} />
                    <span className="text-white text-xs mt-1 font-semibold">
                      {player.color}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white text-lg">
                      <PlayerNameDisplay playerId={player.id} />
                      {index === currentPlayer && gameStarted && (
                        <span className="ml-2 text-yellow-400 text-sm">🎯 Current</span>
                      )}
                    </p>
                    <p className="text-purple-200">
                      Pins Home: {coins![player.id]?.filter(pos => pos === 57).length || 0}/4
                    </p>
                    <div className="flex gap-1 mt-2">
                      {[0, 1, 2, 3].map((coinIndex) => {
                        const position = coins![player.id]?.[coinIndex] || 0;
                        return (
                          <div
                            key={coinIndex}
                            className={`w-3 h-3 rounded-full ${
                              position === 57 
                                ? 'bg-green-400' 
                                : position === 0 
                                ? 'bg-gray-400' 
                                : 'bg-yellow-400'
                            }`}
                            title={`Pin ${coinIndex + 1}: ${position === 57 ? 'Home' : position === 0 ? 'Base' : `Position ${position}`}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
