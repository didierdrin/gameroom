// trivia.service.ts
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

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
export class TriviaService {
  private readonly OPENTDB_API = 'https://opentdb.com/api.php';
  private questionCache: Map<string, Question[]> = new Map();

  // OpenTDB Category Mappings
  private readonly CATEGORY_MAP: Record<string, number> = {
    general: 9,          // General Knowledge
    science: 17,         // Science & Nature
    history: 23,         // History
    geography: 22,       // Geography
    entertainment: 11,   // Entertainment: Film
    sports: 21,          // Sports
    technology: 18,      // Science: Computers
    literature: 10,      // Entertainment: Books
    music: 12,           // Entertainment: Music
    art: 25,             // Art
    politics: 24,        // Politics
    nature: 17,          // Science & Nature (same as science)
    movies: 11,          // Entertainment: Film (same as entertainment)
    food: 9,             // General Knowledge (OpenTDB doesn't have food category)
    mythology: 20,       // Mythology
  };

  async getQuestions(settings?: TriviaSettings): Promise<Question[]> {
    try {
      if (!settings) {
        throw new Error('Trivia settings are required to generate questions.');
      }

      return await this.fetchQuestionsFromOpenTDB(settings);
    } catch (error) {
      console.error('Error getting questions:', error);
      throw error;
    }
  }

  private async fetchQuestionsFromOpenTDB(settings: TriviaSettings): Promise<Question[]> {
    const { questionCount, difficulty, category } = settings;

    // Check cache first
    const cacheKey = `${category}_${difficulty}_${questionCount}`;
    if (this.questionCache.has(cacheKey)) {
      const cached = this.questionCache.get(cacheKey);
      if (cached && cached.length >= questionCount) {
        console.log(`Using cached questions for ${category}: ${cached.length} questions`);
        return this.shuffleArray(cached).slice(0, questionCount);
      }
    }

    try {
      // Get OpenTDB category ID
      const categoryId = this.CATEGORY_MAP[category.toLowerCase()] || 9;

      // Build API parameters
      const params: any = {
        amount: questionCount,
        category: categoryId,
        type: 'multiple',
        encode: 'url3986', // URL encoding
      };

      // Add difficulty if not 'any'
      if (difficulty && difficulty !== 'any') {
        params.difficulty = difficulty.toLowerCase();
      }

      console.log(`Fetching ${questionCount} questions from OpenTDB for category: ${category} (ID: ${categoryId})`);

      const response = await axios.get(this.OPENTDB_API, {
        params,
        timeout: 10000,
      });

      if (response.data.response_code !== 0) {
        throw new Error(`OpenTDB API error: ${this.getErrorMessage(response.data.response_code)}`);
      }

      if (!response.data.results || response.data.results.length === 0) {
        throw new Error('No questions returned from OpenTDB');
      }

      // Transform questions to our format
      const questions: Question[] = response.data.results.map((q: any) => {
        const correctAnswer = this.decodeURIComponent(q.correct_answer);
        const incorrectAnswers = q.incorrect_answers.map((a: string) => this.decodeURIComponent(a));
        
        // Shuffle all options
        const allOptions = this.shuffleArray([correctAnswer, ...incorrectAnswers]);

        return {
          id: crypto.randomUUID(),
          text: this.decodeURIComponent(q.question),
          options: allOptions,
          correctAnswer: correctAnswer,
          difficulty: q.difficulty,
          category: this.decodeURIComponent(q.category),
        };
      });

      // Cache the questions
      this.questionCache.set(cacheKey, questions);
      
      // Set cache expiration (30 minutes)
      setTimeout(() => {
        this.questionCache.delete(cacheKey);
      }, 30 * 60 * 1000);

      console.log(`Successfully fetched ${questions.length} questions for category: ${category}`);
      return questions;

    } catch (error) {
      console.error('Error fetching from OpenTDB:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. Please try again.');
        }
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
      }
      
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }
  }

  private getErrorMessage(responseCode: number): string {
    const errorMessages: Record<number, string> = {
      1: 'Not enough questions available for the selected criteria',
      2: 'Invalid parameter in request',
      3: 'Session token not found',
      4: 'Session token has returned all possible questions',
    };
    return errorMessages[responseCode] || 'Unknown error';
  }

  private decodeURIComponent(text: string): string {
    try {
      // Decode URL encoding
      let decoded = decodeURIComponent(text);
      
      // Decode HTML entities
      decoded = decoded
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .replace(/&rdquo;/g, '"')
        .replace(/&ldquo;/g, '"')
        .replace(/&hellip;/g, '...')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–');
      
      return decoded;
    } catch (error) {
      console.error('Error decoding text:', error);
      return text;
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  // Method to clear cache
  clearCache(): void {
    this.questionCache.clear();
  }

  // Method to remove specific cached questions
  removeCachedQuestions(category: string, difficulty: string, count: number): void {
    const cacheKey = `${category}_${difficulty}_${count}`;
    this.questionCache.delete(cacheKey);
  }
}