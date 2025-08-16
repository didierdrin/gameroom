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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {gameRooms.map((gameRoom: any) => (
        <GameRoomCard 
          key={gameRoom.id} 
          gameRoom={gameRoom} 
          onJoinRoom={onJoinRoom}
          playerIdToUsername={playerIdToUsername}
        />
      ))}
    </div>
  );
};