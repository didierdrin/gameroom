
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Player, GameState } from '../Ludo/types/game';
import { Dice } from './Dice';
import { SocketType } from "../../SocketContext";
import { Fireworks } from '../UI/Fireworks';

export interface LudoGameProps {
  gameState: GameState;
  currentPlayerId: string;
  onRollDice: () => void;
  onMoveCoin: (coinId: string) => void;
  onStartGame: () => void;
  socket: SocketType;
  roomId: string;
}

export const LudoGame: React.FC<LudoGameProps> = ({
  gameState,
  currentPlayerId,
  onRollDice,
  onMoveCoin,
  onStartGame,
}) => {
  const { user } = useAuth();
  const [movableCoins, setMovableCoins] = useState<number[]>([]);
  const [showFireworks, setShowFireworks] = useState(false);

  if (!gameState || !currentPlayerId) {
    return <div className="text-center p-4">Loading...</div>;
  }

  const { players, currentPlayer, diceValue, diceRolled, winner, gameStarted, coins } = gameState;
  
  // Show fireworks when game ends
  useEffect(() => {
    if (winner !== null && !showFireworks) {
      setShowFireworks(true);
    }
  }, [winner, showFireworks]);

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
      console.log('Movable coins updated:', movable, 'for player', currentPlayerId);
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

  // Safe positions where coins cannot be captured
  const safePositions: number[] = [1, 9, 14, 22, 27, 35, 40, 48];

  const handleMoveCoin = (coinIndex: number) => {
    // Only allow moves if it's the current player's turn and they have rolled the dice
    if (!gameStarted || gameState.gameOver || winner) return;
    if (players[currentPlayer]?.id !== currentPlayerId) return;
    if (!diceRolled) return;
    if (!movableCoins.includes(coinIndex)) return;
    
    const coinId = `${players[currentPlayer].color}-${coinIndex + 1}`;
    console.log('Moving coin:', coinId, 'for player:', currentPlayerId);
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
    const adjusted = (position - 1 + startPositions[playerIndex]) % 52;
    return boardPath[adjusted];
  };

  const getCellColor = (row: number, col: number): string => {
    // Safe star positions
    const safeStars = [[1, 6], [6, 1], [8, 1], [13, 6], [13, 8], [8, 13], [6, 13], [1, 8]];
    
    // Center home area
    if (row === 7 && col === 7) return 'bg-gray-900';
    
    // Player home areas
    if (row === 6 && col === 7) return 'bg-red-500'; // Red home
    if (row === 7 && col === 6) return 'bg-blue-500'; // Blue home
    if (row === 8 && col === 7) return 'bg-yellow-400'; // Yellow home
    if (row === 7 && col === 8) return 'bg-green-500'; // Green home
    
    // Safe star positions
    if (safeStars.some(([r, c]) => r === row && c === col)) {
      return 'bg-emerald-100 border-2 border-black';
    }
    
    // Board path
    if (boardPath.some(([r, c]) => r === row && c === col)) {
      return 'bg-white border border-gray-400';
    }
    
    // Home stretch areas
    for (const stretch of Object.values(homeStretch)) {
      if (stretch.some(([r, c]) => r === row && c === col)) {
        return 'bg-slate-200 border border-gray-500';
      }
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
        return `bg-white border-2 border-${color}-100`;
      }
    }
    
    return 'bg-white';
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

  const renderBoard = () => {
    const board = [];
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        const cellColor = getCellColor(row, col);
        const coinsAtPosition: any[] = [];
        
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
            className={`w-10 h-10 flex items-center justify-center relative ${cellColor}`}
          >
            {coinsAtPosition.map((coin, idx) => (
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
                  movableCoins.includes(coin.coinIndex) && 
                  coin.playerIndex === currentPlayer && 
                  players[currentPlayer]?.id === currentPlayerId
                    ? 'ring-2 ring-black ring-offset-2'
                    : ''
                }`}
                onClick={() => handleMoveCoin(coin.coinIndex)}
                style={{
                  position: coinsAtPosition.length > 1 ? 'absolute' : 'static',
                  transform: coinsAtPosition.length > 1 ? `translate(${idx * 4}px, ${idx * 4}px)` : 'none',
                  zIndex: idx + 1,
                }}
                title={`${coin.player.name}'s coin ${coin.coinIndex + 1} at position ${coin.pos}`}
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

  const currentPlayerName = players[currentPlayer]?.id === currentPlayerId 
    ? user?.username || players[currentPlayer]?.name || 'Player' 
    : players[currentPlayer]?.name || 'Player';
    
  const winnerName = winner ? players.find((p) => p.id === winner)?.name || 'Unknown' : 'Unknown';
  const isCurrentPlayerTurn = players[currentPlayer]?.id === currentPlayerId;
  const canRollDice = gameStarted && !gameState.gameOver && !winner && isCurrentPlayerTurn && !diceRolled;

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
      <Fireworks 
        show={showFireworks} 
        onComplete={() => setShowFireworks(false)} 
      />
      
      <h1 className="text-4xl font-bold mb-4 text-gray-800">Ludo Game</h1>
      
      {/* Winner announcement */}
      {winner !== null && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded-lg">
          <h2 className="text-2xl font-bold text-green-800">
            🎉 {winnerName} Wins! 🎉
          </h2>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            New Game
          </button>
        </div>
      )}
      
      {/* Start game button */}
      {!gameStarted && (
        <button
          onClick={onStartGame}
          className="mb-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={players.length < 2 || players[0].id !== currentPlayerId}
        >
          Start Game
        </button>
      )}
      
      {/* Game info */}
      <div className="flex gap-8 mb-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2 text-slate-400">Current Player</h3>
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold ${
              players[currentPlayer]?.color === 'red'
                ? 'bg-red-500'
                : players[currentPlayer]?.color === 'blue'
                ? 'bg-blue-500'
                : players[currentPlayer]?.color === 'green'
                ? 'bg-green-500'
                : 'bg-yellow-400'
            } ${isCurrentPlayerTurn ? 'ring-4 ring-yellow-300' : ''}`}
          >
            {currentPlayerName}
          </div>
          {isCurrentPlayerTurn && (
            <p className="text-sm text-green-600 font-semibold mt-1">Your Turn!</p>
          )}
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2 text-slate-400">Dice</h3>
          <Dice
            value={diceValue || 0}
            onRoll={onRollDice}
            disabled={!canRollDice}
          />
          {diceRolled && (
            <p className="text-sm text-blue-600 mt-1">Rolled: {diceValue}</p>
          )}
        </div>
      </div>
      
      {/* Game board */}
      <div className="grid grid-cols-[repeat(15,_2.5rem)] grid-rows-[repeat(15,_2.5rem)] gap-0 border-4 border-gray-800 bg-white shadow-lg">
        {renderBoard()}
      </div>
      
      {/* Game rules and tips */}
      <div className="mt-6 text-sm text-gray-600 max-w-2xl text-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-white rounded-lg shadow">
            <h4 className="font-bold text-gray-800 mb-2">🎲 Rules</h4>
            <p>Roll a 6 to bring a coin into play. Land on opponents to capture them. Reach the center with all coins to win!</p>
          </div>
          <div className="p-3 bg-white rounded-lg shadow">
            <h4 className="font-bold text-gray-800 mb-2">🪙 Coin Tips</h4>
            <p>Coins with a black ring are movable. Click them after rolling the dice. You get an extra turn for rolling a 6!</p>
          </div>
          <div className="p-3 bg-white rounded-lg shadow">
            <h4 className="font-bold text-gray-800 mb-2">⭐ Safe Zones</h4>
            <p>Green star positions protect coins from capture. Three consecutive 6s lose your turn!</p>
          </div>
        </div>
      </div>
      
      {/* Player list */}
      <div className="mt-6 w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 text-center">Players</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {players.map((player, index) => (
            <div
              key={player.id}
              className={`p-3 rounded-lg border-2 ${
                index === currentPlayer && gameStarted
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full ${
                    player.color === 'red'
                      ? 'bg-red-500'
                      : player.color === 'blue'
                      ? 'bg-blue-500'
                      : player.color === 'green'
                      ? 'bg-green-500'
                      : 'bg-yellow-400'
                  }`}
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    {player.id === currentPlayerId ? 'You' : player.name}
                    {index === currentPlayer && gameStarted && ' (Current)'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Coins: {coins![player.id]?.filter(pos => pos === 57).length || 0}/4 home
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

