import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose'; 
import { TriviaService } from './trivia.service';
import { TriviaQuestion } from './schemas/trivia-question.schema';


export interface Question {
    id: string;
    text: string;
    options: string[];
    correctAnswer: string;
    difficulty?: string;
    category?: string;
  }
  
  export interface TriviaSettings {
    questionCount: number;
    difficulty: string;
    category: string;
  }

// enhanced-trivia.service.ts
@Injectable()
export class EnhancedTriviaService {
  constructor(
    @InjectModel(TriviaQuestion.name) private triviaQuestionModel: Model<TriviaQuestion>,
    // @InjectModel('TriviaQuestion') private triviaQuestionModel: Model<TriviaQuestion>,
    private readonly triviaService: TriviaService
  ) {}

  async getUniqueQuestionsForSession(settings: TriviaSettings, sessionId: string): Promise<Question[]> {
    const { questionCount, difficulty, category } = settings;
    
    // Try to get questions not used in this session
    let questions = await this.triviaQuestionModel.find({
      category,
      difficulty,
      usedInSessions: { $ne: sessionId }
    }).limit(questionCount * 2).exec();

    // If not enough unique questions, get some from API
    if (questions.length < questionCount) {
      console.log(`Only found ${questions.length} unique questions, fetching from API`);
      
      const apiQuestions = await this.triviaService.getQuestions(settings);
      await this.storeQuestions(apiQuestions, category, difficulty);
      
      // Get fresh batch including new questions
      questions = await this.triviaQuestionModel.find({
        category,
        difficulty,
        usedInSessions: { $ne: sessionId }
      }).limit(questionCount).exec();
    }

    // Mark questions as used in this session
    const selectedQuestions = questions.slice(0, questionCount);
    await this.markQuestionsAsUsed(selectedQuestions, sessionId);

    return selectedQuestions.map(q => ({
      id: q.questionId,
      text: q.text,
      options: this.shuffleArray([...q.options]),
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty,
      category: q.category
    }));
  }

  private async storeQuestions(apiQuestions: Question[], category: string, difficulty: string) {
    for (const q of apiQuestions) {
      await this.triviaQuestionModel.findOneAndUpdate(
        { questionId: q.id },
        {
          questionId: q.id,
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          difficulty: difficulty,
          category: category,
          $inc: { usageCount: 1 },
          lastUsed: new Date()
        },
        { upsert: true, new: true }
      );
    }
  }

  private async markQuestionsAsUsed(questions: TriviaQuestion[], sessionId: string) {
    const questionIds = questions.map(q => q._id);
    await this.triviaQuestionModel.updateMany(
      { _id: { $in: questionIds } },
      { 
        $addToSet: { usedInSessions: sessionId },
        $set: { lastUsed: new Date() },
        $inc: { usageCount: 1 }
      }
    );
  }

  // Clean up old session references periodically
  async cleanupOldSessions(maxAgeDays: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    
    await this.triviaQuestionModel.updateMany(
      { lastUsed: { $lt: cutoffDate } },
      { $set: { usedInSessions: [] } }
    );
  }

  private shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  
async regenerateQuestionsWithNewCategory(roomId: string, settings: TriviaSettings): Promise<Question[]> {
    try {
      console.log('Regenerating questions with new category:', settings);
      
      // Clear any session tracking for this room to get fresh questions
      await this.triviaQuestionModel.updateMany(
        { usedInSessions: roomId },
        { $pull: { usedInSessions: roomId } }
      );
      
      // Get new questions with the updated settings
      const questions = await this.getUniqueQuestionsForSession(settings, roomId);
      
      console.log(`Generated ${questions.length} new questions for category: ${settings.category}`);
      return questions;
      
    } catch (error) {
      console.error('Error regenerating questions with new category:', error);
      throw error;
    }
  }

}