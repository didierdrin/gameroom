import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameRoomDocument = GameRoom & Document;

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

  @Prop({ type: Map, of: Number, default: {} })
  scores: Map<string, number>;

  @Prop()
  winner?: string;

  @Prop({ type: Date, default: null })
  scheduledTimeCombined?: Date;

  @Prop()
  scheduledTime?: Date;

  @Prop({ type: [String], default: [] })
  playerIds: string[];

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const GameRoomSchema = SchemaFactory.createForClass(GameRoom);

// // src/game/schemas/game-room.schema.ts
// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';

// export type GameRoomDocument = GameRoom & Document;

// @Schema({ timestamps: true })
// export class GameRoom {
//   @Prop({ required: true })
//   roomId: string;

//   @Prop({ required: true })
//   name: string;

//   @Prop({ required: true })
//   host: string;

//   @Prop({ required: true })
//   gameType: string;

//   @Prop({ default: false })
//   isPrivate: boolean;

//   @Prop()
//   password?: string;

//   @Prop({ required: true })
//   maxPlayers: number;

//   @Prop({ required: true })
//   currentPlayers: number;

//   @Prop({ default: 'waiting' })
//   status: 'waiting' | 'in-progress' | 'completed';

//   @Prop({ type: Map, of: Number, default: {} })
//   scores: Map<string, number>;

//   @Prop()
//   winner?: string;

//   @Prop({ type: Date, default: null })
//   scheduledTimeCombined?: Date;

//   @Prop()
//   scheduledTime?: Date;

//   @Prop({ type: [String], default: [] })
//   playerIds: string[];


// }

// export const GameRoomSchema = SchemaFactory.createForClass(GameRoom);
// GameRoomSchema.set('timestamps', true); 