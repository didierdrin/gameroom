
import React, { useEffect, useState } from 'react';
import { GameState } from '../Ludo/types/game';
import { Dice } from './Dice';
import { SocketType } from "../../SocketContext";
import { Fireworks } from '../UI/Fireworks';
import { useUsername } from '../../hooks/useUsername';
import { Trophy, Award, Star, Crown, MapPin } from 'lucide-react';

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
  const [showPointsTable, setShowPointsTable] = useState(false);
  const [playerPoints, setPlayerPoints] = useState<PlayerPoints[]>([]);

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
  
  // Show fireworks and points table when game ends
  useEffect(() => {
    if (winner !== null && !showFireworks) {
      setShowFireworks(true);
      calculatePlayerPoints();
      setTimeout(() => setShowPointsTable(true), 2000);
    }
  }, [winner, showFireworks]);

  // Calculate player points based on finishing positions
  const calculatePlayerPoints = () => {
    if (!players || !coins) return;

    // Calculate player progress (coins in home)
    const playerProgress = players.map(player => {
      const playerCoins = coins[player.id] || [0, 0, 0, 0];
      const coinsHome = playerCoins.filter(pos => pos === 57).length;
      return {
        playerId: player.id,
        name: player.name,
        color: player.color || 'gray',
        coinsHome,
        totalProgress: playerCoins.reduce((sum, pos) => sum + pos, 0)
      };
    });

    // Sort by coins home (descending), then by total progress (descending)
    const sortedPlayers = [...playerProgress].sort((a, b) => {
      if (b.coinsHome !== a.coinsHome) {
        return b.coinsHome - a.coinsHome;
      }
      return b.totalProgress - a.totalProgress;
    });

    // Assign points based on position
    const pointsMap: { [key: number]: number } = {
      1: 10, // Winner
      2: 5,  // Second
      3: 2,  // Third
      4: 1   // Last
    };

    const pointsData = sortedPlayers.map((player, index) => ({
      ...player,
      position: index + 1,
      points: pointsMap[index + 1] || 0
    }));

    setPlayerPoints(pointsData);
  };

  // Calculate movable coins when it's the current player's turn
  useEffect(() => {
    if (gameStarted && !gameState.gameOver && diceRolled && players[currentPlayer]?.id === currentPlayerId) {
      const currentPlayerData = players[currentPlayer];
      const playerCoins = coins![currentPlayerData.id] || [0, 0, 0, 0];
      const movable: number[] = [];
      
      playerCoins.forEach((position, index) => {
        // Can move coin from base if dice is 6
        if (position === 0 && diceValue === 6) {
          movable.push(index);
        } 
        // Can move coin on board if it won't exceed home
        else if (position > 0 && position < 57 && position + diceValue! <= 57) {
          movable.push(index);
        }
        // Can move coin in home stretch if it won't exceed center
        else if (position >= 52 && position < 57 && position + diceValue! <= 57) {
          movable.push(index);
        }
      });
      
      setMovableCoins(movable);
    } else {
      setMovableCoins([]);
    }
  }, [diceRolled, diceValue, currentPlayer, players, currentPlayerId, coins, gameStarted, gameState.gameOver]);

  // Ludo board path (52 positions around the board)
  const boardPath: number[][] = [
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    [14, 7], [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    [7, 0], [6, 0],
  ];


  
  // Starting positions for each player (Red: 0, Blue: 1, Green: 2, Yellow: 3)  
  const startPositions: number[] = [1, 14, 27, 40];
  
  
  // Home stretch positions for each player (positions 52-57)
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
    
    const coinId = `${players[currentPlayer].color}-${coinIndex + 1}`;
    onMoveCoin(coinId);
  };

  const getBoardPosition = (playerIndex: number, position: number): number[] | null => {
    if (position === 0) return null; // Coin in base
    if (position === 57) return [7, 7]; // Home center
    
    // Home stretch positions (52-57)
    if (position > 51) {
      return homeStretch[playerIndex][position - 52];
    }
    
    // Regular board positions (1-51)
    // const adjusted = (position - 1 + startPositions[playerIndex]) % 52;
    const adjusted = (position - 2 + startPositions[playerIndex]) % 52;
    return boardPath[adjusted];
  };



  const getCellColor = (row: number, col: number): string => {
    // Safe star positions - add star and indigo color to these specific positions
    const safeStarsWithStars = [[2, 6], [8, 2], [12, 8], [6, 12]];
    const safeStarsWithoutStars = [[6, 1], [13, 6], [8, 13], [1, 8]];
    
    // Map safe stars without stars to player colors
    const safeStarPlayerMap: {[key: string]: string} = {
      '6,1': 'red',    // Top left area - Red player
      '13,6': 'yellow',  // Top right area - yellow player  
      '8,13': 'green', // Bottom right area - Green player
      '1,8': 'blue'  // Bottom left area - blue player
    };
    
    // Center home area
    if (row === 7 && col === 7) return 'bg-gradient-to-br from-purple-600 to-pink-600';
    
    // Player home areas
    if (row === 6 && col === 7) return 'bg-gradient-to-br from-blue-500 to-blue-600'; // blue home
    if (row === 7 && col === 6) return 'bg-gradient-to-br from-red-500 to-red-600'; // red home
    if (row === 8 && col === 7) return 'bg-gradient-to-br from-yellow-400 to-yellow-500'; // Yellow home
    if (row === 7 && col === 8) return 'bg-gradient-to-br from-green-500 to-green-600'; // Green home
    
    // Safe star positions with stars (indigo color)
    if (safeStarsWithStars.some(([r, c]) => r === row && c === col)) {
      return 'bg-gradient-to-br from-indigo-200 to-indigo-300 border-2 border-indigo-400 shadow-inner';
    }
    
    // Safe star positions without stars (use the color of the player side they belong to)
    if (safeStarsWithoutStars.some(([r, c]) => r === row && c === col)) {
      const positionKey = `${row},${col}`;
      const playerColor = safeStarPlayerMap[positionKey];
      
      switch (playerColor) {
        case 'red':
          return 'bg-gradient-to-br from-red-200 to-red-300 border-2 border-red-400 shadow-inner';
        case 'blue':
          return 'bg-gradient-to-br from-blue-200 to-blue-300 border-2 border-blue-400 shadow-inner';
        case 'green':
          return 'bg-gradient-to-br from-green-200 to-green-300 border-2 border-green-400 shadow-inner';
        case 'yellow':
          return 'bg-gradient-to-br from-yellow-200 to-yellow-300 border-2 border-yellow-400 shadow-inner';
        default:
          return 'bg-gradient-to-br from-emerald-200 to-emerald-300 border-2 border-yellow-400 shadow-inner';
      }
    }
    
    // Home stretch areas with player colors
    // Red home stretch (positions 52-56)
    if (row === 7 && col >= 1 && col <= 5) {
      return 'bg-gradient-to-br from-red-200 to-red-300 border-2 border-red-400 shadow-inner';
    }
    
    // Blue home stretch (positions 52-56)
    if (col === 7 && row >= 1 && row <= 5) {
      return 'bg-gradient-to-br from-blue-200 to-blue-300 border-2 border-blue-400 shadow-inner';
    }
    
    // Green home stretch (positions 52-56)
    if (row === 7 && col >= 9 && col <= 13) {
      return 'bg-gradient-to-br from-green-200 to-green-300 border-2 border-green-400 shadow-inner';
    }
    
    // Yellow home stretch (positions 52-56)
    if (col === 7 && row >= 9 && row <= 13) {
      return 'bg-gradient-to-br from-yellow-200 to-yellow-300 border-2 border-yellow-400 shadow-inner';
    }
    
    // Board path
    if (boardPath.some(([r, c]) => r === row && c === col)) {
      return 'bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 shadow-sm';
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
        return `bg-gradient-to-br from-${color}-100 to-${color}-200 border-2 border-${color}-300`;
      }
    }
    
    return 'bg-gradient-to-br from-gray-50 to-gray-100';
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
              <Star className="w-1/2 h-1/2 text-indigo-600 fill-indigo-300" />
            </div>
          )}
          
          {coinsAtPosition.map((coin, idx) => (
            <div
              key={`${coin.playerIndex}-${coin.coinIndex}`}
              className={`flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-125 ${
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
                {/* Small number indicator on the pin */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 text-white text-[8px] xs:text-[10px] sm:text-xs font-bold">
                  {coin.coinIndex + 1}
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

// const renderBoard = () => {
//   const board = [];
//   for (let row = 0; row < 15; row++) {
//     for (let col = 0; col < 15; col++) {
//       const cellColor = getCellColor(row, col);
//       const coinsAtPosition: any[] = [];
      
//       // Check if this is a star position
//       const isStarPosition = [[2, 6], [8, 2], [12, 8], [6, 12]].some(([r, c]) => r === row && c === col);
      
//       // Check for coins at this position
//       players.forEach((player, playerIndex) => {
//         const playerCoins = coins![player.id] || [0, 0, 0, 0];
//         playerCoins.forEach((pos, coinIndex) => {
//           // Coins on the board
//           if (pos > 0) {
//             const boardPos = getBoardPosition(playerIndex, pos);
//             if (boardPos?.[0] === row && boardPos?.[1] === col) {
//               coinsAtPosition.push({ playerIndex, coinIndex, player, pos });
//             }
//           }
//           // Coins in base
//           else if (pos === 0) {
//             const basePos = getBasePositions(playerIndex);
//             basePos.forEach((bp, idx) => {
//               if (bp[0] === row && bp[1] === col && idx === coinIndex) {
//                 coinsAtPosition.push({ playerIndex, coinIndex, player, pos });
//               }
//             });
//           }
//         });
//       });
      
//       board.push(
//         <div
//           key={`${row}-${col}`}
//           className={`w-10 h-10 flex items-center justify-center relative transition-all duration-200 hover:scale-105 ${cellColor}`}
//         >
//           {/* Star icon for specific safe star positions */}
//           {isStarPosition && coinsAtPosition.length === 0 && (
//             <Star className="w-5 h-5 text-indigo-600 fill-indigo-300 absolute" />
//           )}
          
//           {coinsAtPosition.map((coin, idx) => (
//             <div
//               key={`${coin.playerIndex}-${coin.coinIndex}`}
//               className={`flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-125 ${
//                 movableCoins.includes(coin.coinIndex) && 
//                 coin.playerIndex === currentPlayer && 
//                 players[currentPlayer]?.id === currentPlayerId
//                   ? 'animate-pulse ring-4 ring-white ring-offset-2 rounded-full'
//                   : ''
//               }`}
//               onClick={() => handleMoveCoin(coin.coinIndex)}
//               style={{
//                 position: coinsAtPosition.length > 1 ? 'absolute' : 'static',
//                 transform: coinsAtPosition.length > 1 ? `translate(${idx * 3}px, ${idx * 3}px)` : 'none',
//                 zIndex: idx + 1,
//               }}
//               title={`${coin.player.name}'s coin ${coin.coinIndex + 1} at position ${coin.pos}`}
//             >
//               <div className="relative">
//                 <MapPin 
//                   className={`w-7 h-7 ${getPinColor(coin.player.color)} drop-shadow-lg`}
//                 />
//                 {/* Small number indicator on the pin */}
//                 <div className="absolute top-1 left-1/2 transform -translate-x-1/2 -translate-y-1 text-white text-xs font-bold">
//                   {coin.coinIndex + 1}
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       );
//     }
//   }
//   return board;
// };
  
  

  const currentPlayerUserId = players[currentPlayer]?.id || '';
const { username: currentPlayerName } = useUsername(currentPlayerUserId);
  
  // Use username resolver for winner
  const { username: winnerName } = useUsername(winner);
  const isCurrentPlayerTurn = players[currentPlayer]?.id === currentPlayerId;
  const canRollDice = gameStarted && !gameState.gameOver && !winner && isCurrentPlayerTurn && !diceRolled;

  // Points Table Modal
  const PointsTableModal = () => (
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
                  : index === 1
                  ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400 shadow-lg shadow-gray-500/25'
                  : index === 2
                  ? 'bg-gradient-to-r from-orange-800/20 to-orange-900/20 border-orange-700 shadow-lg shadow-orange-500/25'
                  : 'bg-gradient-to-r from-purple-800/20 to-purple-900/20 border-purple-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
                  {index === 0 ? <Crown className="w-5 h-5 text-yellow-400" /> : 
                   index === 1 ? <Award className="w-5 h-5 text-gray-300" /> :
                   index === 2 ? <Star className="w-5 h-5 text-orange-400" /> :
                   <span className="text-white text-sm font-bold">{index + 1}</span>}
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className={`w-5 h-5 ${getPinColor(player.color)}`} />
                  <span className="text-white font-semibold">{player.name}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{player.points} pts</div>
                <div className="text-sm text-purple-200">
                  {index === 0 ? 'Winner' : index === 1 ? '2nd Place' : index === 2 ? '3rd Place' : '4th Place'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold shadow-lg"
          >
            New Game
          </button>
          <button
            onClick={() => setShowPointsTable(false)}
            className="px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center p-4  min-h-screen text-white">
      <Fireworks 
        show={showFireworks} 
        onComplete={() => setShowFireworks(false)} 
      />
      
      {showPointsTable && <PointsTableModal />}
      
      <div className='mb-6'></div>
    
      {/* Winner announcement */}
      {winner !== null && !showPointsTable && (
        <div className="mb-6 p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-2xl backdrop-blur-sm">
          <h2 className="text-3xl font-bold text-white text-center mb-3">
            🎉 {winnerName} Wins! 🎉
          </h2>
          <p className="text-green-200 text-center mb-4">
            Congratulations on an amazing victory!
          </p>
          <button
            onClick={() => setShowPointsTable(true)}
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
    <div className="grid grid-cols-15 grid-rows-15 gap-0 border-2 sm:border-4 border-white/20 bg-white/10 rounded-xl sm:rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden"
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

{/* Game board */}
{/* <div className="mb-4 sm:mb-6 md:mb-8 flex justify-center w-full px-2">
  <div className="w-full max-w-[600px]">
    <div className="grid grid-cols-15 grid-rows-15 gap-0 border-2 sm:border-4 border-white/20 bg-white/10 rounded-xl sm:rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden aspect-square"
      style={{
        gridTemplateColumns: 'repeat(15, minmax(8px, 1fr))',
        gridTemplateRows: 'repeat(15, minmax(8px, 1fr))',
      }}>
      {renderBoard()}
    </div>
  </div>
</div> */}

      {/* Game board */}
      {/* <div className="mb-8">
        <div className="grid grid-cols-[repeat(15,_2.5rem)] grid-rows-[repeat(15,_2.5rem)] gap-0 border-4 border-white/20 bg-white/10 rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden">
          {renderBoard()}
        </div>
      </div> */}
      
    
      
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


