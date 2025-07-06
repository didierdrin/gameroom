
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

// import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
// import axios from 'axios';

// @Controller('trivia')
// export class TriviaController {
//   private readonly GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
//   private readonly API_KEY = 'AIzaSyA8usl5r7fzAA3RQ92oWF9lJMBDEDcnzCc'; // Replace with your actual key

//   @Post('generate')
//   async generateTrivia(@Body() body: { topic: string }) {
//     try {
//       const { topic } = body;

//       // More robust prompt with clear JSON formatting instructions
//       const prompt = `Generate 3 trivia questions about ${topic} in this exact JSON format:
//       {
//         "questions": [
//           {
//             "question": "What is the capital of France?",
//             "options": ["Paris", "London", "Berlin", "Madrid"],
//             "correct": "Paris",
//             "difficulty": "easy"
//           }
//         ]
//       }
//       Return ONLY the JSON with no additional text or markdown.`;

//       const response = await axios.post(
//         `${this.GEMINI_API_URL}?key=${this.API_KEY}`,
//         {
//           contents: [{
//             parts: [{
//               text: prompt
//             }]
//           }]
//         },
//         {
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           timeout: 10000 // 10 second timeout
//         }
//       );

//       // Debug logging
//       console.log('Gemini raw response:', response.data);

//       const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      
//       if (!rawText) {
//         throw new Error('No response text from Gemini API');
//       }

//       // Clean the response
//       let cleanedText = rawText.trim();
//       if (cleanedText.startsWith('```json')) {
//         cleanedText = cleanedText.replace(/```json/g, '').replace(/```/g, '').trim();
//       }

//       // Parse and validate
//       const result = JSON.parse(cleanedText);
      
//       if (!result.questions || !Array.isArray(result.questions)) {
//         throw new Error('Invalid question format from API');
//       }

//       // Transform to expected format
//       const questions = result.questions.map((q: any, i: number) => ({
//         id: `q-${i}`,
//         question: q.question,
//         options: q.options,
//         correct: q.correct || q.options[0] // Default to first option if correct not specified
//       }));

//       return { questions };

//     } catch (error) {
//       console.error('Trivia generation error:', error);
//       throw new HttpException({
//         status: HttpStatus.INTERNAL_SERVER_ERROR,
//         error: 'Failed to generate trivia',
//         details: error.message,
//         stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//       }, HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }
// }


// import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
// import axios from 'axios';

// @Controller('trivia')
// export class TriviaController {
//   @Post('generate')
//   async generateTrivia(@Body() body: { topic: string }) {
//     try {
//       const { topic } = body;

//       // More specific prompt to get consistent JSON output
//       const prompt = `Provide 3 trivia questions about ${topic} in this exact JSON format:
//       {
//         "questions": [
//           {
//             "id": "unique-id-1",
//             "question": "Question text",
//             "options": ["Option1", "Option2", "Option3", "Option4"],
//             "correct": "CorrectOption"
//           }
//         ]
//       }
//       Return ONLY the JSON, no other text or markdown.`;

//       const response = await axios.post(
//         'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyA8usl5r7fzAA3RQ92oWF9lJMBDEDcnzCc',
//         {
//           contents: { parts: [{ text: prompt }] }
//         }
//       );

//       const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      
//       // Clean the response (remove markdown code blocks if present)
//       const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      
//       // Parse the JSON
//       const result = JSON.parse(cleanedText);
      
//       // Validate the structure
//       if (!result.questions || !Array.isArray(result.questions)) {
//         throw new Error('Invalid question format from API');
//       }

//       return result; // This now matches { questions: [...] }
      
//     } catch (error) {
//       console.error('Trivia generation error:', error);
//       throw new HttpException({
//         status: HttpStatus.INTERNAL_SERVER_ERROR,
//         error: 'Failed to generate trivia',
//         details: error.message
//       }, HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }
// }

