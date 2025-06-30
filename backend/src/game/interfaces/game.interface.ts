// src/game/interfaces/game.interface.ts
export interface MovePayload {
    roomCode: string;
    playerId: string;
    coinId: string;
    toCellId: string;
  }
  
  export interface DiceRollPayload {
    roomCode: string;
    playerId: string;
  }
  