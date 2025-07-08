// LudoGame.tsx
import React, { useState, useEffect } from 'react';

interface Player {
  id: number;
  color: string;
  name: string;
  coins: number[];
}

interface GameState {
  currentPlayer: number;
  diceValue: number;
  diceRolled: boolean;
  players: Player[];
  winner: number | null;
}

interface LudoGameProps {
  gameState?: GameState;
  currentPlayerId?: string;
  onMoveCoin?: (coinId: string) => void;
}

export const LudoGame: React.FC<LudoGameProps> = ({
  gameState: externalGameState,
  currentPlayerId,
  onMoveCoin,
}) => {
  const [gameState, setGameState] = useState<GameState>({
    currentPlayer: 0,
    diceValue: 0,
    diceRolled: false,
    players: [
      { id: 0, color: 'red', name: 'Red', coins: [0, 0, 0, 0] },
      { id: 1, color: 'blue', name: 'Blue', coins: [0, 0, 0, 0] },
      { id: 2, color: 'green', name: 'Green', coins: [0, 0, 0, 0] },
      { id: 3, color: 'yellow', name: 'Yellow', coins: [0, 0, 0, 0] },
    ],
    winner: null,
  });

  const [selectedCoin, setSelectedCoin] = useState<number | null>(null);
  const [movableCoin, setMovableCoin] = useState<number[]>([]);
  const currentGameState = externalGameState || gameState;

  const boardPath: number[][] = [
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    [14, 7], [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    [7, 0], [6, 0]
  ];

  const startPositions: number[] = [1, 14, 27, 40];
  const homeStretch: { [key: number]: number[][] } = {
    0: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
    1: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
    2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
    3: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
  };

  const safePositions: number[] = [1, 9, 14, 22, 27, 35, 40, 48];

  const rollDice = () => {
    if (currentGameState.diceRolled) return;
    const dice = Math.floor(Math.random() * 6) + 1;
    setGameState((prev) => ({ ...prev, diceValue: dice, diceRolled: true }));
    const currentPlayer = currentGameState.players[currentGameState.currentPlayer];
    if (!currentPlayer) return;

    const movable: number[] = [];
    currentPlayer.coins.forEach((position, index) => {
      if (position === 0 && dice === 6) movable.push(index);
      else if (position > 0 && position < 57) movable.push(index);
    });

    setMovableCoin(movable);
    if (movable.length === 0) setTimeout(() => nextTurn(), 1000);
  };

  const moveCoin = (coinIndex: number) => {
    if (!movableCoin.includes(coinIndex)) return;
    const currentPlayer = currentGameState.players[currentGameState.currentPlayer];
    if (!currentPlayer) return;
    const currentPosition = currentPlayer.coins[coinIndex];
    let newPosition: number = currentPosition === 0 ? 1 : currentPosition + currentGameState.diceValue;
    if (currentPosition > 51) {
      if (newPosition > 57) return;
    } else if (newPosition > 51) {
      newPosition = 51 + (newPosition - 51);
    }

    const newBoardPosition = getBoardPosition(currentGameState.currentPlayer, newPosition);
    if (newBoardPosition && !safePositions.includes(newPosition % 52)) {
      currentGameState.players.forEach((player, playerIndex) => {
        if (playerIndex !== currentGameState.currentPlayer) {
          player.coins.forEach((pos, coinIdx) => {
            const otherBoardPos = getBoardPosition(playerIndex, pos);
            if (otherBoardPos && otherBoardPos[0] === newBoardPosition[0] && otherBoardPos[1] === newBoardPosition[1]) {
              setGameState((prev) => ({
                ...prev,
                players: prev.players.map((p, idx) =>
                  idx === playerIndex ? { ...p, coins: p.coins.map((c, cIdx) => (cIdx === coinIdx ? 0 : c)) } : p
                ),
              }));
            }
          });
        }
      });
    }

    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((player, idx) =>
        idx === currentGameState.currentPlayer
          ? { ...player, coins: player.coins.map((pos, idx) => (idx === coinIndex ? newPosition : pos)) }
          : player
      ),
    }));

    const updatedCoins = [...currentPlayer.coins];
    updatedCoins[coinIndex] = newPosition;
    if (updatedCoins.every((pos) => pos === 57)) {
      setGameState((prev) => ({ ...prev, winner: currentGameState.currentPlayer }));
      return;
    }

    if (onMoveCoin) onMoveCoin(`${currentGameState.currentPlayer}-${coinIndex}`);
    if (currentGameState.diceValue !== 6) setTimeout(() => nextTurn(), 500);
    else {
      setGameState((prev) => ({ ...prev, diceRolled: false }));
      setMovableCoin([]);
    }
  };

  const nextTurn = () => {
    setGameState((prev) => ({
      ...prev,
      currentPlayer: (prev.currentPlayer + 1) % 4,
      diceValue: 0,
      diceRolled: false,
    }));
    setMovableCoin([]);
    setSelectedCoin(null);
  };

  const getBoardPosition = (playerIndex: number, position: number): number[] | null => {
    if (position === 0) return null;
    if (position === 57) return [7, 7];
    if (position > 51) return homeStretch[playerIndex][position - 52];
    const adjusted = (position - 1 + startPositions[playerIndex]) % 52;
    return boardPath[adjusted];
  };

  const getCellColor = (row: number, col: number): string => {
    const safeStars = [
      [1, 6], [6, 1], [8, 1], [13, 6],
      [13, 8], [8, 13], [6, 13], [1, 8],
    ];
    const dangerSpots = [
      [2, 6], [6, 2], [8, 2], [12, 6],
      [12, 8], [8, 12], [6, 12], [2, 8],
    ];
    const homeCenter = [7, 7];

    if (row === 6 && col === 7) return 'bg-red-500';
    if (row === 7 && col === 6) return 'bg-blue-500';
    if (row === 8 && col === 7) return 'bg-yellow-400';
    if (row === 7 && col === 8) return 'bg-green-500';
    if (row === 7 && col === 7) return 'bg-gray-900';

    if (safeStars.some(([r, c]) => r === row && c === col)) return 'bg-white border-2 border-black';
    if (dangerSpots.some(([r, c]) => r === row && c === col)) return 'bg-red-100 border border-gray-300';
    if (boardPath.some(([r, c]) => r === row && c === col)) return 'bg-white border border-gray-400';

    for (const stretch of Object.values(homeStretch)) {
      if (stretch.some(([r, c]) => r === row && c === col)) return 'bg-white border border-gray-500';
    }

    const baseCells: any = {
      red: [[11, 1], [11, 3], [13, 1], [13, 3]],
      blue: [[1, 1], [1, 3], [3, 1], [3, 3]],
      green: [[1, 11], [1, 13], [3, 11], [3, 13]],
      yellow: [[11, 11], [11, 13], [13, 11], [13, 13]],
    };
    
    for (const [color, cells] of Object.entries(baseCells) as [string, number[][]][]) {
      if (cells.some((pos: number[]) => {
        const [r, c] = pos as [number, number];
        return r === row && c === col;
      })) return `bg-white border-2 border-${color}-500`;
    }
    

    return 'bg-white';
  };

  const getBasePositions = (playerIndex: number): number[][] => {
    const bases: { [key: number]: number[][] } = {
      0: [[1, 1], [1, 3], [3, 1], [3, 3]],
      1: [[1, 11], [1, 13], [3, 11], [3, 13]],
      2: [[11, 11], [11, 13], [13, 11], [13, 13]],
      3: [[11, 1], [11, 3], [13, 1], [13, 3]],
    };
    return bases[playerIndex] || [];
  };

  const renderBoard = () => {
    const board = [];
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        const cellColor = getCellColor(row, col);
        const coins: any[] = [];

        currentGameState.players.forEach((player, playerIndex) => {
          player.coins.forEach((pos, coinIndex) => {
            const boardPos = getBoardPosition(playerIndex, pos);
            if (boardPos?.[0] === row && boardPos?.[1] === col) {
              coins.push({ playerIndex, coinIndex, player });
            }
            if (pos === 0) {
              const basePos = getBasePositions(playerIndex);
              basePos.forEach((bp, idx) => {
                if (bp[0] === row && bp[1] === col && idx === coinIndex) {
                  coins.push({ playerIndex, coinIndex, player });
                }
              });
            }
          });
        });

        board.push(
          <div
            key={`${row}-${col}`}
            className={`w-10 h-10 flex items-center justify-center relative ${cellColor}`}
          >
            {coins.map((coin, idx) => (
              <div
                key={`${coin.playerIndex}-${coin.coinIndex}`}
                className={`w-6 h-6 rounded-full border-2 border-white text-xs font-bold text-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ${
                  coin.player.color === 'red'
                    ? 'bg-red-500'
                    : coin.player.color === 'blue'
                    ? 'bg-blue-500'
                    : coin.player.color === 'green'
                    ? 'bg-green-500'
                    : 'bg-yellow-400'
                } ${
                  movableCoin.includes(coin.coinIndex) && coin.playerIndex === currentGameState.currentPlayer
                    ? 'ring-2 ring-black'
                    : ''
                }`}
                onClick={() => moveCoin(coin.coinIndex)}
                style={{
                  position: coins.length > 1 ? 'absolute' : 'static',
                  transform: coins.length > 1 ? `translate(${idx * 4}px, ${idx * 4}px)` : 'none',
                  zIndex: idx + 1,
                }}
              >
                {coin.coinIndex + 1}
              </div>
            ))}
          </div>
        );
      }
    }
    return board;
  };

  const resetGame = () => {
    setGameState({
      currentPlayer: 0,
      diceValue: 0,
      diceRolled: false,
      players: gameState.players.map((p) => ({ ...p, coins: [0, 0, 0, 0] })),
      winner: null,
    });
    setSelectedCoin(null);
    setMovableCoin([]);
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold mb-4 text-gray-800">Ludo Game</h1>
      {currentGameState.winner !== null && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded">
          <h2 className="text-2xl font-bold text-green-800">
            🎉 {currentGameState.players[currentGameState.winner].name} Player Wins! 🎉
          </h2>
          <button
            onClick={resetGame}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Play Again
          </button>
        </div>
      )}
      <div className="flex gap-8 mb-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2 text-slate-400">Current Player</h3>
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold ${
              currentGameState.players[currentGameState.currentPlayer]?.color === 'red'
                ? 'bg-red-500'
                : currentGameState.players[currentGameState.currentPlayer]?.color === 'blue'
                ? 'bg-blue-500'
                : currentGameState.players[currentGameState.currentPlayer]?.color === 'green'
                ? 'bg-green-500'
                : 'bg-yellow-400'
            }`}
          >
            {currentGameState.players[currentGameState.currentPlayer]?.name || 'Player'}
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2 text-slate-400">Dice</h3>
          <div className="w-16 h-16 text-black bg-white border-2 border-gray-400 rounded-lg flex items-center justify-center text-2xl font-bold">
            {currentGameState.diceValue || '?'}
          </div>
          <button
            onClick={rollDice}
            disabled={currentGameState.diceRolled}
className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
>
  Roll Dice
</button>
</div>
</div>

<div className="grid grid-cols-[repeat(15,_2.5rem)] grid-rows-[repeat(15,_2.5rem)] gap-0 border-4 border-gray-800 bg-white">
{renderBoard()}
</div>

<div className="mt-4 text-sm text-gray-600 max-w-md text-center">
<p><strong>Rules:</strong> Roll a 6 to bring a coin into play. Land on opponents (outside star zones) to capture them. Reach the center with all coins to win!</p>
<p><strong>Coin Tips:</strong> Coins with a ring are movable. Click after rolling the dice.</p>
<p><strong>Safe Zones:</strong> Stars (white cells with border) protect coins from being captured.</p>
</div>
</div>
);
};



// import React, { useState, useEffect } from 'react';

// // Define types for better type safety
// interface Player {
//   id: number;
//   color: string;
//   name: string;
//   coins: number[];
// }

// interface GameState {
//   currentPlayer: number;
//   diceValue: number;
//   diceRolled: boolean;
//   players: Player[];
//   winner: number | null;
// }

// interface LudoGameProps {
//   gameState?: GameState;
//   currentPlayerId?: string;
//   onMoveCoin?: (coinId: string) => void;
// }

// export const LudoGame: React.FC<LudoGameProps> = ({ 
//   gameState: externalGameState, 
//   currentPlayerId, 
//   onMoveCoin 
// }) => {
//   const [gameState, setGameState] = useState<GameState>({
//     currentPlayer: 0,
//     diceValue: 0,
//     diceRolled: false,
//     players: [
//       { id: 0, color: 'red', name: 'Red', coins: [0, 0, 0, 0] },
//       { id: 1, color: 'blue', name: 'Blue', coins: [0, 0, 0, 0] },
//       { id: 2, color: 'green', name: 'Green', coins: [0, 0, 0, 0] },
//       { id: 3, color: 'yellow', name: 'Yellow', coins: [0, 0, 0, 0] }
//     ],
//     winner: null
//   });

//   const [selectedCoin, setSelectedCoin] = useState<number | null>(null);
//   const [movableCoin, setMovableCoin] = useState<number[]>([]);

//   // Use external game state if provided, otherwise use internal state
//   const currentGameState = externalGameState || gameState;

//   // Enhanced safety check to ensure we have valid game state
//   if (!currentGameState || 
//       !currentGameState.players || 
//       !Array.isArray(currentGameState.players) || 
//       currentGameState.players.length === 0) {
//     return <div className="flex items-center justify-center min-h-screen">Loading game...</div>;
//   }

//   // Board path for all players (52 steps + 6 home stretch)
//   const boardPath: number[][] = [
//     // Red starting area to Blue
//     [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
//     // Blue corner to Green
//     [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
//     // Green corner to Yellow
//     [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
//     // Yellow corner to Red
//     [14, 7], [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
//     // Back to Red starting
//     [7, 0], [6, 0]
//   ];

//   // Starting positions for each player
//   const startPositions: number[] = [1, 14, 27, 40]; // Red, Blue, Green, Yellow

//   // Home stretch paths
//   const homeStretch: { [key: number]: number[][] } = {
//     0: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], // Red
//     1: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]], // Blue
//     2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], // Green
//     3: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]]  // Yellow
//   };

//   // Safe positions (star positions)
//   const safePositions: number[] = [1, 9, 14, 22, 27, 35, 40, 48];

//   const rollDice = () => {
//     if (currentGameState.diceRolled) return;
    
//     const dice = Math.floor(Math.random() * 6) + 1;
//     setGameState(prev => ({
//       ...prev,
//       diceValue: dice,
//       diceRolled: true
//     }));

//     // Check which coins can move
//     const currentPlayer = currentGameState.players[currentGameState.currentPlayer];
//     if (!currentPlayer) return;
    
//     const movable: number[] = [];
    
//     currentPlayer.coins.forEach((position, index) => {
//       if (position === 0 && dice === 6) {
//         movable.push(index); // Can start from base
//       } else if (position > 0 && position < 57) {
//         movable.push(index); // Can move on board
//       }
//     });

//     setMovableCoin(movable);

//     // Auto next turn if no movable coins
//     if (movable.length === 0) {
//       setTimeout(() => nextTurn(), 1000);
//     }
//   };

//   const moveCoin = (coinIndex: number) => {
//     if (!movableCoin.includes(coinIndex)) return;

//     const currentPlayer = currentGameState.players[currentGameState.currentPlayer];
//     if (!currentPlayer) return;
    
//     const currentPosition = currentPlayer.coins[coinIndex];
//     let newPosition: number;

//     if (currentPosition === 0) {
//       // Moving from base
//       newPosition = 1;
//     } else if (currentPosition >= 51) {
//       // In home stretch
//       newPosition = currentPosition + currentGameState.diceValue;
//       if (newPosition > 57) return; // Can't move beyond home
//     } else {
//       // Regular move
//       newPosition = currentPosition + currentGameState.diceValue;
//       if (newPosition > 51) {
//         // Enter home stretch
//         newPosition = 51 + (newPosition - 51);
//       }
//     }

//     // Check for captures
//     const newBoardPosition = getBoardPosition(currentGameState.currentPlayer, newPosition);
//     if (newBoardPosition && !safePositions.includes(newPosition % 52)) {
//       currentGameState.players.forEach((player, playerIndex) => {
//         if (playerIndex !== currentGameState.currentPlayer) {
//           player.coins.forEach((pos, coinIdx) => {
//             const otherBoardPos = getBoardPosition(playerIndex, pos);
//             if (otherBoardPos && otherBoardPos[0] === newBoardPosition[0] && otherBoardPos[1] === newBoardPosition[1]) {
//               // Capture!
//               setGameState(prev => ({
//                 ...prev,
//                 players: prev.players.map((p, idx) => 
//                   idx === playerIndex 
//                     ? { ...p, coins: p.coins.map((c, cIdx) => cIdx === coinIdx ? 0 : c) }
//                     : p
//                 )
//               }));
//             }
//           });
//         }
//       });
//     }

//     // Update coin position
//     setGameState(prev => ({
//       ...prev,
//       players: prev.players.map((player, idx) => 
//         idx === currentGameState.currentPlayer 
//           ? { ...player, coins: player.coins.map((pos, idx) => idx === coinIndex ? newPosition : pos) }
//           : player
//       )
//     }));

//     // Check for win
//     const updatedCoins = [...currentPlayer.coins];
//     updatedCoins[coinIndex] = newPosition;
//     if (updatedCoins.every(pos => pos === 57)) {
//       setGameState(prev => ({ ...prev, winner: currentGameState.currentPlayer }));
//       return;
//     }

//     // Call external onMoveCoin if provided
//     if (onMoveCoin) {
//       onMoveCoin(`${currentGameState.currentPlayer}-${coinIndex}`);
//     }

//     // Next turn (unless rolled 6)
//     if (currentGameState.diceValue !== 6) {
//       setTimeout(() => nextTurn(), 500);
//     } else {
//       setGameState(prev => ({ ...prev, diceRolled: false }));
//       setMovableCoin([]);
//     }
//   };

//   const nextTurn = () => {
//     setGameState(prev => ({
//       ...prev,
//       currentPlayer: (prev.currentPlayer + 1) % 4,
//       diceValue: 0,
//       diceRolled: false
//     }));
//     setMovableCoin([]);
//     setSelectedCoin(null);
//   };

//   const getBoardPosition = (playerIndex: number, position: number): number[] | null => {
//     if (position === 0) return null; // Base
//     if (position === 57) return [7, 7]; // Home center
//     if (position > 51) {
//       // Home stretch
//       const stretchIndex = position - 52;
//       return homeStretch[playerIndex][stretchIndex];
//     }
    
//     // Regular board
//     const adjustedPosition = (position - 1 + startPositions[playerIndex]) % 52;
//     return boardPath[adjustedPosition];
//   };



//   const getCellColor = (row: number, col: number): string => {
//     // Red home
//     if (row <= 5 && col <= 5) return 'bg-red-500';
//     // Green home
//     if (row <= 5 && col >= 9) return 'bg-green-500';
//     // Blue home
//     if (row >= 9 && col <= 5) return 'bg-blue-500';
//     // Yellow home
//     if (row >= 9 && col >= 9) return 'bg-yellow-400';
    
//     // Center triangle colors
//     if (row === 6 && col === 7) return 'bg-red-500';
//     if (row === 7 && col === 6) return 'bg-blue-500';
//     if (row === 8 && col === 7) return 'bg-yellow-400';
//     if (row === 7 && col === 8) return 'bg-green-500';
//     if (row === 7 && col === 7) return 'bg-gray-900';
  
//     // Safe stars
//     const safeStars = [
//       [1, 6], [6, 1], [8, 1], [13, 6], 
//       [13, 8], [8, 13], [6, 13], [1, 8]
//     ];
//     if (safeStars.some(([r, c]) => r === row && c === col)) return 'bg-white';
  
//     // Paths
//     if (boardPath.some(([r, c]) => r === row && c === col)) return 'bg-white';
  
//     return 'bg-white';
//   };
  

//   const renderBoard = () => {
//     const board = [];
//     for (let row = 0; row < 15; row++) {
//       for (let col = 0; col < 15; col++) {
//         const cellColor = getCellColor(row, col);
//         const coins: Array<{ playerIndex: number; coinIndex: number; player: Player }> = [];
        
//         // Additional safety check before forEach
//         if (currentGameState.players && Array.isArray(currentGameState.players)) {
//           // Find coins at this position
//           currentGameState.players.forEach((player, playerIndex) => {
//             if (player && player.coins && Array.isArray(player.coins)) {
//               player.coins.forEach((position, coinIndex) => {
//                 const boardPos = getBoardPosition(playerIndex, position);
//                 if (boardPos && boardPos[0] === row && boardPos[1] === col) {
//                   coins.push({ playerIndex, coinIndex, player });
//                 }
//               });
              
//               // Base positions
//               if (player.coins.some(pos => pos === 0)) {
//                 const basePositions = getBasePositions(playerIndex);
//                 basePositions.forEach((basePos, idx) => {
//                   if (basePos[0] === row && basePos[1] === col && player.coins[idx] === 0) {
//                     coins.push({ playerIndex, coinIndex: idx, player });
//                   }
//                 });
//               }
//             }
//           });
//         }
        
//         board.push(
//           <div
//             key={`${row}-${col}`}
//             className={`w-10 h-10 border border-gray-400 flex items-center justify-center relative ${cellColor}`}
//           >
//             {coins.map((coin, idx) => (
//               <div
//                 key={`${coin.playerIndex}-${coin.coinIndex}`}
//                 className={`w-6 h-6 rounded-full border-2 border-white cursor-pointer hover:scale-110 transition-transform ${
//                   coin.player.color === 'red' ? 'bg-red-500' :
//                   coin.player.color === 'blue' ? 'bg-blue-500' :
//                   coin.player.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'
//                 } ${movableCoin.includes(coin.coinIndex) && coin.playerIndex === currentGameState.currentPlayer ? 'ring-2 ring-black' : ''}`}
//                 style={{
//                   position: coins.length > 1 ? 'absolute' : 'static',
//                   transform: coins.length > 1 ? `translate(${idx * 4}px, ${idx * 4}px)` : 'none',
//                   zIndex: idx + 1
//                 }}
//                 onClick={() => moveCoin(coin.coinIndex)}
//               >
//                 <span className="text-xs font-bold text-white">
//                   {coin.coinIndex + 1}
//                 </span>
//               </div>
//             ))}
//           </div>
//         );
//       }
//     }
//     return board;
//   };

//   const getBasePositions = (playerIndex: number): number[][] => {
//     const bases: { [key: number]: number[][] } = {
//       0: [[1, 1], [1, 3], [3, 1], [3, 3]], // Blue (Top-Left)
//       1: [[1, 11], [1, 13], [3, 11], [3, 13]], // Green (Top-Right)
//       2: [[11, 11], [11, 13], [13, 11], [13, 13]], // Yellow (Bottom-Right)
//       3: [[11, 1], [11, 3], [13, 1], [13, 3]], // Red (Bottom-Left)
//     };
//     return bases[playerIndex] || [];
//   };
  

//   const resetGame = () => {
//     setGameState({
//       currentPlayer: 0,
//       diceValue: 0,
//       diceRolled: false,
//       players: [
//         { id: 0, color: 'red', name: 'Red', coins: [0, 0, 0, 0] },
//         { id: 1, color: 'blue', name: 'Blue', coins: [0, 0, 0, 0] },
//         { id: 2, color: 'green', name: 'Green', coins: [0, 0, 0, 0] },
//         { id: 3, color: 'yellow', name: 'Yellow', coins: [0, 0, 0, 0] }
//       ],
//       winner: null
//     });
//     setSelectedCoin(null);
//     setMovableCoin([]);
//   };

//   return (
//     <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
//       <h1 className="text-4xl font-bold mb-4 text-gray-800">Ludo Game</h1>
      
//       {currentGameState.winner !== null && currentGameState.players[currentGameState.winner] && (
//         <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded">
//           <h2 className="text-2xl font-bold text-green-800">
//             🎉 {currentGameState.players[currentGameState.winner].name} Player Wins! 🎉
//           </h2>
//           <button
//             onClick={resetGame}
//             className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
//           >
//             Play Again
//           </button>
//         </div>
//       )}
      
//       <div className="flex gap-8 mb-4">
//         <div className="text-center">
//           <h3 className="text-lg font-semibold mb-2 text-slate-400">Current Player</h3>
//           <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold ${
//             currentGameState.players[currentGameState.currentPlayer]?.color === 'red' ? 'bg-red-500' :
//             currentGameState.players[currentGameState.currentPlayer]?.color === 'blue' ? 'bg-blue-500' :
//             currentGameState.players[currentGameState.currentPlayer]?.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'
//           }`}>
//             {currentGameState.players[currentGameState.currentPlayer]?.name || 'Player'}
//           </div>
//         </div>
        
//         <div className="text-center">
//           <h3 className="text-lg font-semibold mb-2 text-slate-400">Dice</h3>
//           <div className="w-16 h-16 text-black bg-white border-2 border-gray-400 rounded-lg flex items-center justify-center text-2xl font-bold">
//             {currentGameState.diceValue || '?'}
//           </div>
//           <button
//             onClick={rollDice}
//             disabled={currentGameState.diceRolled || currentGameState.winner !== null}
//             className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
//           >
//             Roll Dice
//           </button>
//         </div>
//       </div>
      
//       <div className="grid grid-cols-[repeat(15,_2.5rem)] grid-rows-[repeat(15,_2.5rem)] gap-0 border-4 border-gray-800 bg-white">
//         {renderBoard()}
//       </div>
      
//       <div className="mt-4 text-sm text-gray-600 max-w-md text-center">
//         <p><strong>Rules:</strong> Roll 6 to start. Land on opponents to send them back. Reach the center triangle to win!</p>
//         <p><strong>Highlighted coins</strong> can be moved. Click on them after rolling the dice.</p>
//       </div>
//     </div>
//   );
// };










