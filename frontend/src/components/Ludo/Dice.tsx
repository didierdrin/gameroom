import React, { useState, useEffect } from 'react';

interface DiceProps {
  value: number;
  onRoll: () => void;
  disabled?: boolean;
}

export const Dice: React.FC<DiceProps> = ({ value, onRoll, disabled = false }) => {
  const [isRolling, setIsRolling] = useState(false);

  const handleRoll = () => {
    if (disabled || isRolling) return;
    setIsRolling(true);
    onRoll();
    setTimeout(() => setIsRolling(false), 1000);
  };

  const diceFaces = [
    null, // 0 (no value)
    '⚀', // 1
    '⚁', // 2
    '⚂', // 3
    '⚃', // 4
    '⚄', // 5
    '⚅', // 6
  ];

  return (
    <button
      onClick={handleRoll}
      disabled={disabled || isRolling}
      className={`
        w-20 h-20 flex items-center justify-center text-5xl rounded-2xl 
        transition-all duration-500 transform shadow-2xl
        ${disabled 
          ? 'bg-gradient-to-br from-gray-600 to-gray-700 cursor-not-allowed opacity-50' 
          : 'bg-gradient-to-br from-white to-gray-100 cursor-pointer hover:scale-110 hover:shadow-3xl'
        }
        ${isRolling ? 'animate-bounce rotate-180' : ''}
        border-2 border-white/30
      `}
    >
      <span className={`
        transition-all duration-300
        ${isRolling ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}
      `}>
        {value > 0 ? diceFaces[value] : '🎲'}
      </span>
    </button>
  );
};

// import React from 'react';

// interface DiceProps {
//   value: number;
//   onRoll: () => void;
//   disabled?: boolean;
// }

// export const Dice: React.FC<DiceProps> = ({ value, onRoll, disabled = false }) => {
//   const diceFaces = [
//     null, // 0 (no value)
//     '⚀', // 1
//     '⚁', // 2
//     '⚂', // 3
//     '⚃', // 4
//     '⚄', // 5
//     '⚅', // 6
//   ];

//   return (
//     <button
//       onClick={onRoll}
//       disabled={disabled}
//       className={`w-16 h-16 flex items-center justify-center text-4xl rounded-lg ${
//         disabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-white cursor-pointer hover:bg-gray-200'
//       }`}
//     >
//       {value > 0 ? diceFaces[value] : '🎲'}
//     </button>
//   );
// };