import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose'; 
import { TriviaService } from './trivia.service';
import { TriviaQuestion } from './schemas/trivia-question.schema';
import { TriviaPopulatorService } from './trivia-populator.service';

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
export class EnhancedTriviaService {
  constructor(
    @InjectModel(TriviaQuestion.name) private triviaQuestionModel: Model<TriviaQuestion>,    
    private readonly triviaService: TriviaService,
    private readonly triviaPopulator: TriviaPopulatorService
  ) {}

  async getUniqueQuestionsForSession(settings: TriviaSettings, sessionId: string): Promise<Question[]> {
    const { questionCount, difficulty, category } = settings;
    
    console.log(`Getting ${questionCount} questions for ${category} (${difficulty}), session: ${sessionId}`);
    
    // Get all questions for this category/difficulty, grouped by usageCount
    const allQuestions = await this.triviaQuestionModel.find({
      category,
      difficulty,
      usedInSessions: { $ne: sessionId }
    })
    .sort({ lastUsed: 1 }) // Prioritize oldest questions
    .exec();

    console.log(`Found ${allQuestions.length} existing questions in database`);

    // If not enough questions, fetch from API and store them
    if (allQuestions.length < questionCount) {
      console.log(`Only found ${allQuestions.length} unique questions, need ${questionCount}. Fetching from API...`);
      
      const apiQuestions = await this.triviaService.getQuestions({
        ...settings,
        questionCount: Math.min(30, questionCount * 2)
      });
      
      await this.storeQuestionsWithUsageCount(apiQuestions, category, difficulty);
      
      // Fetch again with the new questions
      const updatedQuestions = await this.triviaQuestionModel.find({
        category,
        difficulty,
        usedInSessions: { $ne: sessionId }
      })
      .sort({ lastUsed: 1 })
      .exec();
      
      console.log(`After API fetch, now have ${updatedQuestions.length} questions available`);
      
      return this.selectAndShuffleQuestions(updatedQuestions, questionCount, sessionId);
    }

    // If still not enough, use whatever we have (even if used in session)
    if (allQuestions.length < questionCount) {
      console.log(`Still only have ${allQuestions.length} questions. Using all available...`);
      const fallbackQuestions = await this.triviaQuestionModel.find({
        category,
        difficulty
      })
      .sort({ lastUsed: 1 })
      .limit(questionCount)
      .exec();
      
      return this.selectAndShuffleQuestions(fallbackQuestions, questionCount, sessionId);
    }

    return this.selectAndShuffleQuestions(allQuestions, questionCount, sessionId);
  }

  /**
   * Select and shuffle questions using usageCount-based algorithm
   */
  private async selectAndShuffleQuestions(
    questions: TriviaQuestion[], 
    count: number, 
    sessionId: string
  ): Promise<Question[]> {
    // Group questions by usageCount (1-30)
    const questionsByUsageCount = new Map<number, TriviaQuestion[]>();
    
    questions.forEach(q => {
      const usageCount = q.usageCount || 1;
      if (!questionsByUsageCount.has(usageCount)) {
        questionsByUsageCount.set(usageCount, []);
      }
      questionsByUsageCount.get(usageCount)!.push(q);
    });

    console.log(`Questions grouped by usageCount:`, {
      totalGroups: questionsByUsageCount.size,
      groups: Array.from(questionsByUsageCount.entries()).map(([key, val]) => ({
        usageCount: key,
        count: val.length
      }))
    });

    // Select questions: one from each usageCount group, randomly
    const selectedQuestions: TriviaQuestion[] = [];
    const usageCounts = Array.from(questionsByUsageCount.keys()).sort((a, b) => a - b);
    
    // Cycle through usageCount groups to select questions
    let currentIndex = 0;
    while (selectedQuestions.length < count && usageCounts.length > 0) {
      const usageCountKey = usageCounts[currentIndex % usageCounts.length];
      const questionsInGroup = questionsByUsageCount.get(usageCountKey)!;
      
      if (questionsInGroup.length > 0) {
        // Randomly select one question from this group
        const randomIndex = Math.floor(Math.random() * questionsInGroup.length);
        const selectedQuestion = questionsInGroup.splice(randomIndex, 1)[0];
        selectedQuestions.push(selectedQuestion);
        
        // If group is now empty, remove it
        if (questionsInGroup.length === 0) {
          questionsByUsageCount.delete(usageCountKey);
          usageCounts.splice(usageCounts.indexOf(usageCountKey), 1);
        }
      }
      
      currentIndex++;
      
      // Safety break to prevent infinite loop
      if (currentIndex > count * 100) {
        console.warn('Breaking selection loop - possible issue with question pool');
        break;
      }
    }

    // If we still don't have enough, fill with random questions from remaining pool
    if (selectedQuestions.length < count) {
      const remaining = questions.filter(q => !selectedQuestions.includes(q));
      const shuffledRemaining = this.shuffleArray(remaining);
      selectedQuestions.push(...shuffledRemaining.slice(0, count - selectedQuestions.length));
    }

    // Final shuffle of selected questions
    const finalShuffled = this.shuffleArray(selectedQuestions);
    
    console.log(`Selected ${finalShuffled.length} questions with usage counts:`, 
      finalShuffled.map(q => q.usageCount));

    // Mark questions as used in this session
    await this.markQuestionsAsUsed(finalShuffled, sessionId);

    // Return questions with shuffled options
    return finalShuffled.map(q => ({
      id: q.questionId,
      text: q.text,
      options: this.shuffleArray([...q.options]), // Shuffle answer options
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty,
      category: q.category
    }));
  }

  private async storeQuestionsWithUsageCount(apiQuestions: Question[], category: string, difficulty: string) {
    // Get current count to determine usageCount assignment
    const existingCount = await this.triviaQuestionModel.countDocuments({
      category,
      difficulty
    });

    const storePromises = apiQuestions.map(async (q, index) => {
      try {
        // Calculate usageCount: cycle through 1-30
        const usageCount = ((existingCount + index) % 30) + 1;
        
        await this.triviaQuestionModel.findOneAndUpdate(
          { questionId: q.id },
          {
            questionId: q.id,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            difficulty: difficulty,
            category: category,
            usageCount: usageCount, // Assign fixed number 1-30
            lastUsed: new Date()
          },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error('Error storing question:', error);
      }
    });

    await Promise.allSettled(storePromises);
  }

  async getTotalQuestionCount(): Promise<number> {
    return await this.triviaQuestionModel.countDocuments();
  }

  private async markQuestionsAsUsed(questions: TriviaQuestion[], sessionId: string) {
    const questionIds = questions.map(q => q._id);
    
    await this.triviaQuestionModel.updateMany(
      { _id: { $in: questionIds } },
      { 
        $addToSet: { usedInSessions: sessionId },
        $set: { lastUsed: new Date() }
        // NOTE: We don't increment usageCount - it's a fixed identifier (1-30)
      }
    );
    
    console.log(`Marked ${questionIds.length} questions as used in session ${sessionId}`);
  }

  async getQuestionStats(category?: string, difficulty?: string): Promise<any> {
    const matchStage: any = {};
    if (category) matchStage.category = category;
    if (difficulty) matchStage.difficulty = difficulty;

    const stats = await this.triviaQuestionModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { category: '$category', difficulty: '$difficulty' },
          totalQuestions: { $sum: 1 },
          minUsage: { $min: '$usageCount' },
          maxUsage: { $max: '$usageCount' },
          usageCountDistribution: {
            $push: '$usageCount'
          }
        }
      }
    ]);

    return stats;
  }

  // Shuffle array using Fisher-Yates algorithm
  private shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  // Clean up old session references periodically
  async cleanupOldSessions(maxAgeDays: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    
    await this.triviaQuestionModel.updateMany(
      { lastUsed: { $lt: cutoffDate } },
      { $set: { usedInSessions: [] } }
    );
  }

  async regenerateQuestionsWithNewCategory(roomId: string, settings: TriviaSettings): Promise<Question[]> {
    try {
      console.log('Regenerating questions with new category:', settings);
      
      // Clear any session tracking for this room to get fresh questions
      await this.triviaQuestionModel.updateMany(
        { usedInSessions: roomId },
        { $pull: { usedInSessions: roomId } }
      );
      
      // Get new questions with the updated settings
      const questions = await this.getUniqueQuestionsForSession(settings, roomId);
      
      console.log(`Generated ${questions.length} new questions for category: ${settings.category}`);
      return questions;
      
    } catch (error) {
      console.error('Error regenerating questions with new category:', error);
      throw error;
    }
  }
}

// import { Injectable } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose'; 
// import { TriviaService } from './trivia.service';
// import { TriviaQuestion } from './schemas/trivia-question.schema';
// import { TriviaPopulatorService } from './trivia-populator.service';


// export interface Question {
//     id: string;
//     text: string;
//     options: string[];
//     correctAnswer: string;
//     difficulty?: string;
//     category?: string;
//   }
  
//   export interface TriviaSettings {
//     questionCount: number;
//     difficulty: string;
//     category: string;
//   }

// @Injectable()
// export class EnhancedTriviaService {
//   constructor(
//     @InjectModel(TriviaQuestion.name) private triviaQuestionModel: Model<TriviaQuestion>,    
//     private readonly triviaService: TriviaService,
//     private readonly triviaPopulator: TriviaPopulatorService
//   ) {}

//   async getUniqueQuestionsForSession(settings: TriviaSettings, sessionId: string): Promise<Question[]> {
//     const { questionCount, difficulty, category } = settings;
    
//     console.log(`Getting ${questionCount} questions for ${category} (${difficulty}), session: ${sessionId}`);
    
//     // First, try to get questions with lowest usage count that haven't been used in this session
//     let questions = await this.triviaQuestionModel.find({
//       category,
//       difficulty,
//       usedInSessions: { $ne: sessionId }
//     })
//     .sort({ usageCount: 1, lastUsed: 1 }) // Prioritize least used and oldest
//     .limit(questionCount * 3) // Get more than needed for shuffling
//     .exec();

//     console.log(`Found ${questions.length} existing questions in database`);

//     // If not enough questions, fetch from API and store them
//     if (questions.length < questionCount) {
//       console.log(`Only found ${questions.length} unique questions, need ${questionCount}. Fetching from API...`);
      
//       const apiQuestions = await this.triviaService.getQuestions({
//         ...settings,
//         questionCount: Math.min(30, questionCount * 2) // Get more to build pool
//       });
      
//       await this.storeQuestions(apiQuestions, category, difficulty);
      
//       // Try again with the new questions
//       questions = await this.triviaQuestionModel.find({
//         category,
//         difficulty,
//         usedInSessions: { $ne: sessionId }
//       })
//       .sort({ usageCount: 1, lastUsed: 1 })
//       .limit(questionCount * 2)
//       .exec();
      
//       console.log(`After API fetch, now have ${questions.length} questions available`);
//     }

//     // If still not enough, use whatever we have (even if used in session)
//     if (questions.length < questionCount) {
//       console.log(`Still only have ${questions.length} questions. Using all available...`);
//       questions = await this.triviaQuestionModel.find({
//         category,
//         difficulty
//       })
//       .sort({ usageCount: 1, lastUsed: 1 })
//       .limit(questionCount)
//       .exec();
//     }

//     // Shuffle and select the required number of questions
//     const selectedQuestions = this.shuffleArray(questions).slice(0, questionCount);
    
//     console.log(`Selected ${selectedQuestions.length} questions with usage counts:`, 
//       selectedQuestions.map(q => q.usageCount));

//     // Mark questions as used in this session
//     await this.markQuestionsAsUsed(selectedQuestions, sessionId);

//     return selectedQuestions.map(q => ({
//       id: q.questionId,
//       text: q.text,
//       options: this.shuffleArray([...q.options]), // Shuffle answer options
//       correctAnswer: q.correctAnswer,
//       difficulty: q.difficulty,
//       category: q.category
//     }));
//   }

//   private async storeQuestions(apiQuestions: Question[], category: string, difficulty: string) {
//     const storePromises = apiQuestions.map(async (q) => {
//       try {
//         await this.triviaQuestionModel.findOneAndUpdate(
//           { questionId: q.id },
//           {
//             questionId: q.id,
//             text: q.text,
//             options: q.options,
//             correctAnswer: q.correctAnswer,
//             difficulty: difficulty,
//             category: category,
//             // Initialize with default values, don't increment usageCount here
//             lastUsed: new Date()
//           },
//           { upsert: true, new: true }
//         );
//       } catch (error) {
//         console.error('Error storing question:', error);
//       }
//     });

//     await Promise.allSettled(storePromises);
//   }

//   async getTotalQuestionCount(): Promise<number> {
//     return await this.triviaQuestionModel.countDocuments();
//   }

//   private async markQuestionsAsUsed(questions: TriviaQuestion[], sessionId: string) {
//     const questionIds = questions.map(q => q._id);
    
//     await this.triviaQuestionModel.updateMany(
//       { _id: { $in: questionIds } },
//       { 
//         $addToSet: { usedInSessions: sessionId },
//         $set: { lastUsed: new Date() },
//         $inc: { usageCount: 1 } // Only increment when actually used in a game
//       }
//     );
    
//     console.log(`Marked ${questionIds.length} questions as used in session ${sessionId}`);
//   }

//   // Add method to get database statistics
//   async getQuestionStats(category?: string, difficulty?: string): Promise<any> {
//     const matchStage: any = {};
//     if (category) matchStage.category = category;
//     if (difficulty) matchStage.difficulty = difficulty;

//     const stats = await this.triviaQuestionModel.aggregate([
//       { $match: matchStage },
//       {
//         $group: {
//           _id: { category: '$category', difficulty: '$difficulty' },
//           totalQuestions: { $sum: 1 },
//           averageUsage: { $avg: '$usageCount' },
//           minUsage: { $min: '$usageCount' },
//           maxUsage: { $max: '$usageCount' },
//           neverUsed: {
//             $sum: { $cond: [{ $eq: ['$usageCount', 0] }, 1, 0] }
//           }
//         }
//       }
//     ]);

//     return stats;
//   }

//   // Shuffle array using Fisher-Yates algorithm
//   private shuffleArray<T>(array: T[]): T[] {
//     const newArray = [...array];
//     for (let i = newArray.length - 1; i > 0; i--) {
//       const j = Math.floor(Math.random() * (i + 1));
//       [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
//     }
//     return newArray;
//   }

//   // Clean up old session references periodically
//   async cleanupOldSessions(maxAgeDays: number = 7) {
//     const cutoffDate = new Date();
//     cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    
//     await this.triviaQuestionModel.updateMany(
//       { lastUsed: { $lt: cutoffDate } },
//       { $set: { usedInSessions: [] } }
//     );
//   }



  
// async regenerateQuestionsWithNewCategory(roomId: string, settings: TriviaSettings): Promise<Question[]> {
//     try {
//       console.log('Regenerating questions with new category:', settings);
      
//       // Clear any session tracking for this room to get fresh questions
//       await this.triviaQuestionModel.updateMany(
//         { usedInSessions: roomId },
//         { $pull: { usedInSessions: roomId } }
//       );
      
//       // Get new questions with the updated settings
//       const questions = await this.getUniqueQuestionsForSession(settings, roomId);
      
//       console.log(`Generated ${questions.length} new questions for category: ${settings.category}`);
//       return questions;
      
//     } catch (error) {
//       console.error('Error regenerating questions with new category:', error);
//       throw error;
//     }
//   }

// }