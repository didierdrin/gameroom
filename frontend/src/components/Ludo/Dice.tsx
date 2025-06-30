import React from 'react';

interface DiceProps {
  value: number;
  onRoll: () => void;
  disabled?: boolean;
}

export const Dice: React.FC<DiceProps> = ({ value, onRoll, disabled = false }) => {
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
      onClick={onRoll}
      disabled={disabled}
      className={`w-16 h-16 flex items-center justify-center text-4xl rounded-lg ${
        disabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-white cursor-pointer hover:bg-gray-200'
      }`}
    >
      {value > 0 ? diceFaces[value] : '🎲'}
    </button>
  );
};