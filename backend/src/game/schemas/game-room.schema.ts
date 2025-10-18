import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import { TriviaSettings } from '../../trivia/trivia.service';

// export type GameRoomDocument = GameRoom & Document;

@Schema({ timestamps: true })
export class GameRoom {
  @Prop({ required: true })
  roomId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  host: string;

  @Prop({ required: true })
  gameType: string;

  @Prop({ default: false })
  isPrivate: boolean;

  @Prop()
  password?: string;

  @Prop({ required: true })
  maxPlayers: number;

  @Prop({ required: true })
  currentPlayers: number;

  @Prop({ default: 'waiting' })
  status: 'waiting' | 'in-progress' | 'completed';

  
  
  @Prop({ type: Object, default: {} })
  scores: Record<string, number>;

  @Prop()
  winner?: string;

  @Prop({ type: Date, default: null })
  scheduledTimeCombined?: Date;

  @Prop()
  scheduledTime?: Date;

  @Prop({ type: [String], default: [] })
  playerIds: string[];

  // Add spectator tracking
  @Prop({ type: [String], default: [] })
  spectatorIds: string[];

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;

  @Prop({ type: Object, required: false })
  triviaSettings?: TriviaSettings;
}

export const GameRoomSchema = SchemaFactory.createForClass(GameRoom);
export type GameRoomDocument = HydratedDocument<GameRoom>;
