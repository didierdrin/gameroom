import React from 'react';
import { GameRoomCardSkeleton } from './GameRoomCardSkeleton';

const SKELETON_COUNT = 4; // 2x2 grid to match typical GameRoomList layout

/**
 * Grid of skeleton cards matching GameRoomList layout for loading states.
 */
export const GameRoomListSkeleton: React.FC = () => {
  return (
    <div className="overflow-x-auto overflow-y-hidden -mx-2 px-2 pb-2">
      <div
        className="inline-grid gap-4"
        style={{
          gridAutoFlow: 'column',
          gridTemplateRows: 'repeat(2, 1fr)',
          gridAutoColumns: 'minmax(260px, 320px)',
        }}
      >
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <GameRoomCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};
