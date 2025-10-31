// trivia.controller.ts
import { Controller, Get, Post, Query, HttpException, HttpStatus } from '@nestjs/common';
import { TriviaService, Question, TriviaSettings } from './trivia.service';
import { EnhancedTriviaService } from './enhanced-trivia.service';
import { TriviaPopulatorService } from './trivia-populator.service';

@Controller('trivia')
export class TriviaController {
  constructor(
    private readonly triviaService: TriviaService, 
    private readonly enhancedTriviaService: EnhancedTriviaService,
    private readonly triviaPopulator: TriviaPopulatorService
    ) {}




  @Get('questions')
  async getQuestions( 
    @Query('count') count?: string,
    @Query('difficulty') difficulty?: string,
    @Query('category') category?: string,
  ): Promise<{ success: true; data: { questions: Question[]; settings: TriviaSettings } }> {
    try {
      // Parse and validate parameters
      const questionCount = count ? parseInt(count, 10) : 10;
      
      // Validate question count (OpenTDB max is 50)
      if (isNaN(questionCount) || questionCount < 1 || questionCount > 50) {
        throw new HttpException(
          'Invalid question count. Must be between 1 and 50.',
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate difficulty
      const validDifficulties = ['easy', 'medium', 'hard'];
      const selectedDifficulty = difficulty?.toLowerCase() || 'medium';
      if (!validDifficulties.includes(selectedDifficulty)) {
        throw new HttpException(
          'Invalid difficulty. Must be easy, medium, or hard.',
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate category (must match OpenTDB available categories)
      const validCategories = [
        'general', 'science', 'history', 'geography', 'entertainment',
        'sports', 'technology', 'literature', 'music', 'art',
        'politics', 'nature', 'movies', 'food', 'mythology'
      ];
      const selectedCategory = category?.toLowerCase() || 'general';
      if (!validCategories.includes(selectedCategory)) {
        throw new HttpException(
          `Invalid category. Must be one of: ${validCategories.join(', ')}`,
          HttpStatus.BAD_REQUEST
        );
      }

      const settings: TriviaSettings = {
        questionCount,
        difficulty: selectedDifficulty,
        category: selectedCategory,
      };

      const questions = await this.triviaService.getQuestions(settings);
      
      if (!questions || questions.length === 0) {
        throw new HttpException(
          'No questions available for the selected criteria. Try different settings.',
          HttpStatus.NOT_FOUND
        );
      }

      return {
        success: true,
        data: {
          questions,
          settings: {
            questionCount: questions.length,
            difficulty: selectedDifficulty,
            category: selectedCategory,
          }
        }
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      console.error('Error getting trivia questions:', error);
      throw new HttpException(
        error.message || 'Failed to fetch trivia questions. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  @Post('populate-database')
  async populateDatabase() {
    try {
      await this.triviaPopulator.populateDatabase();
      return {
        success: true,
        message: 'Database population started successfully'
      };
    } catch (error) {
      console.error('Error populating database:', error);
      throw new HttpException(
        'Failed to populate database',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('stats')
  async getQuestionStats(
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
  ) {
    try {
      const stats = await this.enhancedTriviaService.getQuestionStats(category, difficulty);
      
      return {
        success: true,
        data: {
          stats,
          filters: { category, difficulty }
        }
      };
    } catch (error) {
      console.error('Error getting question stats:', error);
      throw new HttpException(
        'Failed to get question statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('database-status')
  async getDatabaseStatus() {
    try {
      const stats = await this.triviaPopulator.getDatabaseStats();
      const totalQuestions = await this.enhancedTriviaService.getTotalQuestionCount();
      
      return {
        success: true,
        data: {
          totalQuestions,
          categoryStats: stats,
          status: totalQuestions > 0 ? 'POPULATED' : 'EMPTY'
        }
      };
    } catch (error) {
      console.error('Error getting database status:', error);
      throw new HttpException(
        'Failed to get database status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('categories')
  getCategories() {
    return {
      success: true,
      data: [
        { value: 'general', label: 'General Knowledge', icon: '🌍' },
        { value: 'science', label: 'Science & Nature', icon: '🔬' },
        { value: 'history', label: 'History', icon: '📜' },
        { value: 'geography', label: 'Geography', icon: '🗺️' },
        { value: 'entertainment', label: 'Entertainment: Film', icon: '🎬' },
        { value: 'sports', label: 'Sports', icon: '⚽' },
        { value: 'technology', label: 'Computers & Technology', icon: '💻' },
        { value: 'literature', label: 'Books & Literature', icon: '📚' },
        { value: 'music', label: 'Music', icon: '🎵' },
        { value: 'art', label: 'Art', icon: '🎨' },
        { value: 'politics', label: 'Politics', icon: '🏛️' },
        { value: 'nature', label: 'Nature & Animals', icon: '🌿' },
        { value: 'movies', label: 'Movies & TV', icon: '🎭' },
        { value: 'mythology', label: 'Mythology', icon: '🐉' },
        { value: 'food', label: 'Food & Cooking', icon: '🍳' },
      ]
    };
  }

  @Get('clear-cache')
  clearCache() {
    this.triviaService.clearCache();
    return {
      success: true,
      message: 'Question cache cleared successfully'
    };
  }
}