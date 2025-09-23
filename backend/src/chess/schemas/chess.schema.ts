// chess.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ChessGame extends Document {
  @Prop({ required: true, unique: true })
  roomId: string;

  @Prop({ type: [{ id: String, chessColor: String }] })
  players: { id: string; chessColor: 'white' | 'black' }[];

  @Prop({ type: { board: String, moves: [String] }, default: { board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [] } })
  chessState: { board: string; moves: string[] };

  @Prop()
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