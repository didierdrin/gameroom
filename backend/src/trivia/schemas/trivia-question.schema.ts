// trivia-question.schema.ts
import { Schema, Document } from 'mongoose';

export interface TriviaQuestion extends Document {
  questionId: string;
  text: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
  category: string;
  questionNumber: number; // For your proposed approach
  usedInSessions: string[]; // Track which game sessions used this question
  lastUsed: Date;
  usageCount: number;
}

export const TriviaQuestionSchema = new Schema({
  questionId: { type: String, required: true, unique: true },
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },
  difficulty: { type: String, required: true },
  category: { type: String, required: true },
  questionNumber: { type: Number }, // Your proposed field
  usedInSessions: [{ type: String }], // Track game sessions
  lastUsed: { type: Date },
  usageCount: { type: Number, default: 0 }
});