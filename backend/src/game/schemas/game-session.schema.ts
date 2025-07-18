// src/game/schemas/game-session.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PlayerMove } from '../interfaces/game.interface';

@Schema({ timestamps: true })
export class GameSessionEntity {
  @Prop({ required: true, index: true })
  roomId: string;

  @Prop({ ref: 'GameRoom', required: false }) // Changed to optional
  gameRoom?: Types.ObjectId; // Made optional with ?

  @Prop({ required: true, type: [String] })
  players: string[];

  @Prop({ type: String })
  winner?: string; // Made optional

  @Prop({ type: Number, default: 0 })
  duration: number;

  @Prop({ type: [Object] })
  moves?: PlayerMove[]; // Made optional

  @Prop({ type: Object })
  finalState?: { // Made optional
    coins: Record<string, any>;
    players: string[];
    scores: Record<string, number>;
  };

  @Prop({ type: Date, default: Date.now })
  startedAt: Date;

  @Prop({ type: Date })
  endedAt?: Date; // Made optional

  @Prop({ type: Boolean, default: false })
  isTournament: boolean;

  @Prop({ type: String })
  tournamentId?: string; // Made optional
}

export type GameSessionDocument = GameSessionEntity & Document;
export const GameSessionSchema = SchemaFactory.createForClass(GameSessionEntity);


// // src/game/schemas/game-session.schema.ts
// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document, Types } from 'mongoose';
// import { PlayerMove } from '../interfaces/game.interface';


// @Schema({ timestamps: true })
// export class GameSessionEntity {
//   @Prop({ required: true, index: true })
//   roomId: string;

//   @Prop({ required: true, ref: 'GameRoom' })
//   gameRoom: Types.ObjectId;

//   @Prop({ required: true, type: [String] })
//   players: string[];

//   @Prop({ type: String })
//   winner: string;

//   @Prop({ type: Number, default: 0 })
//   duration: number;

//   @Prop({ type: [Object] })
//   moves: PlayerMove[];

//   @Prop({ type: Object })
//   finalState: {
//     coins: Record<string, any>;
//     players: string[];
//     scores: Record<string, number>;
//   };

//   @Prop({ type: Date, default: Date.now })
//   startedAt: Date;

//   @Prop({ type: Date })
//   endedAt: Date;

//   @Prop({ type: Boolean, default: false })
//   isTournament: boolean;

//   @Prop({ type: String })
//   tournamentId: string;
// }

// export type GameSessionDocument = GameSessionEntity & Document;
// export const GameSessionSchema = SchemaFactory.createForClass(GameSessionEntity);
