
// backend/user/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class User {
  // Explicitly define _id property for TypeScript
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: false, unique: true, sparse: true })
  email: string;

  @Prop({ required: false })
  password: string;

  @Prop({ required: false })
  avatar: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;

  @Prop({ default: 0 })
  totalScore: number;

  @Prop({ default: 0 })
  gamesPlayed: number;

  @Prop({ default: 0 })
  gamesWon: number;

  @Prop({ type: [String], default: [] })
  gameTypesPlayed: string[];

  @Prop({ type: [{ 
    gameType: String,
    count: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    score: { type: Number, default: 0 }
  }], default: [] })
  gameStats: {
    gameType: string;
    count: number;
    wins: number;
    score: number;
  }[];

  @Prop({ type: [{ 
    roomId: String,
    gameType: String,
    score: Number,
    won: Boolean,
    date: Date 
  }], default: [] })
  gameHistory: {
    roomId: string;
    gameType: string;
    score: number;
    won: boolean;
    date: Date;
  }[];
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);




// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';

// @Schema({ timestamps: true }) // Remove _id: false
// export class User {
//   @Prop({ required: true, unique: true })
//   username: string;

//   @Prop({ required: false, unique: true, sparse: true })
//   email: string;

//   @Prop({ required: false })
//   password: string;

//   @Prop({ required: false })
//   avatar: string; // Add this line for avatar

//   @Prop({ type: Date, default: Date.now })
//   createdAt: Date;

//   @Prop({ type: Date, default: Date.now })
//   updatedAt: Date;

//   @Prop({ default: 0 })
//   totalScore: number;

//   @Prop({ default: 0 })
//   gamesPlayed: number;

//   @Prop({ default: 0 })
//   gamesWon: number;

//   @Prop({ type: [String], default: [] })
//   gameTypesPlayed: string[];

//   @Prop({ type: [{ 
//     gameType: String,
//     count: { type: Number, default: 0 },
//     wins: { type: Number, default: 0 },
//     score: { type: Number, default: 0 }
//   }], default: [] })
//   gameStats: {
//     gameType: string;
//     count: number;
//     wins: number;
//     score: number;
//   }[];

//   @Prop({ type: [{ 
//     roomId: String,
//     gameType: String,
//     score: Number,
//     won: Boolean,
//     date: Date 
//   }], default: [] })
//   gameHistory: {
//     roomId: string;
//     gameType: string;
//     score: number;
//     won: boolean;
//     date: Date;
//   }[];
// }

// export type UserDocument = User & Document;
// export const UserSchema = SchemaFactory.createForClass(User);




