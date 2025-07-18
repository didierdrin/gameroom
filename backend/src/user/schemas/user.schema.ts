// src/user/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User extends Document {
    @Prop({ required: true, unique: true })
    username: string;
  
    @Prop({ default: Date.now })
    createdAt: Date;
  }
// export class User {
//   @Prop({ required: true, unique: true })
//   username: string;

//   @Prop({ default: Date.now })
//   createdAt: Date;
// }

export const UserSchema = SchemaFactory.createForClass(User);


// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';

// export type UserDocument = User & Document;

// @Schema()
// export class User {
//   @Prop({ required: true, unique: true })
//   username: string;
// }

// export const UserSchema = SchemaFactory.createForClass(User);

