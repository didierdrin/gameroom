// src/game/schemas/game-room.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameRoomDocument = GameRoom & Document;

@Schema()
export class GameRoom {
  @Prop({ required: true })
  roomId: string;

  @Prop({ type: Map, of: Number, default: {} })
  scores: Map<string, number>;
}

export const GameRoomSchema = SchemaFactory.createForClass(GameRoom);
