import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface TriviaQuestion {
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  category: string;
  difficulty: string;
}

@Injectable()
export class TriviaService {
  private readonly generativeAI: GoogleGenerativeAI;
  private readonly modelName = 'models/gemini-2.0-flash-exp'; 
  private questionCache = new Map<string, { questions: TriviaQuestion[], timestamp: number }>();

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.generativeAI = new GoogleGenerativeAI(apiKey);
  }

  async getQuestions(questionCount: number, difficulty: string, category: string): Promise<TriviaQuestion[]> {
    try {
      return await this.getCachedOrGenerateQuestions(questionCount, difficulty, category);
    } catch (error) {
      console.error('Error generating questions with Gemini:', error);
      return await this.getCachedOrGenerateQuestions(questionCount, difficulty, category);
    }
  }

  private async getCachedOrGenerateQuestions(questionCount: number, difficulty: string, category: string): Promise<TriviaQuestion[]> {
    const cacheKey = `${category}:${difficulty}:${questionCount}`;
    const cached = this.questionCache.get(cacheKey);
    
    // Cache valid for 1 hour
    if (cached && Date.now() - cached.timestamp < 3600000) {
      console.log(`Using cached questions for ${cacheKey}`);
      return cached.questions;
    }
    
    const questions = await this.generateQuestionsWithGemini(questionCount, difficulty, category);
    this.questionCache.set(cacheKey, { questions, timestamp: Date.now() });
    
    return questions;
  }

  private async generateQuestionsWithGemini(questionCount: number, difficulty: string, category: string): Promise<TriviaQuestion[]> {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Generating ${questionCount} questions for category: ${category}, difficulty: ${difficulty}, attempt: ${attempts + 1}`);
        
        const model = this.generativeAI.getGenerativeModel({ 
          model: this.modelName,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        });

        const prompt = this.buildPrompt(questionCount, difficulty, category);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('Raw response from Gemini:', text);

        const questions = this.parseQuestionsFromResponse(text, category, difficulty);
        
        // REMOVED RELEVANCE FILTERING - Accept all generated questions
        console.log(`Generated ${questions.length} questions for category ${category}`);
        
        if (questions.length >= questionCount) {
          return questions.slice(0, questionCount);
        }

        // If we didn't get enough questions, try again
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Only got ${questions.length} questions, retrying...`);
          await this.delay(1000);
        } else {
          console.log(`Returning ${questions.length} questions (less than requested ${questionCount})`);
          return questions;
        }

      } catch (error) {
        attempts++;
        
        if (error.status === 429) {
          // Rate limit hit - use exponential backoff
          const retryDelay = this.extractRetryDelay(error) || Math.min(1000 * Math.pow(2, attempts), 30000);
          console.log(`Rate limit hit, retrying in ${retryDelay}ms... (attempt ${attempts}/${maxAttempts})`);
          await this.delay(retryDelay);
        } else {
          console.error('Error generating questions:', error);
          if (attempts >= maxAttempts) {
            throw error;
          }
          await this.delay(1000);
        }
      }
    }
    
    throw new Error(`Failed to generate questions after ${maxAttempts} attempts`);
  }

  private buildPrompt(questionCount: number, difficulty: string, category: string): string {
    return `
Generate exactly ${questionCount} trivia questions about ${category} with ${difficulty} difficulty.

IMPORTANT FORMAT REQUIREMENTS:
- Return ONLY a JSON array of question objects
- Each question object must have this exact structure:
  {
    "question": "The question text?",
    "correctAnswer": "The correct answer",
    "incorrectAnswers": ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"]
  }

CRITICAL RULES:
1. All questions must be about ${category}
2. Difficulty level: ${difficulty}
3. Generate exactly ${questionCount} questions
4. Return ONLY valid JSON, no other text
5. Each question must have exactly 3 incorrect answers
6. Questions should be diverse and cover different aspects of ${category}

Example format:
[
  {
    "question": "What is the main ingredient in traditional pesto sauce?",
    "correctAnswer": "Basil",
    "incorrectAnswers": ["Parsley", "Cilantro", "Mint"]
  },
  {
    "question": "Which country is known for inventing sushi?",
    "correctAnswer": "Japan",
    "incorrectAnswers": ["China", "Thailand", "Korea"]
  }
]

Now generate ${questionCount} ${difficulty} questions about ${category}:
`;
  }

  private parseQuestionsFromResponse(responseText: string, category: string, difficulty: string): TriviaQuestion[] {
    try {
      // Clean the response text - remove markdown code blocks if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.substring(7);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      }
      cleanedText = cleanedText.trim();

      const questionsData = JSON.parse(cleanedText);
      
      if (!Array.isArray(questionsData)) {
        throw new Error('Response is not an array');
      }

      return questionsData.map((q, index) => ({
        question: q.question,
        correctAnswer: q.correctAnswer,
        incorrectAnswers: Array.isArray(q.incorrectAnswers) ? q.incorrectAnswers : [],
        category: category,
        difficulty: difficulty
      }));

    } catch (error) {
      console.error('Error parsing questions from response:', error);
      console.error('Response text was:', responseText);
      return [];
    }
  }

  private extractRetryDelay(error: any): number {
    try {
      const retryInfo = error.errorDetails?.find(detail => 
        detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
      );
      if (retryInfo?.retryDelay) {
        return parseInt(retryInfo.retryDelay) * 1000; // Convert to milliseconds
      }
    } catch {
      // Fall through to default delay
    }
    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  

  // Method to clear cache if needed
  clearCache(): void {
    this.questionCache.clear();
    console.log('Question cache cleared');
  }

  // Method to get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.questionCache.size,
      keys: Array.from(this.questionCache.keys())
    };
  }
}

// // trivia.service.ts
// import { Injectable } from '@nestjs/common';
// import { GoogleGenerativeAI } from '@google/generative-ai';
// import axios from 'axios';
// import * as crypto from 'crypto';

// export interface Question {
//   id: string;
//   text: string;
//   options: string[];
//   correctAnswer: string;
//   difficulty?: string;
//   category?: string;
// }

// export interface TriviaSettings {
//   questionCount: number;
//   difficulty: string;
//   category: string;
// }

// interface GeminiQuestion {
//   question: string;
//   options: string[];
//   correctAnswer: string;
//   explanation: string;
// }

// @Injectable()
// export class TriviaService {
//   private genAI: GoogleGenerativeAI;
//   private model: any;
//   private questionCache: Map<string, Question[]> = new Map();
  
//   // Category mappings for diverse subtopics
//   private readonly CATEGORY_SUBTOPICS = {
//     general: [
//       'World Facts', 'Famous People', 'Inventions', 'Languages', 'Holidays',
//       'Traditions', 'Currencies', 'Transportation', 'Communication', 'Education'
//     ],
//     science: [
//       'Physics', 'Chemistry', 'Biology', 'Astronomy', 'Earth Science',
//       'Environmental Science', 'Medicine', 'Technology', 'Mathematics', 'Ecology'
//     ],
//     history: [
//       'Ancient Civilizations', 'Middle Ages', 'Renaissance', 'Modern History',
//       'World Wars', 'Cold War', 'Ancient Egypt', 'Roman Empire', 'Asian History'
//     ],
//     geography: [
//       'Physical Geography', 'Human Geography', 'Climate', 'Natural Resources',
//       'Countries and Capitals', 'Landforms', 'Oceans', 'Cultural Geography'
//     ],
//     entertainment: [
//       'Movies', 'Television', 'Music', 'Theater', 'Video Games',
//       'Books', 'Comics', 'Celebrities', 'Pop Culture', 'Awards'
//     ],
//     sports: [
//       'Football', 'Basketball', 'Baseball', 'Soccer', 'Tennis',
//       'Olympics', 'Racing', 'Combat Sports', 'Winter Sports', 'Athletics'
//     ],
//     technology: [
//       'Computer Science', 'Internet', 'Mobile Technology', 'AI and Robotics',
//       'Social Media', 'Gaming', 'Cybersecurity', 'Innovation', 'Space Technology'
//     ],
//     literature: [
//       'Classic Literature', 'Modern Fiction', 'Poetry', 'Drama', 'Non-fiction',
//       'Children\'s Literature', 'Science Fiction', 'Fantasy', 'Mystery', 'Biography'
//     ],
//     music: [
//       'Classical Music', 'Rock', 'Pop', 'Jazz', 'Country',
//       'Hip Hop', 'Electronic', 'World Music', 'Music Theory', 'Musical Instruments'
//     ],
//     art: [
//       'Painting', 'Sculpture', 'Architecture', 'Photography', 'Modern Art',
//       'Renaissance Art', 'Digital Art', 'Art History', 'Famous Artists', 'Art Movements'
//     ],
//     politics: [
//       'World Politics', 'Elections', 'Political Systems', 'International Relations',
//       'Political History', 'Current Affairs', 'Political Theory', 'Leaders', 'Diplomacy'
//     ],
//     nature: [
//       'Animals', 'Plants', 'Ecosystems', 'Conservation', 'Marine Life',
//       'Birds', 'Insects', 'Forests', 'Weather', 'Natural Phenomena'
//     ],
//     movies: [
//       'Action Movies', 'Comedy', 'Drama', 'Science Fiction Films', 'Horror',
//       'Animated Films', 'Documentaries', 'Film Directors', 'Film History', 'TV Series'
//     ],
//     food: [
//       'Cuisine Types', 'Cooking Techniques', 'Food History', 'Ingredients',
//       'Famous Chefs', 'Restaurants', 'Nutrition', 'Beverages', 'Desserts', 'Food Culture'
//     ],
//     mythology: [
//       'Greek Mythology', 'Roman Mythology', 'Norse Mythology', 'Egyptian Mythology',
//       'Asian Mythology', 'Celtic Mythology', 'Native American Mythology', 'Folklore', 'Legends'
//     ]
//   };

//   constructor() {
    
//     const apiKey = process.env.GEMINI_API_KEY;
//     if (!apiKey) {
//       console.warn('GEMINI_API_KEY not found.');
//     } else {
//       this.genAI = new GoogleGenerativeAI(apiKey);
//       this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); 
//     }
//   }

//   async getQuestions(settings?: TriviaSettings): Promise<Question[]> {
//     try {
//       // Use Gemini AI only - throw error if not available
//       if (!this.model) {
//         throw new Error('Gemini AI model not available. Please check GEMINI_API_KEY.');
//       }
      
//       if (!settings) {
//         throw new Error('Trivia settings are required to generate questions.');
//       }
      
//       return await this.generateQuestionsWithGemini(settings);
//     } catch (error) {
//       console.error('Error getting questions:', error);
//       // Re-throw the error since you don't want fallbacks
//       throw error;
//     }
//   }

  
//   // In trivia.service.ts
// private async generateQuestionsWithGemini(settings: TriviaSettings): Promise<Question[]> {
//   const { questionCount, difficulty, category } = settings;
  
//   // Check cache first - use a more specific cache key
//   const cacheKey = `${category}_${difficulty}_${questionCount}_${Date.now()}`; // Add timestamp for variety
//   if (this.questionCache.has(cacheKey)) {
//     const cached = this.questionCache.get(cacheKey);
//     if (cached && cached.length >= questionCount) {
//       const shuffled = this.shuffleArray(cached).slice(0, questionCount);
//       console.log(`Using cached questions for ${category}: ${shuffled.length} questions`);
//       return shuffled;
//     }
//   }

//   const questions: Question[] = [];
//   const usedSubtopics = new Set<string>();
//   const previousQuestions = new Set<string>();
  
//   // Get subtopics for the category
//   const subtopics = this.CATEGORY_SUBTOPICS[category] || this.CATEGORY_SUBTOPICS.general;

//   for (let i = 0; i < questionCount; i++) {
//     try {
//       // Select a subtopic
//       let availableSubtopics = subtopics.filter(st => !usedSubtopics.has(st));
//       if (availableSubtopics.length === 0) {
//         usedSubtopics.clear();
//         availableSubtopics = subtopics;
//       }
//       const subtopic = availableSubtopics[Math.floor(Math.random() * availableSubtopics.length)];
//       usedSubtopics.add(subtopic);

//       // Generate prompt with strict category enforcement
//       const prompt = this.generatePrompt(category, subtopic, difficulty, Array.from(previousQuestions));
      
//       // Call Gemini AI
//       const result = await this.model.generateContent(prompt);
//       const response = await result.response;
//       let text = response.text();
      
//       // Clean and parse response
//       text = text.replace(/```json\s*/g, '').replace(/\s*```/g, '').trim();
//       const questionData: GeminiQuestion = JSON.parse(text);
      
//       // Validate question belongs to the requested category
//       const questionText = questionData.question.toLowerCase();
//       const categoryKeywords = this.getCategoryKeywords(category);
//       const isCategoryRelevant = categoryKeywords.some(keyword => 
//         questionText.includes(keyword)
//       );
      
//       if (!isCategoryRelevant) {
//         console.warn(`Question rejected - not relevant to category ${category}: ${questionText}`);
//         i--; // Retry this iteration
//         continue;
//       }
      
//       // Create question object
//       const question: Question = {
//         id: crypto.randomUUID(),
//         text: questionData.question,
//         options: this.shuffleArray([...questionData.options]),
//         correctAnswer: questionData.options[0], // First option is always correct in Gemini response
//         difficulty: difficulty,
//         category: `${this.capitalizeFirst(category)} - ${subtopic}`
//       };
      
//       questions.push(question);
//       previousQuestions.add(questionData.question);
      
//       // Add small delay to avoid rate limiting
//       if (i < questionCount - 1) {
//         await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay for better quality
//       }
//     } catch (error) {
//       console.error(`Error generating question ${i + 1}:`, error);
//       // Continue to next question or use fallback
//     }
//   }

//   // If we couldn't generate enough questions, don't supplement with OpenTDB
//   if (questions.length < questionCount) {
//     const remaining = questionCount - questions.length;
//     console.log(`Generating ${remaining} fallback questions for ${category}`);
    
//   }

//   // Cache the questions with a shorter TTL for variety between games
//   this.questionCache.set(cacheKey, questions);
//   // Set cache expiration (1 hour) to ensure variety
//   setTimeout(() => {
//     this.questionCache.delete(cacheKey);
//   }, 60 * 60 * 1000);
  
//   console.log(`Generated ${questions.length} questions for category: ${category}`);
//   return questions.slice(0, questionCount);
// }

// // Add helper method for category keywords
// private getCategoryKeywords(category: string): string[] {
//   const keywordMap = {
//     science: ['science', 'scientific', 'physics', 'chemistry', 'biology', 'astronomy', 'experiment'],
//     history: ['history', 'historical', 'ancient', 'century', 'war', 'empire', 'revolution'],
//     geography: ['geography', 'country', 'city', 'capital', 'mountain', 'river', 'continent'],
//     entertainment: ['movie', 'film', 'music', 'celebrity', 'actor', 'singer', 'entertainment'],
//     sports: ['sports', 'game', 'player', 'team', 'championship', 'olympic', 'athlete'],
//     technology: ['technology', 'computer', 'software', 'internet', 'digital', 'ai', 'robot'],
//     // Add more categories as needed
//   };
  
//   return keywordMap[category] || [category];
// }



//   private generatePrompt(category: string, subtopic: string, difficulty: string, previousQuestions: string[]): string {
//     const difficultyPrompts = {
//       easy: 'Create an easy multiple-choice trivia question',
//       medium: 'Generate a moderately challenging multiple-choice trivia question',
//       hard: 'Devise a difficult multiple-choice trivia question'
//     };

//     return `
// ${difficultyPrompts[difficulty] || difficultyPrompts.medium} about ${category} focusing on ${subtopic}.
// ${previousQuestions.length > 0 ? `The question should be different from these: ${previousQuestions.slice(-3).join(', ')}` : ''}

// Format the response EXACTLY as JSON:
// {
//   "question": "The complete question text",
//   "options": [
//     "Correct answer (must be factually accurate)",
//     "Plausible wrong answer",
//     "Plausible wrong answer",
//     "Plausible wrong answer"
//   ],
//   "correctAnswer": "Exact text of the correct answer from options array",
//   "explanation": "Brief explanation of why the answer is correct"
// }

// Requirements:
// 1. The question must be clear, specific, and grammatically correct
// 2. The correct answer MUST be the FIRST option in the array
// 3. All options should be plausible and roughly the same length
// 4. No joke answers or obviously wrong options
// 5. The question should test knowledge, not just common sense
// 6. Include specific facts, dates, names, or details when appropriate
// 7. Ensure all information is factually accurate and up-to-date
// 8. Make the difficulty appropriate for the ${difficulty} level
// 9. Return ONLY valid JSON, no additional text or formatting`;
//   }

 

//   private decodeHtml(html: string): string {
//     const txt = document?.createElement?.('textarea') || { innerHTML: html };
//     txt.innerHTML = html;
//     return txt.value || html
//       .replace(/&amp;/g, '&')
//       .replace(/&lt;/g, '<')
//       .replace(/&gt;/g, '>')
//       .replace(/&quot;/g, '"')
//       .replace(/&#039;/g, "'")
//       .replace(/&rsquo;/g, "'")
//       .replace(/&lsquo;/g, "'")
//       .replace(/&rdquo;/g, '"')
//       .replace(/&ldquo;/g, '"');
//   }

//   private shuffleArray<T>(array: T[]): T[] {
//     const newArray = [...array];
//     for (let i = newArray.length - 1; i > 0; i--) {
//       const j = Math.floor(Math.random() * (i + 1));
//       [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
//     }
//     return newArray;
//   }

//   private capitalizeFirst(str: string): string {
//     return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
//   }

//   // Method to clear cache
//   clearCache(): void {
//     this.questionCache.clear();
//   }

//   // Method to remove specific cached questions
//   removeCachedQuestions(category: string, difficulty: string, count: number): void {
//     const cacheKey = `${category}_${difficulty}_${count}`;
//     this.questionCache.delete(cacheKey);
//   }
// }




// // trivia.service.ts
// import { Injectable } from '@nestjs/common';
// import axios from 'axios';

// @Injectable()
// export class TriviaService {
//   private readonly OPENTDB_API = 'https://opentdb.com/api.php';

//   async fetchTriviaQuestions(topic: string = 'general') {
//     try {
//       const categoryMap: Record<string, number> = {
//         science: 17,
//         history: 23,
//         geography: 22,
//         entertainment: 11,
//         sports: 21,
//         technology: 18,
//         art: 25,
//         politics: 24,
//       };

//       const category = categoryMap[topic.toLowerCase()] || 9;

//       const response = await axios.get(this.OPENTDB_API, {
//         params: {
//           amount: 5,
//           category,
//           type: 'multiple',
//           encode: 'url3986',
//         },
//         timeout: 5000,
//       });

//       if (!response.data.results || response.data.results.length === 0) {
//         throw new Error('No questions returned from OpenTDB');
//       }

//       const questions = response.data.results.map((q: any, index: number) => {
//         const decode = (text: string) => decodeURIComponent(text);
//         return {
//           id: `q-${index}`,
//           text: decode(q.question),
//           options: [
//             decode(q.correct_answer),
//             ...q.incorrect_answers.map((a: string) => decode(a)),
//           ].sort(() => Math.random() - 0.5),
//           correctAnswer: decode(q.correct_answer),
//           difficulty: q.difficulty,
//           category: decode(q.category),
//         };
//       });

//       return questions;
//     } catch (error) {
//       console.error('Error fetching trivia questions:', error);
//       return [
//         {
//           id: 'q1',
//           text: 'Who invented the World Wide Web?',
//           options: ['Tim Berners-Lee', 'Bill Gates', 'Steve Jobs', 'Mark Zuckerberg'],
//           correctAnswer: 0,
//         },
//         {
//           id: 'q2',
//           text: 'What is the capital of France?',
//           options: ['Paris', 'London', 'Berlin', 'Madrid'],
//           correctAnswer: 0,
//         },
//       ];
//     }
//   }
// }