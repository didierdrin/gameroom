import React from 'react';
import { GameRoomCard } from './GameRoomCard';

interface GameRoomListProps {
  gameRooms: any[];
  onJoinRoom: (gameRoom: any) => void;
  playerIdToUsername?: Record<string, string>;
}

export const GameRoomList: React.FC<GameRoomListProps> = ({
  gameRooms,
  onJoinRoom,
  playerIdToUsername = {}
}) => {
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
        {gameRooms.map((gameRoom: any) => (
          <GameRoomCard
            key={gameRoom.id}
            gameRoom={gameRoom}
            onJoinRoom={onJoinRoom}
          />
        ))}
      </div>
    </div>
  );
};