import React, { useState, useEffect } from 'react';
import { useSocket } from '../../SocketContext';
import { useAuth } from '../../context/AuthContext';
import './UnoGame.css';
import { useUserData } from '../../hooks/useUserData';
import { Trophy, Award, Star, Crown } from 'lucide-react';

interface UnoCard {
  id: string;
  type: 'number' | 'skip' | 'reverse' | 'draw_two' | 'wild' | 'wild_draw_four';
  color: 'red' | 'blue' | 'green' | 'yellow' | 'black';
  value: string;
  points: number;
}

interface UnoPlayer {
  id: string;
  name: string;
  cards: UnoCard[];
  hasUno: boolean;
  score: number;
}

interface PlayerPoints {
  playerId: string;
  name: string;
  color?: string;
  position: number;
  points: number;
}

interface UnoGameState {
  roomId: string;
  players: UnoPlayer[];
  currentTurn: string;
  currentPlayerIndex: number;
  gameStarted: boolean;
  gameOver: boolean;
  winner: string | null;
  roomName: string;
  gameType: 'uno';
  deck: UnoCard[];
  discardPile: UnoCard[];
  currentColor: string;
  currentValue: string;
  direction: 1 | -1;
  pendingDraw: number;
  pendingColorChoice: boolean;
  lastPlayer: string | null;
  consecutivePasses: number;
}

interface UnoGameProps {
  socket: any;
  roomId: string;
  currentPlayer: string;
  gameState: any; // Use any or a more generic type
}

// Add type guard to check if it's a UNO game state
const isUnoGameState = (state: any): state is UnoGameState => {
  return state && 
         state.gameType === 'uno' && 
         Array.isArray(state.deck) && 
         Array.isArray(state.players);
};

export const UnoGame: React.FC<UnoGameProps> = ({ socket, roomId, currentPlayer, gameState }) => {
  const { user } = useAuth();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPointsTable, setShowPointsTable] = useState(false);
  const [playerPoints, setPlayerPoints] = useState<PlayerPoints[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  
  
const unoGameState: UnoGameState = React.useMemo(() => {
  if (isUnoGameState(gameState)) {
    return gameState;
  }
  
  // Properly convert from generic GameState to UnoGameState
  return {
    roomId: gameState.roomId,
    players: gameState.players?.map((p: any) => ({
      id: p.id,
      name: p.name,
      cards: p.cards || [], // Use actual cards if available
      hasUno: p.hasUno || false,
      score: p.score || 0
    })) || [],
    currentTurn: gameState.currentTurn,
    currentPlayerIndex: gameState.currentPlayerIndex || 0,
    gameStarted: gameState.gameStarted || false,
    gameOver: gameState.gameOver || false,
    winner: gameState.winner || null,
    roomName: gameState.roomName || '',
    gameType: 'uno',
    deck: gameState.deck || [], 
    discardPile: gameState.discardPile || [],
    currentColor: gameState.currentColor || 'red',
    currentValue: gameState.currentValue || '',
    direction: gameState.direction || 1,
    pendingDraw: gameState.pendingDraw || 0,
    pendingColorChoice: gameState.pendingColorChoice || false,
    lastPlayer: gameState.lastPlayer || null,
    consecutivePasses: gameState.consecutivePasses || 0
  };
}, [gameState]);


  // Rest of your component remains the same...
  const [localGameState, setLocalGameState] = useState<UnoGameState>(unoGameState);

  useEffect(() => {
    if (gameState) {
      setLocalGameState(unoGameState);
    }
  }, [gameState, unoGameState]);

  useEffect(() => {
    if (localGameState.gameOver && !showPointsTable) {
      const leaderboard = getLeaderboardData();
      setLeaderboardData(leaderboard);
      calculateUnoPoints();
      setTimeout(() => setShowPointsTable(true), 1000);
    }
  }, [localGameState.gameOver, localGameState.winner]);

  const getLeaderboardData = () => {
    if (!localGameState.players) return [];

    const sortedPlayers = [...localGameState.players].sort((a, b) => {
      if (a.id === localGameState.winner) return -1;
      if (b.id === localGameState.winner) return 1;
      return a.cards.length - b.cards.length;
    });

    return sortedPlayers.map((player, index) => ({
      _id: player.id,
      score: player.score || 0,
      name: player.name || player.id,
      cardsLeft: player.cards.length,
      isWinner: player.id === localGameState.winner
    }));
  };

  const calculateUnoPoints = () => {
    if (!localGameState.players) return;

    const sortedPlayers = [...localGameState.players].sort((a, b) => {
      if (a.id === localGameState.winner) return -1;
      if (b.id === localGameState.winner) return 1;
      return a.cards.length - b.cards.length;
    });

    const pointsMap: { [key: number]: number } = {
      1: 20, 2: 15, 3: 10, 4: 5
    };

    const pointsData = sortedPlayers.map((player, index) => ({
      playerId: player.id,
      name: player.name,
      color: 'blue',
      position: index + 1,
      points: pointsMap[index + 1] || 0
    }));

    setPlayerPoints(pointsData);
  };

  useEffect(() => {
    if (!socket) return;

    const handleUnoGameState = (newState: UnoGameState) => {
      setLocalGameState(newState);
      setShowColorPicker(false);
      setSelectedCard(null);
    };

    const handleUnoGameOver = (data: any) => {
      console.log('UNO Game Over:', data);
    };

    const handleUnoError = (error: any) => {
      console.error('UNO Error:', error);
      alert(error.message);
    };

    socket.on('unoGameState', handleUnoGameState);
    socket.on('unoGameOver', handleUnoGameOver);
    socket.on('unoError', handleUnoError);

    return () => {
      socket.off('unoGameState', handleUnoGameState);
      socket.off('unoGameOver', handleUnoGameOver);
      socket.off('unoError', handleUnoError);
    };
  }, [socket]);

  if (!localGameState) {
    return <div className="uno-game-loading">Loading UNO game...</div>;
  }

  const currentPlayerData = localGameState.players.find(p => p.id === currentPlayer);
  const isCurrentTurn = localGameState.currentTurn === currentPlayer;
  const canPlay = isCurrentTurn && !localGameState.pendingColorChoice;

  const handleStartGame = () => {
    socket.emit('unoStartGame', { roomId });
  };

  const handlePlayCard = (cardId: string) => {
    const card = currentPlayerData?.cards.find(c => c.id === cardId);
    if (!card) return;

    if (card.type === 'wild' || card.type === 'wild_draw_four') {
      setSelectedCard(cardId);
      setShowColorPicker(true);
    } else {
      socket.emit('unoPlayCard', { roomId, playerId: currentPlayer, cardId });
    }
  };

  const handleColorChoice = (color: string) => {
    if (selectedCard) {
      socket.emit('unoPlayCard', { 
        roomId, 
        playerId: currentPlayer, 
        cardId: selectedCard, 
        chosenColor: color 
      });
    }
    setShowColorPicker(false);
    setSelectedCard(null);
  };

  
  const handleDrawCard = () => {
    if (!socket || !localGameState) return;
    
    // More defensive check for deck
    if (localGameState.deck && Array.isArray(localGameState.deck)) {
      socket.emit('unoDrawCard', { roomId, playerId: currentPlayer });
    } else {
      console.error('Cannot draw card: Deck is not properly initialized');
      // Optionally, you can trigger a game state refresh
      socket.emit('unoGetState', { roomId });
    }
  };

  const handleSayUno = () => {
    socket.emit('unoSayUno', { roomId, playerId: currentPlayer });
  };

  const handleRestartGame = () => {
    socket.emit('unoRestartGame', { roomId });
  };

  const getCardImage = (card: UnoCard): string => {
    // Handle special cards first
    if (card.type === 'wild' || card.type === 'wild_draw_four') {
      if (card.type === 'wild_draw_four') {
        return '/images/uno/wild_draw_four.png';
      }
      return '/images/uno/wild.png';
    }
  
    // For action cards and number cards
    const color = card.color.toLowerCase();
    let value = card.value.toLowerCase();
    
    // Handle action card naming
    if (card.type === 'skip') {
      value = 'skip';
    } else if (card.type === 'reverse') {
      value = 'reverse';
    } else if (card.type === 'draw_two') {
      value = 'draw_two';
    }
    
    // Replace spaces with underscores for consistency
    value = value.replace(' ', '_');
    
    return `/images/uno/${color}_${value}.png`;
  };

  const getTopCard = (): UnoCard | null => {
    // Handle empty discard pile at game start
    if (!localGameState.discardPile || localGameState.discardPile.length === 0) {
      return null;
    }
    return localGameState.discardPile[localGameState.discardPile.length - 1];
  };

  const topCard = getTopCard();


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

  const UnoPlayerDisplay: React.FC<{ player: UnoPlayer; isActive: boolean; isCurrentUser: boolean }> = ({ 
    player, 
    isActive, 
    isCurrentUser 
  }) => {
    const { username, isLoading } = useUserData(player.id);
    
    const displayName = isLoading ? 'Loading...' : (username || player.name || player.id);
    
    return (
      <div 
        className={`uno-player ${isActive ? 'active' : ''} ${isCurrentUser ? 'current-user' : ''}`}
      >
        <div className="player-info">
          <span className="player-name">{displayName}</span>
          {player.hasUno && <span className="uno-indicator">UNO!</span>}
          <span className="card-count">{player.cards.length} cards</span>
        </div>
        {!isCurrentUser && (
          <div className="opponent-cards">
            {Array.from({ length: Math.min(player.cards.length, 8) }).map((_, i) => (
              <div key={i} className="uno-card-back"></div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Component for current turn display
  const CurrentTurnDisplay: React.FC<{ playerId: string }> = ({ playerId }) => {
    const { username, isLoading } = useUserData(playerId);
    
    const displayName = isLoading ? 'Loading...' : (username || 'Unknown');
    
    return <span>{displayName}</span>;
  };

  return (
    <div className="uno-game">
      {/* Game Info Bar */}
      <div className="uno-game-info">
        <div className="uno-current-turn">
        Current Turn: <CurrentTurnDisplay playerId={localGameState.currentTurn} />
        </div>
        <div className="uno-current-color">
          Current Color: <span className={`color-${localGameState.currentColor}`}>{localGameState.currentColor}</span>
        </div>
        <div className="uno-direction">
          Direction: {localGameState.direction === 1 ? '🔄' : '🔃'}
        </div>
        {localGameState.pendingDraw > 0 && (
          <div className="uno-pending-draw">
            Pending Draw: +{localGameState.pendingDraw}
          </div>
        )}
      </div>

      {/* Players Area - UPDATED */}
      <div className="uno-players-area">
        {localGameState.players.map((player) => {
          const isActive = player.id === localGameState.currentTurn;
          const isCurrentUser = player.id === currentPlayer;
          
          return (
            <UnoPlayerDisplay
              key={player.id}
              player={player}
              isActive={isActive}
              isCurrentUser={isCurrentUser}
            />
          );
        })}
      </div>

      {/* Game Board */}
      <div className="uno-board">
        {/* Draw Pile */}
<div className="uno-pile draw-pile" onClick={canPlay ? handleDrawCard : undefined}>
  <div className="uno-card-back"></div>
  <div className="pile-label">
    Draw ({localGameState.deck && Array.isArray(localGameState.deck) ? localGameState.deck.length : 0})
  </div>
</div>

        {/* Discard Pile */}
        <div className="uno-pile discard-pile">
  {topCard ? (
    <img 
      src={getCardImage(topCard)} 
      alt={`${topCard.color} ${topCard.value}`}
      className="uno-card-image"
    />
  ) : (
    <div className="uno-card-placeholder">
      <div>Start</div>
      <div>Play Any Card</div>
    </div>
  )}
  <div className="pile-label">Discard</div>
</div>

        {/* Center Info */}
        <div className="uno-center-info">
          {!localGameState.gameStarted && (
            <button className="uno-start-btn" onClick={handleStartGame}>
              Start Game
            </button>
          )}
        </div>
      </div>

      {/* Current Player's Hand */}
      {currentPlayerData && (
  <div className="uno-player-hand">
    <div className="hand-header">
      <span>Your Cards ({currentPlayerData.cards.length})</span>
      {currentPlayerData.cards.length === 1 && !currentPlayerData.hasUno && (
        <button className="uno-say-btn" onClick={handleSayUno}>
          Say UNO!
        </button>
      )}
    </div>
    <div className="card-container">
      {currentPlayerData.cards.map(card => (
        <div
          key={card.id}
          className={`uno-card ${canPlay ? 'playable' : ''} ${selectedCard === card.id ? 'selected' : ''}`}
          onClick={() => canPlay && handlePlayCard(card.id)}
        >
          <img 
            src={getCardImage(card)} 
            alt={`${card.color} ${card.value}`}
            className="uno-card-image"
            onError={(e) => {
              // Fallback if image doesn't exist
              const target = e.target as HTMLImageElement;
              console.warn(`Card image not found: ${getCardImage(card)}`);
              target.src = '/images/uno/card_back.png'; // Add a fallback image
            }}
          />
        </div>
      ))}
    </div>
  </div>
)}

      {/* Color Picker Modal */}
      {showColorPicker && (
        <div className="uno-color-picker-modal">
          <div className="color-picker-content">
            <h3>Choose a color:</h3>
            <div className="color-options">
              {['red', 'blue', 'green', 'yellow'].map(color => (
                <button
                  key={color}
                  className={`color-option ${color}`}
                  onClick={() => handleColorChoice(color)}
                >
                  {color}
                </button>
              ))}
            </div>
            <button 
              className="cancel-btn"
              onClick={() => setShowColorPicker(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending Color Choice */}
      {localGameState.pendingColorChoice && isCurrentTurn && (
        <div className="uno-pending-color">
          <h3>Choose a color for the wild card:</h3>
          <div className="color-options">
            {['red', 'blue', 'green', 'yellow'].map(color => (
              <button
                key={color}
                className={`color-option ${color}`}
                onClick={() => socket.emit('unoChooseColor', { roomId, playerId: currentPlayer, color })}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Game Over Leaderboard */}
      {localGameState.gameOver && leaderboardData.length > 0 && (
        <div className="text-center p-6 absolute inset-0 bg-gray-900/95 backdrop-blur-sm z-40 flex flex-col items-center justify-center">
          <h2 className="text-3xl font-bold mb-6">
            {leaderboardData[0]._id === currentPlayer ? 'Congratulations! 🎉' : 'Game Over!'}
          </h2>
          
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden max-w-2xl mx-auto mb-6">
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
                    Cards Left
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
                      <div className="text-lg font-bold">
                        {player.isWinner ? '0 (Winner!)' : `${player.cardsLeft} cards`}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleRestartGame}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 px-8 rounded-xl font-bold shadow-lg transition-all transform hover:scale-105"
          >
            Play Again
          </button>
        </div>
      )}

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

