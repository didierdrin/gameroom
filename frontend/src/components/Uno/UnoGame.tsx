import React, { useState, useEffect } from 'react';
import { useSocket } from '../../SocketContext';
import { useAuth } from '../../context/AuthContext';
import './UnoGame.css';

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
    return localGameState.discardPile.length > 0 
      ? localGameState.discardPile[localGameState.discardPile.length - 1] 
      : null;
  };

  const topCard = getTopCard();

  return (
    <div className="uno-game">
      {/* Game Info Bar */}
      <div className="uno-game-info">
        <div className="uno-current-turn">
          Current Turn: {localGameState.players.find(p => p.id === localGameState.currentTurn)?.name || 'Unknown'}
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

      {/* Players Area */}
      <div className="uno-players-area">
        {localGameState.players.map((player, index) => {
          const isActive = player.id === localGameState.currentTurn;
          const isCurrentUser = player.id === currentPlayer;
          
          return (
            <div 
              key={player.id} 
              className={`uno-player ${isActive ? 'active' : ''} ${isCurrentUser ? 'current-user' : ''}`}
            >
              <div className="player-info">
                <span className="player-name">{player.name}</span>
                {player.hasUno && <span className="uno-indicator">UNO!</span>}
                <span className="card-count">{player.cards.length} cards</span>
                <span className="player-score">Score: {player.score}</span>
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
            <div className="uno-card-placeholder">Start</div>
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
          {localGameState.gameOver && (
            <div className="uno-game-over">
              <h2>Game Over!</h2>
              <p>Winner: {localGameState.winner}</p>
              <button className="uno-restart-btn" onClick={handleRestartGame}>
                Play Again
              </button>
            </div>
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
    </div>
  );
};

