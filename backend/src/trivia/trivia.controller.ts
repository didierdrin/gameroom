import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Controller('trivia')
export class TriviaController {
  @Post('generate')
  async generateTrivia(@Body() body: { topic: string }) {
    try {
      const { topic } = body;

      // More specific prompt to get consistent JSON output
      const prompt = `Provide 3 trivia questions about ${topic} in this exact JSON format:
      {
        "questions": [
          {
            "id": "unique-id-1",
            "question": "Question text",
            "options": ["Option1", "Option2", "Option3", "Option4"],
            "correct": "CorrectOption"
          }
        ]
      }
      Return ONLY the JSON, no other text or markdown.`;

      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyA8usl5r7fzAA3RQ92oWF9lJMBDEDcnzCc',
        {
          contents: { parts: [{ text: prompt }] }
        }
      );

      const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      // Clean the response (remove markdown code blocks if present)
      const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Parse the JSON
      const result = JSON.parse(cleanedText);
      
      // Validate the structure
      if (!result.questions || !Array.isArray(result.questions)) {
        throw new Error('Invalid question format from API');
      }

      return result; // This now matches { questions: [...] }
      
    } catch (error) {
      console.error('Trivia generation error:', error);
      throw new HttpException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Failed to generate trivia',
        details: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}


// // src/trivia/trivia.controller.ts

// import { Controller, Post, Body } from '@nestjs/common';
// import axios from 'axios';

// @Controller('trivia')
// export class TriviaController {
//     @Post('generate')
//     async generateTrivia(@Body() body: { topic: string }) {
//       try {
//         const { topic } = body;
    
//         const response = await axios.post(
//           'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyA8usl5r7fzAA3RQ92oWF9lJMBDEDcnzCc',
//           {
//             contents: [
//               {
//                 parts: [
//                   { 
//                     text: `Generate 3 multiple-choice trivia questions about ${topic} in JSON format like this:
//                     [
//                       {
//                         "question": "Question text here",
//                         "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
//                         "correct": "Correct option here"
//                       }
//                     ]
//                     Return only the JSON array, nothing else.`
//                   }
//                 ]
//               }
//             ]
//           }
//         );
    
//         const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        
//         // Parse the JSON response
//         let questions = [];
//         try {
//           questions = JSON.parse(rawText);
//           if (!Array.isArray(questions)) {
//             throw new Error('Invalid response format');
//           }
//         } catch (e) {
//           console.error('Failed to parse trivia questions:', e);
//           throw new Error('Failed to generate trivia questions');
//         }
    
//         return { questions };
//       } catch (error) {
//         console.error('Trivia generation error:', error);
//         // throw new HttpException('Failed to generate trivia', HttpStatus.INTERNAL_SERVER_ERROR);

//       }
//     }
// }
