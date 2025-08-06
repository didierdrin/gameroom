// src/games/Ludo/LudoGame.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
// import { Provider } from 'react-redux';
// import { store } from './src-ludo/state/store';
// import { Ludo } from './src-ludo/containers/Ludo/Container';
import { useDispatch } from 'react-redux';
import { setPlayers, getInitialGameData, moveCoin, spawnCoin } from './src-ludo/containers/Ludo/state/actions';
import { enableDie, rollDie, rollDieComplete } from './src-ludo/containers/Dice/state/actions';


import { Player, GameState } from '../Ludo/types/game';
// import { Dice } from './Dice';

import { Provider } from 'react-redux';
import { store } from './src-ludo/state/store';
import { Ludo } from './src-ludo/containers/Ludo/Container';


interface LudoGameProps {
  socket: any;
  roomId: string;
  currentPlayer: string;
  gameState: any;
  onRollDice: () => void;
  onMoveCoin: (coinId: string) => void;
  onStartGame: () => void;
}

export const LudoGame: React.FC<LudoGameProps> = ({
  // socket,
  // roomId,
  // currentPlayer,
  // gameState,
  // onRollDice,
  // onMoveCoin,
  // onStartGame,
}) => {
  // Optionally, you can handle socket/gameState sync here if needed

  // No extra wrappers, just the Provider and Ludo
  return (
    <Provider store={store}>
      <Ludo />
    </Provider>
  );
};



// const compatibleStore = store as any;

// export const LudoGame: React.FC<LudoGameProps> = ({
//   socket,
//   roomId,
//   currentPlayer,
//   gameState,
//   onRollDice,
//   onMoveCoin,
//   onStartGame,
// }) => {
//   const { user } = useAuth();
//   const [gameStarted, setGameStarted] = useState(false);
//   const [playerCount, setPlayerCount] = useState(4);

//   // Convert gameState to the format expected by the working ludo game
//   useEffect(() => {
//     if (gameState?.gameStarted && !gameStarted) {
//       setGameStarted(true);
//       // Set player count based on actual players in the room
//       const actualPlayerCount = gameState.players?.length || 4;
//       setPlayerCount(actualPlayerCount);
//     }
//   }, [gameState?.gameStarted, gameStarted]);

//   // Handle socket events for the working ludo game
//   useEffect(() => {
//     if (!socket) return;

//     const handleLudoAction = (data: any) => {
//       // Handle actions from the working ludo game
//       console.log('Ludo action:', data);
      
//       // Emit to server if needed
//       if (data.type === 'moveCoin') {
//         socket.emit('moveCoin', {
//           roomId,
//           playerId: currentPlayer,
//           coinId: data.coinId,
//           targetPosition: data.targetPosition
//         });
//       } else if (data.type === 'rollDice') {
//         socket.emit('rollDice', {
//           roomId,
//           playerId: currentPlayer
//         });
//       }
//     };

//     // Listen for game state updates from server
//     const handleGameStateUpdate = (data: any) => {
//       console.log('Game state update:', data);
//       // Update the Redux store with new game state
//       // This would need to be implemented based on the working ludo's state structure
//     };

//     socket.on('ludoAction', handleLudoAction);
//     socket.on('gameStateUpdate', handleGameStateUpdate);

//     return () => {
//       socket.off('ludoAction', handleLudoAction);
//       socket.off('gameStateUpdate', handleGameStateUpdate);
//     };
//   }, [socket, currentPlayer, roomId]);

//   // Custom wrapper component to integrate with the working ludo game
//   const LudoGameWrapper: React.FC = () => {
//     const [showPlayerConfig, setShowPlayerConfig] = useState(!gameStarted);

//     // Dispatch initial game data when component mounts
//   useEffect(() => {
//     if (!showPlayerConfig) {
//       // Dispatch the action to initialize the game data
//       store.dispatch({ type: 'GET_INITIAL_GAME_DATA' });
//     }
//   }, [showPlayerConfig]);

  
//     const handleStartGame = (count: number) => {
//       setPlayerCount(count);
//       setShowPlayerConfig(false);
//       setGameStarted(true);
//       onStartGame();
//     };

//     if (showPlayerConfig) {
//       return (
//         <div className="flex flex-col items-center justify-center h-full bg-gray-100">
//           <h2 className="text-2xl font-bold mb-8 text-gray-800">Ludo Game Setup</h2>
//           <div className="flex gap-4">
//             <button 
//               onClick={() => handleStartGame(2)}
//               className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
//             >
//               2 Players
//             </button>
//             <button 
//               onClick={() => handleStartGame(3)}
//               className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
//             >
//               3 Players
//             </button>
//             <button 
//               onClick={() => handleStartGame(4)}
//               className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
//             >
//               4 Players
//             </button>
//           </div>
//         </div>
//       );
//     }

//     return (
//       <div className="w-full h-full">
//         <Ludo />
//       </div>
//     );
//   };

//   return (
//     <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
//       {/* <h1 className="text-4xl font-bold mb-4 text-gray-800">Ludo Game</h1> */}
      
//       {gameState?.winner && (
//         <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded">
//           <h2 className="text-2xl font-bold text-green-800">
//             �� {gameState.players.find((p:any) => p.id === gameState.winner)?.name || 'Unknown'} Wins! 🎉
//           </h2>
//         </div>
//       )}
      
//       {!gameStarted && (
//         <button
//           onClick={onStartGame}
//           className="mb-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
//           disabled={gameState?.players?.length < 2 || gameState?.players[0]?.id !== currentPlayer}
//         >
//           Start Game
//         </button>
//       )}
      
//       <div className="w-full max-w-4xl">
//         <Provider store={compatibleStore}>
//           <LudoGameWrapper />
//         </Provider>
//       </div>
      
//       <div className="mt-4 text-sm text-gray-600 max-w-md text-center">
//         <p><strong>Rules:</strong> Roll a 6 to bring a coin into play. Land on opponents (outside star zones) to capture them. Reach the center with all coins to win!</p>
//         <p><strong>Coin Tips:</strong> Coins with a ring are movable. Click after rolling the dice.</p>
//       </div>
//     </div>
//   );
// };







// export const LudoGame: React.FC<LudoGameProps> = ({
//   socket,
//   roomId,
//   currentPlayer,
//   gameState,
//   onRollDice,
//   onMoveCoin,
//   onStartGame,
// }) => {
//   const dispatch = useDispatch();

//   // 1. Initialize Redux Ludo with correct player count
//   useEffect(() => {
//     if (gameState?.players?.length) {
//       dispatch(setPlayers(gameState.players.length));
//       dispatch(getInitialGameData());
//     }
//   }, [gameState?.players?.length, dispatch]);

//   // 2. Listen for server events and update Redux
//   useEffect(() => {
//     if (!socket) return;

//     const handleDiceRolled = (data: any) => {
//       // Update Redux with dice value
//       dispatch(rollDieComplete(data.diceValue));
//     };

//     const handleCoinMoved = (data: any) => {
//       // Update Redux with coin move
//       dispatch(moveCoin(data.coinId, data.position, data.cellId));
//     };

//     socket.on('diceRolled', handleDiceRolled);
//     socket.on('coinMoved', handleCoinMoved);

//     return () => {
//       socket.off('diceRolled', handleDiceRolled);
//       socket.off('coinMoved', handleCoinMoved);
//     };
//   }, [socket, dispatch]);

//   // 3. When local player acts, emit to server
//   const handleRollDice = () => {
//     if (gameState.currentTurn === currentPlayer) {
//       socket.emit('rollDice', { roomId, playerId: currentPlayer });
//       dispatch(rollDie()); // Optimistically update UI
//     }
//   };

//   const handleMoveCoin = (coinId: string, position: number, cellId: string) => {
//     if (gameState.currentTurn === currentPlayer) {
//       socket.emit('moveCoin', { roomId, playerId: currentPlayer, coinId, position, cellId });
//       dispatch(moveCoin(coinId, position, cellId)); // Optimistically update UI
//     }
//   };

//   // 4. Render the Redux Ludo board
//   return (
//     <Provider store={store}>
//       <Ludo
//         // You may need to pass props or use Redux selectors to control UI
//         // For example, disable dice/coins if not current player's turn
//         // You can customize the Ludo component or its children as needed
//       />
//       {/* Optionally, add your own UI for winner, rules, etc. */}
//     </Provider>
//   );
// };


























// import React, { useEffect, useState } from 'react';
// import { useAuth } from '../../context/AuthContext';
// import { Player, GameState } from '../Ludo/types/game';
// import { Dice } from './Dice';

// interface LudoGameProps {
//   gameState?: GameState;
//   currentPlayerId?: string;
//   onRollDice?: () => void;
//   onMoveCoin?: (coinId: string) => void;
//   onStartGame?: () => void;
// }

// export const LudoGame: React.FC<LudoGameProps> = ({
//   gameState,
//   currentPlayerId,
//   onRollDice,
//   onMoveCoin,
//   onStartGame,
// }) => {
//   const { user } = useAuth();
//   const [movableCoins, setMovableCoins] = useState<number[]>([]);

//   if (!gameState || !currentPlayerId) {
//     return <div className="text-center p-4">Loading...</div>;
//   }

//   const { players, currentPlayer, diceValue, diceRolled, winner, gameStarted, coins } = gameState;

//   // Debug log for game state and current player
//   useEffect(() => {
//     console.log('LudoGame State:', {
//       currentPlayer: players[currentPlayer]?.id,
//       currentPlayerId,
//       diceValue,
//       diceRolled,
//       movableCoins,
//       coins: JSON.stringify(coins),
//       players: players.map((p) => ({ id: p.id, name: p.name, coins: p.coins })),
//     });
//   }, [currentPlayer, players, currentPlayerId, diceValue, diceRolled, coins, movableCoins]);

//   const boardPath: number[][] = [
//     [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
//     [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
//     [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
//     [14, 7], [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
//     [7, 0], [6, 0],
//   ];

//   const startPositions: number[] = [1, 14, 27, 40];
//   const homeStretch: { [key: number]: number[][] } = {
//     0: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], // Red
//     1: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]], // Blue
//     2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], // Green
//     3: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], // Yellow
//   };

//   const safePositions: number[] = [1, 9, 14, 22, 27, 35, 40, 48];

//   useEffect(() => {
//     if (diceRolled && players[currentPlayer]?.id === currentPlayerId) {
//       const currentPlayerData = players[currentPlayer];
//       const playerCoins = coins![currentPlayerData.id] || [0, 0, 0, 0];
//       const movable: number[] = [];
//       playerCoins.forEach((position, index) => {
//         if (position === 0 && diceValue === 6) {
//           movable.push(index);
//         } else if (position > 0 && position < 57 && position + diceValue! <= 57) {
//           movable.push(index);
//         }
//       });
//       setMovableCoins(movable);
//       console.log('Movable coins updated:', movable);
//     } else {
//       setMovableCoins([]);
//     }
//   }, [diceRolled, diceValue, currentPlayer, players, currentPlayerId, coins]);

//   const handleMoveCoin = (coinIndex: number) => {
//     if (players[currentPlayer]?.id.startsWith('ai-')) return;
//     if (!movableCoins.includes(coinIndex) || !onMoveCoin || players[currentPlayer]?.id !== currentPlayerId) {
//       console.log('Invalid move attempt:', { coinIndex, movableCoins, currentPlayerId });
//       return;
//     }
//     const coinId = `${players[currentPlayer].color}-${coinIndex + 1}`;
//     console.log('Attempting to move coin:', { coinId, playerId: currentPlayerId });
//     onMoveCoin(coinId);
//   };

//   const getBoardPosition = (playerIndex: number, position: number): number[] | null => {
//     if (position === 0) return null; // Coin in base
//     if (position === 57) return [7, 7]; // Home triangle
//     if (position > 51) return homeStretch[playerIndex][position - 52];
//     const adjusted = (position - 1 + startPositions[playerIndex]) % 52;
//     return boardPath[adjusted];
//   };

//   const getCellColor = (row: number, col: number): string => {
//     const safeStars = [[1, 6], [6, 1], [8, 1], [13, 6], [13, 8], [8, 13], [6, 13], [1, 8]];
//     const dangerSpots = [[2, 6], [6, 2], [8, 2], [12, 6], [12, 8], [8, 12], [6, 12], [2, 8]];
//     if (row === 6 && col === 7) return 'bg-red-500';
//     if (row === 7 && col === 6) return 'bg-blue-500';
//     if (row === 8 && col === 7) return 'bg-yellow-400';
//     if (row === 7 && col === 8) return 'bg-green-500';
//     if (row === 7 && col === 7) return 'bg-gray-900';
//     if (safeStars.some(([r, c]) => r === row && c === col)) return 'bg-emerald-100 border-2 border-black';
//     if (dangerSpots.some(([r, c]) => r === row && c === col)) return 'bg-white border border-gray-400';
//     if (boardPath.some(([r, c]) => r === row && c === col)) return 'bg-white border border-gray-400';
//     for (const stretch of Object.values(homeStretch)) {
//       if (stretch.some(([r, c]) => r === row && c === col)) return 'bg-slate-200 border border-gray-500';
//     }
//     const baseCells = {
//       red: [[1, 1], [1, 3], [3, 1], [3, 3]], // Red base
//       blue: [[1, 11], [1, 13], [3, 11], [3, 13]], // Blue base
//       green: [[11, 11], [11, 13], [13, 11], [13, 13]], // Green base
//       yellow: [[11, 1], [11, 3], [13, 1], [13, 3]], // Yellow base
//     };
//     for (const [color, cells] of Object.entries(baseCells)) {
//       if (cells.some(([r, c]) => r === row && c === col)) return `bg-white border-2 border-${color}-100`;
//     }
//     return 'bg-white';
//   };

//   const getBasePositions = (playerIndex: number): number[][] => {
//     const bases: { [key: number]: number[][] } = {
//       0: [[1, 1], [1, 3], [3, 1], [3, 3]], // Red
//       1: [[1, 11], [1, 13], [3, 11], [3, 13]], // Blue
//       2: [[11, 11], [11, 13], [13, 11], [13, 13]], // Green
//       3: [[11, 1], [11, 3], [13, 1], [13, 3]], // Yellow
//     };
//     return bases[playerIndex] || [];
//   };

//   const renderBoard = () => {
//     const board = [];
//     for (let row = 0; row < 15; row++) {
//       for (let col = 0; col < 15; col++) {
//         const cellColor = getCellColor(row, col);
//         const coinsAtPosition: any[] = [];
//         players.forEach((player, playerIndex) => {
//           const playerCoins = coins![player.id] || [0, 0, 0, 0];
//           playerCoins.forEach((pos, coinIndex) => {
//             const boardPos = getBoardPosition(playerIndex, pos);
//             if (boardPos?.[0] === row && boardPos?.[1] === col) {
//               coinsAtPosition.push({ playerIndex, coinIndex, player });
//             }
//             if (pos === 0) {
//               const basePos = getBasePositions(playerIndex);
//               basePos.forEach((bp, idx) => {
//                 if (bp[0] === row && bp[1] === col && idx === coinIndex) {
//                   coinsAtPosition.push({ playerIndex, coinIndex, player });
//                 }
//               });
//             }
//           });
//         });
//         board.push(
//           <div
//             key={`${row}-${col}`}
//             className={`w-10 h-10 flex items-center justify-center relative ${cellColor}`}
//           >
//             {coinsAtPosition.map((coin, idx) => (
//               <div
//                 key={`${coin.playerIndex}-${coin.coinIndex}`}
//                 className={`w-6 h-6 rounded-full border-2 border-white text-xs font-bold text-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ${
//                   coin.player.color === 'red'
//                     ? 'bg-red-500'
//                     : coin.player.color === 'blue'
//                     ? 'bg-blue-500'
//                     : coin.player.color === 'green'
//                     ? 'bg-green-500'
//                     : 'bg-yellow-400'
//                 } ${
//                   movableCoins.includes(coin.coinIndex) && coin.playerIndex === currentPlayer
//                     ? 'ring-2 ring-black'
//                     : ''
//                 }`}
//                 onClick={() => handleMoveCoin(coin.coinIndex)}
//                 style={{
//                   position: coinsAtPosition.length > 1 ? 'absolute' : 'static',
//                   transform: coinsAtPosition.length > 1 ? `translate(${idx * 4}px, ${idx * 4}px)` : 'none',
//                   zIndex: idx + 1,
//                 }}
//               >
//                 {coin.coinIndex + 1}
//               </div>
//             ))}
//           </div>
//         );
//       }
//     }
//     return board;
//   };

//   const currentPlayerName = players[currentPlayer]?.id === currentPlayerId ? user?.username || players[currentPlayer]?.name || 'Player' : players[currentPlayer]?.name || 'Player';
//   const winnerName = winner ? players.find((p) => p.id === winner)?.name || 'Unknown' : 'Unknown';

//   return (
//     <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
//       <h1 className="text-4xl font-bold mb-4 text-gray-800">Ludo Game</h1>
//       {winner !== null && (
//         <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded">
//           <h2 className="text-2xl font-bold text-green-800">
//             🎉 {winnerName} Wins! 🎉
//           </h2>
//           <button
//             onClick={() => window.location.reload()}
//             className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
//           >
//             New Game
//           </button>
//         </div>
//       )}
//       {!gameStarted && (
//         <button
//           onClick={onStartGame}
//           className="mb-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
//           disabled={players.length < 2 || players[0].id !== currentPlayerId}
//         >
//           Start Game
//         </button>
//       )}
//       <div className="flex gap-8 mb-4">
//         <div className="text-center">
//           <h3 className="text-lg font-semibold mb-2 text-slate-400">Current Player</h3>
//           <div
//             className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold ${
//               players[currentPlayer]?.color === 'red'
//                 ? 'bg-red-500'
//                 : players[currentPlayer]?.color === 'blue'
//                 ? 'bg-blue-500'
//                 : players[currentPlayer]?.color === 'green'
//                 ? 'bg-green-500'
//                 : 'bg-yellow-400'
//             }`}
//           >
//             {currentPlayerName}
//           </div>
//         </div>
//         <div className="text-center">
//           <h3 className="text-lg font-semibold mb-2 text-slate-400">Dice</h3>
//           <Dice
//             value={diceValue!}
//             onRoll={() => onRollDice}
//             // disabled={diceRolled || players[currentPlayer]?.id !== currentPlayerId || players[currentPlayer]?.id.startsWith('ai-')}
//             disabled={
//               diceRolled || 
//               players[currentPlayer]?.id !== currentPlayerId || 
//               players[currentPlayer]?.id.startsWith('ai-') // Add this condition
//             }
//           />
//         </div>
//       </div>
//       <div className="grid grid-cols-[repeat(15,_2.5rem)] grid-rows-[repeat(15,_2.5rem)] gap-0 border-4 border-gray-800 bg-white">
//         {renderBoard()}
//       </div>
//       <div className="mt-4 text-sm text-gray-600 max-w-md text-center">
//         <p><strong>Rules:</strong> Roll a 6 to bring a coin into play. Land on opponents (outside star zones) to capture them. Reach the center with all coins to win!</p>
//         <p><strong>Coin Tips:</strong> Coins with a ring are movable. Click after rolling the dice.</p>
//         <p><strong>Safe Zones:</strong> Stars (white cells with border) protect coins from being captured.</p>
//       </div>
//     </div>
//   );
// };

