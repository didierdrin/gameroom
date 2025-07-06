
import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Controller('trivia')
export class TriviaController {
  private readonly GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  private readonly API_KEY = 'AIzaSyA8usl5r7fzAA3RQ92oWF9lJMBDEDcnzCc'; // Replace with your actual key

  @Post('generate')
  async generateTrivia(@Body() body: { topic: string }) {
    try {
      const { topic } = body;

      // More robust prompt with clear JSON formatting instructions
      const prompt = `Generate 3 trivia questions about ${topic} in this exact JSON format:
      {
        "questions": [
          {
            "question": "What is the capital of France?",
            "options": ["Paris", "London", "Berlin", "Madrid"],
            "correct": "Paris",
            "difficulty": "easy"
          }
        ]
      }
      Return ONLY the JSON with no additional text or markdown.`;

      const response = await axios.post(
        `${this.GEMINI_API_URL}?key=${this.API_KEY}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      // Debug logging
      console.log('Gemini raw response:', response.data);

      const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) {
        throw new Error('No response text from Gemini API');
      }

      // Clean the response
      let cleanedText = rawText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      // Parse and validate
      const result = JSON.parse(cleanedText);
      
      if (!result.questions || !Array.isArray(result.questions)) {
        throw new Error('Invalid question format from API');
      }

      // Transform to expected format
      const questions = result.questions.map((q: any, i: number) => ({
        id: `q-${i}`,
        question: q.question,
        options: q.options,
        correct: q.correct || q.options[0] // Default to first option if correct not specified
      }));

      return { questions };

    } catch (error) {
      console.error('Trivia generation error:', error);
      throw new HttpException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Failed to generate trivia',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}


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

