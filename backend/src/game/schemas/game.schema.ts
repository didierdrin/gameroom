// src/game/schemas/game.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class GameRoom extends Document {
  @Prop({ required: true, unique: true })
  roomCode: string;

  @Prop({ type: [String], default: [] })
  players: string[];

  @Prop({ type: Map, of: Number, default: {} }) // playerId => score
  scores: Record<string, number>;

  @Prop({ default: null })
  currentTurn: string;

  @Prop({ default: 'waiting' }) // waiting | playing | ended
  status: string;
}

export const GameRoomSchema = SchemaFactory.createForClass(GameRoom);
