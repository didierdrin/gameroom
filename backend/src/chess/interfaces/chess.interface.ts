// /chess/interfaces/chess.interface.ts
import { Document } from 'mongoose';

export interface ChessPlayer {
  id: string;
  chessColor: 'white' | 'black';
}

export interface ChessState {
  board: string; // FEN notation
  moves: string[]; // Array of moves in algebraic notation
}

// Base interface for the chess game data
export interface ChessGame {
  roomId: string;
  players: ChessPlayer[];
  chessState: ChessState;
  currentTurn: string;
  gameStarted: boolean;
  gameOver: boolean;
  winner?: string;
  winCondition?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChessGameDocument extends ChessGame, Document {
  // Mongoose will automatically add _id, __v, save(), etc.
}


// // chess.interface.ts
// export interface ChessPlayer {
//     id: string;
//     name?: string;
//     chessColor: 'white' | 'black';
//   }
  
//   export interface ChessState {
//     board: string; // FEN
//     moves: string[];
//   }
  
//   export interface ChessGameDocument {
//     roomId: string;
//     players: ChessPlayer[];
//     chessState: ChessState;
//     currentTurn: string;
//     gameStarted: boolean;
//     gameOver: boolean;
//     winner?: string;
//     winCondition?: string;
//   }