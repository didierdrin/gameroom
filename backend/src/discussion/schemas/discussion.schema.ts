import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DiscussionDocument = Discussion & Document;

@Schema({ timestamps: true })
export class Discussion {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  lastMessage: string;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;

  @Prop({ default: 0 })
  unread: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  participants: Types.ObjectId[];

  @Prop({ type: [
    {
      sender: { type: Types.ObjectId, ref: 'User' },
      content: String,
      timestamp: { type: Date, default: Date.now }
    }
  ], default: [] })
  messages: Array<{
    sender: Types.ObjectId;
    content: string;
    timestamp: Date;
  }>;
}

export const DiscussionSchema = SchemaFactory.createForClass(Discussion);
