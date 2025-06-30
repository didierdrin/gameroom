// src/game/interfaces/game.interface.ts
import { Document } from 'mongoose';

export interface PlayerMove {
  playerId: string;
  action: 'roll' | 'move';
  diceValue?: number;
  coinId?: string;
  fromPosition?: string;
  toPosition?: string;
  timestamp: Date;
}

export interface GameSession extends Document {
  roomId: string;
  gameRoom: any; // Reference to GameRoom
  players: string[];
  winner: string;
  duration: number;
  moves: PlayerMove[];
  finalState: {
    coins: Record<string, any>;
    players: string[];
    scores: Record<string, number>;
  };
  startedAt: Date;
  endedAt: Date;
  isTournament: boolean;
  tournamentId: string;
  createdAt: Date;
  updatedAt: Date;
}
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
  