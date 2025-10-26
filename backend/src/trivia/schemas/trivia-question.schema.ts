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

// // trivia-question.schema.ts
// import { Schema, Document } from 'mongoose';

// export interface TriviaQuestion extends Document {
//   questionId: string;
//   text: string;
//   options: string[];
//   correctAnswer: string;
//   difficulty: string;
//   category: string;
//   questionNumber: number; // For your proposed approach
//   usedInSessions: string[]; // Track which game sessions used this question
//   lastUsed: Date;
//   usageCount: number;
// }

// export const TriviaQuestionSchema = new Schema({
//   questionId: { type: String, required: true, unique: true },
//   text: { type: String, required: true },
//   options: [{ type: String, required: true }],
//   correctAnswer: { type: String, required: true },
//   difficulty: { type: String, required: true },
//   category: { type: String, required: true },
//   questionNumber: { type: Number }, // Your proposed field
//   usedInSessions: [{ type: String }], // Track game sessions
//   lastUsed: { type: Date },
//   usageCount: { type: Number, default: 0 }
// });