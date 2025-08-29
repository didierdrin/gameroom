// backend/user/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: '' })
  _id: string;

  @Prop({ default: Date.now })
   createdAt: Date;

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

// // src/user/user.schema.ts
// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';

// export type UserDocument = User & Document;

// @Schema({ timestamps: true })
// export class User extends Document {
//     @Prop({ required: true, unique: true })
//     username: string;
  
//     @Prop({ default: Date.now })
//     createdAt: Date;
//   }


// export const UserSchema = SchemaFactory.createForClass(User);


