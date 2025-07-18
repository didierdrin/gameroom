
import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Controller('trivia')
export class TriviaController {
  private readonly OPENTDB_API = 'https://opentdb.com/api.php';

  @Post('generate')
  async generateTrivia(@Body() body: { topic: string }) {
    try {
      const { topic } = body;
      
      // Map topics to OpenTDB categories
      const categoryMap: Record<string, number> = {
        'science': 17, // Science & Nature
        'history': 23, // History
        'geography': 22, // Geography
        'entertainment': 11, // Film
        'sports': 21, // Sports
        'technology': 18, // Computers
        'art': 25, // Art
        'politics': 24, // Politics
      };

      const category = categoryMap[topic.toLowerCase()] || 9; // Default: General Knowledge

      const response = await axios.get(this.OPENTDB_API, {
        params: {
          amount: 5, // Number of questions
          category,
          type: 'multiple', // Multiple choice questions
          encode: 'url3986'
        },
        timeout: 5000
      });

      if (!response.data.results || response.data.results.length === 0) {
        throw new Error('No questions returned from OpenTDB');
      }

      // Transform to our expected format
      const questions = response.data.results.map((q: any, index: number) => {
        // Decode URL-encoded content
        const decode = (text: string) => decodeURIComponent(text);
        
        return {
          id: `q-${index}`,
          question: decode(q.question),
          options: [
            decode(q.correct_answer),
            ...q.incorrect_answers.map((a: string) => decode(a))
          ].sort(() => Math.random() - 0.5), // Shuffle options
          correct: decode(q.correct_answer),
          difficulty: q.difficulty,
          category: decode(q.category)
        };
      });

      return { questions };

    } catch (error) {
      console.error('Trivia generation error:', error);
      throw new HttpException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Failed to generate trivia questions',
        details: error.message,
        source: 'OpenTriviaDB'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}



