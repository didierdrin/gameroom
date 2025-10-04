// trivia.controller.ts
import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { TriviaService, Question, TriviaSettings } from './trivia.service';

interface TriviaSettings {
  questionCount: number;
  difficulty: string;
  category: string;
}

@Controller('trivia')
export class TriviaController {
  constructor(private readonly triviaService: TriviaService) {}

  @Get('questions')
  async getQuestions( 
    @Query('count') count?: string,
    @Query('difficulty') difficulty?: string,
    @Query('category') category?: string,
  ): Promise<{ success: true; data: { questions: Question[]; settings: TriviaSettings } }> {
    try {
      // Parse and validate parameters
      const questionCount = count ? parseInt(count, 10) : 10;
      
      // Validate question count
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

      // Validate category
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
      
      return {
        success: true,
        data: {
          questions,
          settings: {
            count: questionCount,
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
        'Failed to fetch trivia questions. Please try again.',
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
        { value: 'science', label: 'Science', icon: '🔬' },
        { value: 'history', label: 'History', icon: '📜' },
        { value: 'geography', label: 'Geography', icon: '🗺️' },
        { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
        { value: 'sports', label: 'Sports', icon: '⚽' },
        { value: 'technology', label: 'Technology', icon: '💻' },
        { value: 'literature', label: 'Literature', icon: '📚' },
        { value: 'music', label: 'Music', icon: '🎵' },
        { value: 'art', label: 'Art & Design', icon: '🎨' },
        { value: 'politics', label: 'Politics', icon: '🏛️' },
        { value: 'nature', label: 'Nature & Animals', icon: '🌿' },
        { value: 'movies', label: 'Movies & TV', icon: '🎭' },
        { value: 'food', label: 'Food & Cooking', icon: '🍳' },
        { value: 'mythology', label: 'Mythology', icon: '🐉' },
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


// import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
// import axios from 'axios';

// @Controller('trivia')
// export class TriviaController {
//   private readonly OPENTDB_API = 'https://opentdb.com/api.php';

//   @Post('generate')
//   async generateTrivia(@Body() body: { topic: string }) {
//     try {
//       const { topic } = body;
      
//       // Map topics to OpenTDB categories
//       const categoryMap: Record<string, number> = {
//         'science': 17, // Science & Nature
//         'history': 23, // History
//         'geography': 22, // Geography
//         'entertainment': 11, // Film
//         'sports': 21, // Sports
//         'technology': 18, // Computers
//         'art': 25, // Art
//         'politics': 24, // Politics
//       };

//       const category = categoryMap[topic.toLowerCase()] || 9; // Default: General Knowledge

//       const response = await axios.get(this.OPENTDB_API, {
//         params: {
//           amount: 5, // Number of questions
//           category,
//           type: 'multiple', // Multiple choice questions
//           encode: 'url3986'
//         },
//         timeout: 5000
//       });

//       if (!response.data.results || response.data.results.length === 0) {
//         throw new Error('No questions returned from OpenTDB');
//       }

//       // Transform to our expected format
//       const questions = response.data.results.map((q: any, index: number) => {
//         // Decode URL-encoded content
//         const decode = (text: string) => decodeURIComponent(text);
        
//         return {
//           id: `q-${index}`,
//           question: decode(q.question),
//           options: [
//             decode(q.correct_answer),
//             ...q.incorrect_answers.map((a: string) => decode(a))
//           ].sort(() => Math.random() - 0.5), // Shuffle options
//           correct: decode(q.correct_answer),
//           difficulty: q.difficulty,
//           category: decode(q.category)
//         };
//       });

//       return { questions };

//     } catch (error) {
//       console.error('Trivia generation error:', error);
//       throw new HttpException({
//         status: HttpStatus.INTERNAL_SERVER_ERROR,
//         error: 'Failed to generate trivia questions',
//         details: error.message,
//         source: 'OpenTriviaDB'
//       }, HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }
// }



