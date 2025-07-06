// src/trivia/trivia.controller.ts

import { Controller, Post, Body } from '@nestjs/common';
import axios from 'axios';

@Controller('trivia')
export class TriviaController {
  @Post('generate')
  async generateTrivia(@Body() body: { topic: string }) {
    const { topic } = body;

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyA8usl5r7fzAA3RQ92oWF9lJMBDEDcnzCc',
      {
        contents: [
          {
            parts: [
              { text: `Generate 3 multiple-choice trivia questions about ${topic}. Include 1 correct answer and 3 wrong options.` }
            ]
          }
        ]
      }
    );

    const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    return { trivia: rawText || 'No trivia generated.' };
  }
}
