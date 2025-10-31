import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class TriviaQuestion extends Document {
  @Prop({ required: true, unique: true })
  questionId: string;

  @Prop({ required: true })
  text: string;

  @Prop({ type: [String], required: true })
  options: string[];

  @Prop({ required: true })
  correctAnswer: string;

  @Prop({ default: 'medium' })
  difficulty: string;

  @Prop({ default: 'general' })
  category: string;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ type: [String], default: [] })
  usedInSessions: string[];

  @Prop({ default: Date.now })
  lastUsed: Date;
}

export const TriviaQuestionSchema = SchemaFactory.createForClass(TriviaQuestion);
