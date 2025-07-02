import React from 'react';

interface LudoGameProps {
  gameState: any;
  currentPlayerId: string;
  onMoveCoin: (coinId: string) => void;
}

export const LudoGame: React.FC<LudoGameProps> = ({ gameState, currentPlayerId, onMoveCoin }) => {
  // if (!gameState) return null;
  if (!gameState || !gameState.coins) return <div>Waiting for game state...</div>;


  const renderCoin = (playerId: string, coinId: string, coin: any) => {
    const isCurrentPlayer = playerId === currentPlayerId;
    const isMovable = isCurrentPlayer && 
                      gameState.currentTurn === currentPlayerId && 
                      gameState.diceValue > 0 &&
                      (coin.position === 'base' ? gameState.diceValue === 6 : true);

    const color = coinId.split('-')[0];
    const coinClasses = `w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold ${
      color === 'red' ? 'bg-red-500' :
      color === 'blue' ? 'bg-blue-500' :
      color === 'green' ? 'bg-green-500' : 'bg-yellow-500'
    } ${isMovable ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`;

    return (
      <div 
        key={coinId}
        className={coinClasses}
        onClick={() => isMovable && onMoveCoin(coinId)}
      >
        {coinId.split('-')[1]}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full">
      {/* Render Ludo board */}
      <div className="absolute inset-0 bg-ludo-board bg-cover bg-center opacity-50"></div>
      
      {/* Render coins */}
      <div className="relative z-10 w-full h-full">
        {/* {Object.entries(gameState.coins).map(([playerId, coins]) => (
          Object.entries(coins as any).map(([coinId, coin]) => (
            <div 
              key={`${playerId}-${coinId}`}
              className="absolute"
              style={getCoinPosition(coin)}
            >
              {renderCoin(playerId, coinId, coin)}
            </div>
          ))
        ))} */}
        {gameState.coins && Object.entries(gameState.coins).map(([playerId, coins]) => (
  Object.entries(coins as any).map(([coinId, coin]) => (
    <div 
      key={`${playerId}-${coinId}`}
      className="absolute"
      style={getCoinPosition(coin)}
    >
      {renderCoin(playerId, coinId, coin)}
    </div>
  ))
))}

      </div>
    </div>
  );
};

// Helper function to calculate coin position based on game state
function getCoinPosition(coin: any) {
  // This is a simplified version - you'll need to implement actual position calculation
  // based on your Ludo board layout and the coin's steps/position
  
  if (coin.position === 'base') {
    // Position in the player's base
    return { top: '50%', left: '50%' };
  }
  
  if (coin.position === 'home') {
    // Position in the player's home
    return { top: '10%', left: '10%' };
  }
  
  // Position along the path
  const angle = (coin.steps / 57) * 360; // 57 total steps in a standard Ludo game
  const radius = 150;
  const centerX = 200;
  const centerY = 200;
  
  return {
    top: `${centerY + Math.sin(angle * Math.PI / 180) * radius}px`,
    left: `${centerX + Math.cos(angle * Math.PI / 180) * radius}px`,
  };
}