// /chess/schemas/chess.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class ChessPlayer {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true, enum: ['white', 'black'] })
  chessColor: 'white' | 'black';
}

@Schema()
export class ChessState {
  @Prop({ required: true, default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' })
  board: string;

  @Prop({ type: [String], default: [] })
  moves: string[];
}

@Schema({ timestamps: true })
export class ChessGame extends Document {
  @Prop({ required: true, unique: true })
  roomId: string;

  @Prop({ type: [ChessPlayer], default: [] })
  players: ChessPlayer[];

  @Prop({ type: ChessState, default: () => ({}) })
  chessState: ChessState;

  @Prop({ default: '' })
  currentTurn: string;

  @Prop({ default: false })
  gameStarted: boolean;

  @Prop({ default: false })
  gameOver: boolean;

  @Prop()
  winner?: string;

  @Prop()
  winCondition?: string;
}

export const ChessGameSchema = SchemaFactory.createForClass(ChessGame);
export type ChessGameDocument = ChessGame & Document;

// // chess.schema.ts
// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';

// @Schema({ timestamps: true })
// export class ChessGame extends Document {
//   @Prop({ required: true, unique: true })
//   roomId: string;

//   @Prop({ type: [{ id: String, chessColor: String }] })
//   players: { id: string; chessColor: 'white' | 'black' }[];

//   @Prop({ type: { board: String, moves: [String] }, default: { board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [] } })
//   chessState: { board: string; moves: string[] };

//   @Prop()
//   currentTurn: string;

//   @Prop({ default: false })
//   gameStarted: boolean;

//   @Prop({ default: false })
//   gameOver: boolean;

//   @Prop()
//   winner?: string;

//   @Prop()
//   winCondition?: string;
// }

// export const ChessGameSchema = SchemaFactory.createForClass(ChessGame);