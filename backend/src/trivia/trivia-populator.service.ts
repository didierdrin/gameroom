import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TriviaQuestion } from './schemas/trivia-question.schema';
import { TriviaService, TriviaSettings } from './trivia.service';

@Injectable()
export class TriviaPopulatorService {
  constructor(
    @InjectModel(TriviaQuestion.name) private triviaQuestionModel: Model<TriviaQuestion>,
    private readonly triviaService: TriviaService,
  ) {}

  async populateDatabase(): Promise<void> {
    console.log('Starting trivia database population...');
    
    const categories = [
      'general', 'science', 'history', 'geography', 'entertainment',
      'sports', 'technology', 'literature', 'music', 'art',
      'politics', 'nature', 'movies', 'food', 'mythology'
    ];
    
    const difficulties = ['easy', 'medium', 'hard'];
    
    for (const category of categories) {
      for (const difficulty of difficulties) {
        await this.populateCategoryWithDelay(category, difficulty);
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log('Trivia database population completed');
  }

  private async populateCategoryWithDelay(category: string, difficulty: string): Promise<void> {
    try {
      console.log(`Populating ${category} (${difficulty}) questions...`);
      
      // Fetch 30 questions to build a pool (API max is 50, but we'll get 30)
      const settings: TriviaSettings = {
        questionCount: 30,
        difficulty,
        category,
      };

      const apiQuestions = await this.triviaService.getQuestions(settings);
      
      // Store questions in database
      await this.storeQuestions(apiQuestions, category, difficulty);
      
      console.log(`Stored ${apiQuestions.length} questions for ${category} (${difficulty})`);
      
    } catch (error) {
      console.error(`Error populating ${category} (${difficulty}):`, error.message);
    }
  }

  private async storeQuestions(apiQuestions: any[], category: string, difficulty: string) {
    for (const q of apiQuestions) {
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
            // Don't increment usageCount here - only when actually used
            lastUsed: new Date()
          },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error('Error storing question:', error);
      }
    }
  }

  async getDatabaseStats(): Promise<any> {
    const stats = await this.triviaQuestionModel.aggregate([
      {
        $group: {
          _id: { category: '$category', difficulty: '$difficulty' },
          count: { $sum: 1 },
          avgUsage: { $avg: '$usageCount' },
          minUsage: { $min: '$usageCount' },
          maxUsage: { $max: '$usageCount' }
        }
      }
    ]);
    
    return stats;
  }
}