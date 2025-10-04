// trivia.service.ts
import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

interface GeminiQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

@Injectable()
export class TriviaService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private questionCache: Map<string, Question[]> = new Map();
  
  // Category mappings for diverse subtopics
  private readonly CATEGORY_SUBTOPICS = {
    general: [
      'World Facts', 'Famous People', 'Inventions', 'Languages', 'Holidays',
      'Traditions', 'Currencies', 'Transportation', 'Communication', 'Education'
    ],
    science: [
      'Physics', 'Chemistry', 'Biology', 'Astronomy', 'Earth Science',
      'Environmental Science', 'Medicine', 'Technology', 'Mathematics', 'Ecology'
    ],
    history: [
      'Ancient Civilizations', 'Middle Ages', 'Renaissance', 'Modern History',
      'World Wars', 'Cold War', 'Ancient Egypt', 'Roman Empire', 'Asian History'
    ],
    geography: [
      'Physical Geography', 'Human Geography', 'Climate', 'Natural Resources',
      'Countries and Capitals', 'Landforms', 'Oceans', 'Cultural Geography'
    ],
    entertainment: [
      'Movies', 'Television', 'Music', 'Theater', 'Video Games',
      'Books', 'Comics', 'Celebrities', 'Pop Culture', 'Awards'
    ],
    sports: [
      'Football', 'Basketball', 'Baseball', 'Soccer', 'Tennis',
      'Olympics', 'Racing', 'Combat Sports', 'Winter Sports', 'Athletics'
    ],
    technology: [
      'Computer Science', 'Internet', 'Mobile Technology', 'AI and Robotics',
      'Social Media', 'Gaming', 'Cybersecurity', 'Innovation', 'Space Technology'
    ],
    literature: [
      'Classic Literature', 'Modern Fiction', 'Poetry', 'Drama', 'Non-fiction',
      'Children\'s Literature', 'Science Fiction', 'Fantasy', 'Mystery', 'Biography'
    ],
    music: [
      'Classical Music', 'Rock', 'Pop', 'Jazz', 'Country',
      'Hip Hop', 'Electronic', 'World Music', 'Music Theory', 'Musical Instruments'
    ],
    art: [
      'Painting', 'Sculpture', 'Architecture', 'Photography', 'Modern Art',
      'Renaissance Art', 'Digital Art', 'Art History', 'Famous Artists', 'Art Movements'
    ],
    politics: [
      'World Politics', 'Elections', 'Political Systems', 'International Relations',
      'Political History', 'Current Affairs', 'Political Theory', 'Leaders', 'Diplomacy'
    ],
    nature: [
      'Animals', 'Plants', 'Ecosystems', 'Conservation', 'Marine Life',
      'Birds', 'Insects', 'Forests', 'Weather', 'Natural Phenomena'
    ],
    movies: [
      'Action Movies', 'Comedy', 'Drama', 'Science Fiction Films', 'Horror',
      'Animated Films', 'Documentaries', 'Film Directors', 'Film History', 'TV Series'
    ],
    food: [
      'Cuisine Types', 'Cooking Techniques', 'Food History', 'Ingredients',
      'Famous Chefs', 'Restaurants', 'Nutrition', 'Beverages', 'Desserts', 'Food Culture'
    ],
    mythology: [
      'Greek Mythology', 'Roman Mythology', 'Norse Mythology', 'Egyptian Mythology',
      'Asian Mythology', 'Celtic Mythology', 'Native American Mythology', 'Folklore', 'Legends'
    ]
  };

  constructor() {
    // Initialize Gemini AI - You'll need to set GEMINI_API_KEY in your environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not found. Falling back to OpenTDB API.');
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
  }

  async getQuestions(settings?: TriviaSettings): Promise<Question[]> {
    try {
      // Use Gemini AI if available, otherwise fallback to OpenTDB
      if (this.model && settings) {
        return await this.generateQuestionsWithGemini(settings);
      } else {
        return await this.fetchQuestionsFromOpenTDB(settings?.questionCount || 10);
      }
    } catch (error) {
      console.error('Error getting questions:', error);
      // Fallback to OpenTDB if Gemini fails
      return await this.fetchQuestionsFromOpenTDB(settings?.questionCount || 10);
    }
  }

  
  // In trivia.service.ts - Update the generateQuestionsWithGemini method
private async generateQuestionsWithGemini(settings: TriviaSettings): Promise<Question[]> {
  const { questionCount, difficulty, category } = settings;
  
  // Check cache first - use a more specific cache key
  const cacheKey = `${category}_${difficulty}_${questionCount}_${Date.now()}`; // Add timestamp for variety
  if (this.questionCache.has(cacheKey)) {
    const cached = this.questionCache.get(cacheKey);
    if (cached && cached.length >= questionCount) {
      const shuffled = this.shuffleArray(cached).slice(0, questionCount);
      console.log(`Using cached questions for ${category}: ${shuffled.length} questions`);
      return shuffled;
    }
  }

  const questions: Question[] = [];
  const usedSubtopics = new Set<string>();
  const previousQuestions = new Set<string>();
  
  // Get subtopics for the category
  const subtopics = this.CATEGORY_SUBTOPICS[category] || this.CATEGORY_SUBTOPICS.general;

  for (let i = 0; i < questionCount; i++) {
    try {
      // Select a subtopic
      let availableSubtopics = subtopics.filter(st => !usedSubtopics.has(st));
      if (availableSubtopics.length === 0) {
        usedSubtopics.clear();
        availableSubtopics = subtopics;
      }
      const subtopic = availableSubtopics[Math.floor(Math.random() * availableSubtopics.length)];
      usedSubtopics.add(subtopic);

      // Generate prompt with strict category enforcement
      const prompt = this.generatePrompt(category, subtopic, difficulty, Array.from(previousQuestions));
      
      // Call Gemini AI
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Clean and parse response
      text = text.replace(/```json\s*/g, '').replace(/\s*```/g, '').trim();
      const questionData: GeminiQuestion = JSON.parse(text);
      
      // Validate question belongs to the requested category
      const questionText = questionData.question.toLowerCase();
      const categoryKeywords = this.getCategoryKeywords(category);
      const isCategoryRelevant = categoryKeywords.some(keyword => 
        questionText.includes(keyword)
      );
      
      if (!isCategoryRelevant) {
        console.warn(`Question rejected - not relevant to category ${category}: ${questionText}`);
        i--; // Retry this iteration
        continue;
      }
      
      // Create question object
      const question: Question = {
        id: crypto.randomUUID(),
        text: questionData.question,
        options: this.shuffleArray([...questionData.options]),
        correctAnswer: questionData.options[0], // First option is always correct in Gemini response
        difficulty: difficulty,
        category: `${this.capitalizeFirst(category)} - ${subtopic}`
      };
      
      questions.push(question);
      previousQuestions.add(questionData.question);
      
      // Add small delay to avoid rate limiting
      if (i < questionCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay for better quality
      }
    } catch (error) {
      console.error(`Error generating question ${i + 1}:`, error);
      // Continue to next question or use fallback
    }
  }

  // If we couldn't generate enough questions, supplement with OpenTDB
  if (questions.length < questionCount) {
    const remaining = questionCount - questions.length;
    console.log(`Generating ${remaining} fallback questions for ${category}`);
    const fallbackQuestions = await this.fetchQuestionsFromOpenTDB(remaining, category);
    questions.push(...fallbackQuestions);
  }

  // Cache the questions with a shorter TTL for variety between games
  this.questionCache.set(cacheKey, questions);
  // Set cache expiration (1 hour) to ensure variety
  setTimeout(() => {
    this.questionCache.delete(cacheKey);
  }, 60 * 60 * 1000);
  
  console.log(`Generated ${questions.length} questions for category: ${category}`);
  return questions.slice(0, questionCount);
}

// Add helper method for category keywords
private getCategoryKeywords(category: string): string[] {
  const keywordMap = {
    science: ['science', 'scientific', 'physics', 'chemistry', 'biology', 'astronomy', 'experiment'],
    history: ['history', 'historical', 'ancient', 'century', 'war', 'empire', 'revolution'],
    geography: ['geography', 'country', 'city', 'capital', 'mountain', 'river', 'continent'],
    entertainment: ['movie', 'film', 'music', 'celebrity', 'actor', 'singer', 'entertainment'],
    sports: ['sports', 'game', 'player', 'team', 'championship', 'olympic', 'athlete'],
    technology: ['technology', 'computer', 'software', 'internet', 'digital', 'ai', 'robot'],
    // Add more categories as needed
  };
  
  return keywordMap[category] || [category];
}

// Update OpenTDB fallback to support categories
private async fetchQuestionsFromOpenTDB(amount: number = 10, category?: string): Promise<Question[]> {
  try {
    let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
    
    // Map our categories to OpenTDB categories if possible
    if (category) {
      const categoryMap = {
        science: 'science',
        history: 'history',
        geography: 'geography',
        entertainment: 'entertainment',
        sports: 'sports',
        technology: 'science', // OpenTDB doesn't have pure technology category
        // Add more mappings as needed
      };
      
      const opentdbCategory = categoryMap[category];
      if (opentdbCategory) {
        url += `&category=${this.getOpenTDBCategoryId(opentdbCategory)}`;
      }
    }

    const response = await axios.get(url);
    console.log(`OpenTDB API call: ${url}, results: ${response.data.results?.length}`);

    if (response.data.results) {
      return response.data.results.map((q: any) => ({
        id: crypto.randomUUID(),
        text: this.decodeHtml(q.question),
        options: this.shuffleArray([
          ...q.incorrect_answers.map((a: string) => this.decodeHtml(a)),
          this.decodeHtml(q.correct_answer),
        ]),
        correctAnswer: this.decodeHtml(q.correct_answer),
        difficulty: q.difficulty,
        category: q.category,
      }));
    }
    return this.getFallbackQuestions(amount);
  } catch (error) {
    console.error('Error fetching from OpenTDB:', error);
    return this.getFallbackQuestions(amount);
  }
}

// Helper method for OpenTDB category IDs
private getOpenTDBCategoryId(category: string): number {
  const categoryIds = {
    science: 17,
    history: 23,
    geography: 22,
    entertainment: 11,
    sports: 21,
  };
  
  return categoryIds[category] || 9; // Default to general knowledge
}


  private generatePrompt(category: string, subtopic: string, difficulty: string, previousQuestions: string[]): string {
    const difficultyPrompts = {
      easy: 'Create an easy multiple-choice trivia question',
      medium: 'Generate a moderately challenging multiple-choice trivia question',
      hard: 'Devise a difficult multiple-choice trivia question'
    };

    return `
${difficultyPrompts[difficulty] || difficultyPrompts.medium} about ${category} focusing on ${subtopic}.
${previousQuestions.length > 0 ? `The question should be different from these: ${previousQuestions.slice(-3).join(', ')}` : ''}

Format the response EXACTLY as JSON:
{
  "question": "The complete question text",
  "options": [
    "Correct answer (must be factually accurate)",
    "Plausible wrong answer",
    "Plausible wrong answer",
    "Plausible wrong answer"
  ],
  "correctAnswer": "Exact text of the correct answer from options array",
  "explanation": "Brief explanation of why the answer is correct"
}

Requirements:
1. The question must be clear, specific, and grammatically correct
2. The correct answer MUST be the FIRST option in the array
3. All options should be plausible and roughly the same length
4. No joke answers or obviously wrong options
5. The question should test knowledge, not just common sense
6. Include specific facts, dates, names, or details when appropriate
7. Ensure all information is factually accurate and up-to-date
8. Make the difficulty appropriate for the ${difficulty} level
9. Return ONLY valid JSON, no additional text or formatting`;
  }

  // Fallback to OpenTDB API (existing implementation)
  private async fetchQuestionsFromOpenTDB(amount: number = 10): Promise<Question[]> {
    try {
      const response = await axios.get(
        `https://opentdb.com/api.php?amount=${amount}&type=multiple`
      );

      if (response.data.results) {
        return response.data.results.map((q: any) => ({
          id: crypto.randomUUID(),
          text: this.decodeHtml(q.question),
          options: this.shuffleArray([
            ...q.incorrect_answers.map((a: string) => this.decodeHtml(a)),
            this.decodeHtml(q.correct_answer),
          ]),
          correctAnswer: this.decodeHtml(q.correct_answer),
          difficulty: q.difficulty,
          category: q.category,
        }));
      }
      return this.getFallbackQuestions(amount);
    } catch (error) {
      console.error('Error fetching from OpenTDB:', error);
      return this.getFallbackQuestions(amount);
    }
  }

  private getFallbackQuestions(amount: number = 10): Question[] {
    // Fallback questions if both APIs fail
    const fallbackQuestions = [
      {
        text: 'What is the capital of France?',
        options: ['Paris', 'London', 'Berlin', 'Madrid'],
        correctAnswer: 'Paris',
        category: 'Geography',
        difficulty: 'easy'
      },
      {
        text: 'Who painted the Mona Lisa?',
        options: ['Leonardo da Vinci', 'Vincent van Gogh', 'Pablo Picasso', 'Michelangelo'],
        correctAnswer: 'Leonardo da Vinci',
        category: 'Art',
        difficulty: 'easy'
      },
      {
        text: 'What is the largest planet in our solar system?',
        options: ['Jupiter', 'Saturn', 'Neptune', 'Earth'],
        correctAnswer: 'Jupiter',
        category: 'Science',
        difficulty: 'easy'
      },
      {
        text: 'In which year did World War II end?',
        options: ['1945', '1944', '1946', '1943'],
        correctAnswer: '1945',
        category: 'History',
        difficulty: 'medium'
      },
      {
        text: 'What is the chemical symbol for gold?',
        options: ['Au', 'Ag', 'Fe', 'Cu'],
        correctAnswer: 'Au',
        category: 'Science',
        difficulty: 'medium'
      }
    ];

    return fallbackQuestions.slice(0, Math.min(amount, fallbackQuestions.length)).map(q => ({
      id: crypto.randomUUID(),
      ...q
    }));
  }

  private decodeHtml(html: string): string {
    const txt = document?.createElement?.('textarea') || { innerHTML: html };
    txt.innerHTML = html;
    return txt.value || html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"');
  }

  private shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
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