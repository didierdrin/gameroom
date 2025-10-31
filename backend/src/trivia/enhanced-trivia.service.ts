import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose'; 
import { TriviaService } from './trivia.service';
import { TriviaQuestion } from './schemas/trivia-question.schema';
import { TriviaPopulatorService } from './trivia-populator.service';


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

@Injectable()
export class EnhancedTriviaService {
  constructor(
    @InjectModel(TriviaQuestion.name) private triviaQuestionModel: Model<TriviaQuestion>,    
    private readonly triviaService: TriviaService,
    private readonly triviaPopulator: TriviaPopulatorService
  ) {}

  async getUniqueQuestionsForSession(settings: TriviaSettings, sessionId: string): Promise<Question[]> {
    const { questionCount, difficulty, category } = settings;
    
    console.log(`Getting ${questionCount} questions for ${category} (${difficulty}), session: ${sessionId}`);
    
    // First, try to get questions with lowest usage count that haven't been used in this session
    let questions = await this.triviaQuestionModel.find({
      category,
      difficulty,
      usedInSessions: { $ne: sessionId }
    })
    .sort({ usageCount: 1, lastUsed: 1 }) // Prioritize least used and oldest
    .limit(questionCount * 3) // Get more than needed for shuffling
    .exec();

    console.log(`Found ${questions.length} existing questions in database`);

    // If not enough questions, fetch from API and store them
    if (questions.length < questionCount) {
      console.log(`Only found ${questions.length} unique questions, need ${questionCount}. Fetching from API...`);
      
      const apiQuestions = await this.triviaService.getQuestions({
        ...settings,
        questionCount: Math.min(30, questionCount * 2) // Get more to build pool
      });
      
      await this.storeQuestions(apiQuestions, category, difficulty);
      
      // Try again with the new questions
      questions = await this.triviaQuestionModel.find({
        category,
        difficulty,
        usedInSessions: { $ne: sessionId }
      })
      .sort({ usageCount: 1, lastUsed: 1 })
      .limit(questionCount * 2)
      .exec();
      
      console.log(`After API fetch, now have ${questions.length} questions available`);
    }

    // If still not enough, use whatever we have (even if used in session)
    if (questions.length < questionCount) {
      console.log(`Still only have ${questions.length} questions. Using all available...`);
      questions = await this.triviaQuestionModel.find({
        category,
        difficulty
      })
      .sort({ usageCount: 1, lastUsed: 1 })
      .limit(questionCount)
      .exec();
    }

    // Shuffle and select the required number of questions
    const selectedQuestions = this.shuffleArray(questions).slice(0, questionCount);
    
    console.log(`Selected ${selectedQuestions.length} questions with usage counts:`, 
      selectedQuestions.map(q => q.usageCount));

    // Mark questions as used in this session
    await this.markQuestionsAsUsed(selectedQuestions, sessionId);

    return selectedQuestions.map(q => ({
      id: q.questionId,
      text: q.text,
      options: this.shuffleArray([...q.options]), // Shuffle answer options
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty,
      category: q.category
    }));
  }

  private async storeQuestions(apiQuestions: Question[], category: string, difficulty: string) {
    const storePromises = apiQuestions.map(async (q) => {
      try {
        await this.triviaQuestionModel.findOneAndUpdate(
          { questionId: q.id },
          {
            questionId: q.id,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            difficulty: difficulty,
            category: category,
            // Initialize with default values, don't increment usageCount here
            lastUsed: new Date()
          },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error('Error storing question:', error);
      }
    });

    await Promise.allSettled(storePromises);
  }

  async getTotalQuestionCount(): Promise<number> {
    return await this.triviaQuestionModel.countDocuments();
  }

  private async markQuestionsAsUsed(questions: TriviaQuestion[], sessionId: string) {
    const questionIds = questions.map(q => q._id);
    
    await this.triviaQuestionModel.updateMany(
      { _id: { $in: questionIds } },
      { 
        $addToSet: { usedInSessions: sessionId },
        $set: { lastUsed: new Date() },
        $inc: { usageCount: 1 } // Only increment when actually used in a game
      }
    );
    
    console.log(`Marked ${questionIds.length} questions as used in session ${sessionId}`);
  }

  // Add method to get database statistics
  async getQuestionStats(category?: string, difficulty?: string): Promise<any> {
    const matchStage: any = {};
    if (category) matchStage.category = category;
    if (difficulty) matchStage.difficulty = difficulty;

    const stats = await this.triviaQuestionModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { category: '$category', difficulty: '$difficulty' },
          totalQuestions: { $sum: 1 },
          averageUsage: { $avg: '$usageCount' },
          minUsage: { $min: '$usageCount' },
          maxUsage: { $max: '$usageCount' },
          neverUsed: {
            $sum: { $cond: [{ $eq: ['$usageCount', 0] }, 1, 0] }
          }
        }
      }
    ]);

    return stats;
  }

  // Shuffle array using Fisher-Yates algorithm
  private shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
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