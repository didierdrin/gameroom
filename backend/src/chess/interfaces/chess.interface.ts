// /chess/interfaces/chess.interface.ts
import { HydratedDocument } from 'mongoose';

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

export type ChessGameDocument = HydratedDocument<ChessGame>;



// // /chess/interfaces/chess.interface.ts
// import { HydratedDocument } from 'mongoose';

// export interface ChessPlayer {
//   id: string;
//   chessColor: 'white' | 'black';
// }

// export interface ChessState {
//   board: string; // FEN notation
//   moves: string[]; // Array of moves in algebraic notation
// }

// // Base interface for the chess game data
// export interface ChessGame {
//   roomId: string;
//   players: ChessPlayer[];
//   chessState: ChessState;
//   currentTurn: string;
//   gameStarted: boolean;
//   gameOver: boolean;
//   winner?: string;
//   winCondition?: string;
//   createdAt?: Date;
//   updatedAt?: Date;
// }

// export type ChessGameDocument = HydratedDocument<ChessGame>;