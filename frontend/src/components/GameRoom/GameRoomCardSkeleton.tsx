import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Skeleton card that mirrors GameRoomCard layout (~90% similar) for loading states.
 * Uses the same grid cell size and inner structure: header (icon + title + fee), host row, stats + badge, button.
 */
export const GameRoomCardSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div
      className={`relative rounded-xl border overflow-hidden ${
        isLight
          ? 'bg-white border-[#b4b4b4]'
          : 'bg-gray-800/50 border-gray-700/50'
      }`}
    >
      <div className="p-4">
        {/* Header: game icon + title row + game type (matches GameRoomCard) */}
        <div className="flex items-center mb-3">
          <div
            className={`w-10 h-10 rounded-lg flex-shrink-0 skeleton-shimmer ${
              isLight ? 'bg-gray-200' : 'bg-gray-600'
            }`}
          />
          <div className="ml-3 flex-1 w-0 min-w-0">
            <div className="flex justify-between items-start gap-2 mb-1">
              <div
                className={`h-4 flex-1 rounded skeleton-shimmer max-w-[70%] ${
                  isLight ? 'bg-gray-200' : 'bg-gray-600'
                }`}
              />
              <div
                className={`h-5 w-12 rounded-md skeleton-shimmer flex-shrink-0 ${
                  isLight ? 'bg-gray-200' : 'bg-gray-600'
                }`}
              />
            </div>
            <div
              className={`h-3 w-16 rounded skeleton-shimmer ${
                isLight ? 'bg-gray-200' : 'bg-gray-600'
              }`}
            />
          </div>
        </div>

        {/* Host row: avatar + "Hosted by" text */}
        <div className="flex items-center mb-4">
          <div
            className={`w-6 h-6 rounded-full flex-shrink-0 skeleton-shimmer ${
              isLight ? 'bg-gray-200' : 'bg-gray-600'
            }`}
          />
          <div
            className={`ml-2 h-3 w-24 rounded skeleton-shimmer ${
              isLight ? 'bg-gray-200' : 'bg-gray-600'
            }`}
          />
        </div>

        {/* Stats + badge row */}
        <div className="flex items-center justify-between mb-4">
          <div
            className={`h-4 w-20 rounded skeleton-shimmer ${
              isLight ? 'bg-gray-200' : 'bg-gray-600'
            }`}
          />
          <div
            className={`h-6 w-16 rounded-full skeleton-shimmer ${
              isLight ? 'bg-gray-200' : 'bg-gray-600'
            }`}
          />
        </div>

        {/* Join button placeholder */}
        <div
          className={`w-full h-9 rounded-lg skeleton-shimmer ${
            isLight ? 'bg-gray-200' : 'bg-gray-600'
          }`}
        />
      </div>
    </div>
  );
};
