// trivia.service.ts
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TriviaService {
  private readonly OPENTDB_API = 'https://opentdb.com/api.php';

  async fetchTriviaQuestions(topic: string = 'general') {
    try {
      const categoryMap: Record<string, number> = {
        science: 17,
        history: 23,
        geography: 22,
        entertainment: 11,
        sports: 21,
        technology: 18,
        art: 25,
        politics: 24,
      };

      const category = categoryMap[topic.toLowerCase()] || 9;

      const response = await axios.get(this.OPENTDB_API, {
        params: {
          amount: 5,
          category,
          type: 'multiple',
          encode: 'url3986',
        },
        timeout: 5000,
      });

      if (!response.data.results || response.data.results.length === 0) {
        throw new Error('No questions returned from OpenTDB');
      }

      const questions = response.data.results.map((q: any, index: number) => {
        const decode = (text: string) => decodeURIComponent(text);
        return {
          id: `q-${index}`,
          text: decode(q.question),
          options: [
            decode(q.correct_answer),
            ...q.incorrect_answers.map((a: string) => decode(a)),
          ].sort(() => Math.random() - 0.5),
          correctAnswer: decode(q.correct_answer),
          difficulty: q.difficulty,
          category: decode(q.category),
        };
      });

      return questions;
    } catch (error) {
      console.error('Error fetching trivia questions:', error);
      return [
        {
          id: 'q1',
          text: 'Who invented the World Wide Web?',
          options: ['Tim Berners-Lee', 'Bill Gates', 'Steve Jobs', 'Mark Zuckerberg'],
          correctAnswer: 0,
        },
        {
          id: 'q2',
          text: 'What is the capital of France?',
          options: ['Paris', 'London', 'Berlin', 'Madrid'],
          correctAnswer: 0,
        },
      ];
    }
  }
}