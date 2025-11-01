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

  /**
   * usageCount is a FIXED identifier (1-30) used for grouping questions
   * It represents which "slot" a question belongs to for shuffling purposes
   * Multiple questions can share the same usageCount
   * This value should NOT be incremented - it's assigned during population
   */
  @Prop({ default: 1, min: 1, max: 30 })
  usageCount: number;

  /**
   * Track which sessions have used this question to avoid repetition
   */
  @Prop({ type: [String], default: [] })
  usedInSessions: string[];

  /**
   * Last time this question was used in any session
   */
  @Prop({ default: Date.now })
  lastUsed: Date;
}

export const TriviaQuestionSchema = SchemaFactory.createForClass(TriviaQuestion);


// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';

// @Schema({ timestamps: true })
// export class TriviaQuestion extends Document {
//   @Prop({ required: true, unique: true })
//   questionId: string;

//   @Prop({ required: true })
//   text: string;

//   @Prop({ type: [String], required: true })
//   options: string[];

//   @Prop({ required: true })
//   correctAnswer: string;

//   @Prop({ default: 'medium' })
//   difficulty: string;

//   @Prop({ default: 'general' })
//   category: string;

//   @Prop({ default: 0 })
//   usageCount: number;

//   @Prop({ type: [String], default: [] })
//   usedInSessions: string[];

//   @Prop({ default: Date.now })
//   lastUsed: Date;
// }

// export const TriviaQuestionSchema = SchemaFactory.createForClass(TriviaQuestion);
