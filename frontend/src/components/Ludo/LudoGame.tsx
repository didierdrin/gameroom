import React from 'react';
import boardImage from '../../../assets/Ludo.jpg';

interface LudoGameProps {
  gameState: any;
  currentPlayerId: string;
  onMoveCoin: (coinId: string) => void;
}

export const LudoGame: React.FC<LudoGameProps> = ({
  gameState,
  currentPlayerId,
  onMoveCoin,
}) => {
  if (!gameState || !gameState.coins) return <div>Waiting for game state...</div>;

  const renderCoin = (playerId: string, coinId: string, coin: any) => {
    const isCurrentPlayer = playerId === currentPlayerId;
    const isMovable =
      isCurrentPlayer &&
      gameState.currentTurn === currentPlayerId &&
      gameState.diceValue > 0 &&
      (coin.position === 'base' ? gameState.diceValue === 6 : true);

    const color = coinId.split('-')[0];
    const coinClasses = `w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold shadow-md absolute z-10
      ${color === 'red' ? 'bg-red-500' :
        color === 'blue' ? 'bg-blue-500' :
          color === 'green' ? 'bg-green-500' : 'bg-yellow-500'}
      ${isMovable ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`;

    return (
      <div
        key={coinId}
        className={coinClasses}
        style={getCoinPosition(coin, coinId)}
        onClick={() => isMovable && onMoveCoin(coinId)}
      >
        {coinId.split('-')[1]}
      </div>
    );
  };

  return (
    <div className="relative w-[600px] h-[600px] border">
      {/* Ludo board background */}
      <img
        src={boardImage}
        alt="Ludo Board"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* Render coins */}
      {Object.entries(gameState.coins).map(([playerId, coins]) =>
        Object.entries(coins as any).map(([coinId, coin]) =>
          renderCoin(playerId, coinId, coin)
        )
      )}
    </div>
  );
};

// STEP GRID POSITIONS (sample only for demo)
const STEP_POSITIONS: { [key: number]: { top: number; left: number } } = {
  0: { top: 260, left: 40 }, // example for red start
  1: { top: 220, left: 40 },
  2: { top: 180, left: 40 },
  3: { top: 140, left: 40 },
  4: { top: 100, left: 40 },
  5: { top: 60, left: 40 },
  6: { top: 20, left: 40 },
  7: { top: 20, left: 80 },
  8: { top: 20, left: 120 },
  // ...continue until step 56
};

// BASE POSITIONS (per color)
const BASE_POSITIONS: Record<string, { top: number; left: number }[]> = {
  red: [
    { top: 420, left: 60 }, { top: 420, left: 120 },
    { top: 480, left: 60 }, { top: 480, left: 120 }
  ],
  blue: [
    { top: 60, left: 60 }, { top: 60, left: 120 },
    { top: 120, left: 60 }, { top: 120, left: 120 }
  ],
  green: [
    { top: 60, left: 420 }, { top: 60, left: 480 },
    { top: 120, left: 420 }, { top: 120, left: 480 }
  ],
  yellow: [
    { top: 420, left: 420 }, { top: 420, left: 480 },
    { top: 480, left: 420 }, { top: 480, left: 480 }
  ]
};

const HOME_POSITIONS: Record<string, { top: number; left: number }> = {
  red: { top: 280, left: 280 },
  blue: { top: 200, left: 200 },
  green: { top: 200, left: 360 },
  yellow: { top: 360, left: 360 },
};

// Helper for positioning coins
function getCoinPosition(coin: any, coinId: string) {
  const color = coinId.split('-')[0];

  if (coin.position === 'base') {
    const index = parseInt(coinId.split('-')[1], 10);
    return BASE_POSITIONS[color][index] || { top: 0, left: 0 };
  }

  if (coin.position === 'home') {
    return HOME_POSITIONS[color] || { top: 0, left: 0 };
  }

  if (typeof coin.steps === 'number') {
    return STEP_POSITIONS[coin.steps] || { top: 0, left: 0 };
  }

  return { top: 0, left: 0 };
}



// import React from 'react';

// interface LudoGameProps {
//   gameState: any;
//   currentPlayerId: string;
//   onMoveCoin: (coinId: string) => void;
// }

// export const LudoGame: React.FC<LudoGameProps> = ({ gameState, currentPlayerId, onMoveCoin }) => {
//   // if (!gameState) return null;
//   if (!gameState || !gameState.coins) return <div>Waiting for game state...</div>;


//   const renderCoin = (playerId: string, coinId: string, coin: any) => {
//     const isCurrentPlayer = playerId === currentPlayerId;
//     const isMovable = isCurrentPlayer && 
//                       gameState.currentTurn === currentPlayerId && 
//                       gameState.diceValue > 0 &&
//                       (coin.position === 'base' ? gameState.diceValue === 6 : true);

//     const color = coinId.split('-')[0];
//     const coinClasses = `w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold ${
//       color === 'red' ? 'bg-red-500' :
//       color === 'blue' ? 'bg-blue-500' :
//       color === 'green' ? 'bg-green-500' : 'bg-yellow-500'
//     } ${isMovable ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`;

//     return (
//       <div 
//         key={coinId}
//         className={coinClasses}
//         onClick={() => isMovable && onMoveCoin(coinId)}
//       >
//         {coinId.split('-')[1]}
//       </div>
//     );
//   };

//   return (
//     <div className="relative w-full h-full">
//       {/* Render Ludo board */}
//       <div className="absolute inset-0 bg-ludo-board bg-cover bg-center opacity-50"></div>
      
//       {/* Render coins */}
//       <div className="relative z-10 w-full h-full">
//         {/* {Object.entries(gameState.coins).map(([playerId, coins]) => (
//           Object.entries(coins as any).map(([coinId, coin]) => (
//             <div 
//               key={`${playerId}-${coinId}`}
//               className="absolute"
//               style={getCoinPosition(coin)}
//             >
//               {renderCoin(playerId, coinId, coin)}
//             </div>
//           ))
//         ))} */}
//         {gameState.coins && Object.entries(gameState.coins).map(([playerId, coins]) => (
//   Object.entries(coins as any).map(([coinId, coin]) => (
//     <div 
//       key={`${playerId}-${coinId}`}
//       className="absolute"
//       style={getCoinPosition(coin)}
//     >
//       {renderCoin(playerId, coinId, coin)}
//     </div>
//   ))
// ))}

//       </div>
//     </div>
//   );
// };

// // Helper function to calculate coin position based on game state
// function getCoinPosition(coin: any) {
//   // This is a simplified version - you'll need to implement actual position calculation
//   // based on your Ludo board layout and the coin's steps/position
  
//   if (coin.position === 'base') {
//     // Position in the player's base
//     return { top: '50%', left: '50%' };
//   }
  
//   if (coin.position === 'home') {
//     // Position in the player's home
//     return { top: '10%', left: '10%' };
//   }
  
//   // Position along the path
//   const angle = (coin.steps / 57) * 360; // 57 total steps in a standard Ludo game
//   const radius = 150;
//   const centerX = 200;
//   const centerY = 200;
  
//   return {
//     top: `${centerY + Math.sin(angle * Math.PI / 180) * radius}px`,
//     left: `${centerX + Math.cos(angle * Math.PI / 180) * radius}px`,
//   };
// }