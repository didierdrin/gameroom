import React from 'react';
import { GameRoomCard } from './GameRoomCard';
export const GameRoomList = ({
  gameRooms,
  onJoinRoom
}:any) => {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {gameRooms.map((gameRoom:any) => <GameRoomCard key={gameRoom.id} gameRoom={gameRoom} onJoinRoom={onJoinRoom} />)}
    </div>;
};