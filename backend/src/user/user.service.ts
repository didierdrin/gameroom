// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(userData: { username: string }): Promise<User> {
    const user = new this.userModel(userData);
    return user.save();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).select('_id username').exec();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }


  async updateGameStats(userId: string, gameType: string, score: number, won: boolean) {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    // Update overall stats
    user.totalScore += score;
    user.gamesPlayed += 1;
    if (won) user.gamesWon += 1;

    // Update game types played (unique list)
    if (!user.gameTypesPlayed.includes(gameType)) {
      user.gameTypesPlayed.push(gameType);
    }

    // Update specific game type stats
    const gameStatIndex = user.gameStats.findIndex(stat => stat.gameType === gameType);
    if (gameStatIndex >= 0) {
      user.gameStats[gameStatIndex].count += 1;
      user.gameStats[gameStatIndex].score += score;
      if (won) user.gameStats[gameStatIndex].wins += 1;
    } else {
      user.gameStats.push({
        gameType,
        count: 1,
        wins: won ? 1 : 0,
        score
      });
    }

    // Add to game history
    user.gameHistory.push({
      roomId: '', // Will be set by game service
      gameType,
      score,
      won,
      date: new Date()
    });

    await user.save();
  }

  async getLeaderboard(limit = 10, gameType?: string) {
    let matchStage = {};
    if (gameType) {
      matchStage = {
        'gameStats.gameType': gameType
      };
    }

    return this.userModel.aggregate([
      { $match: matchStage },
      { $sort: { totalScore: -1 } },
      { $limit: limit },
      { $project: {
        _id: 1,
        username: 1,
        avatar: { $concat: ['https://api.dicebear.com/7.x/avataaars/svg?seed=', '$username'] },
        score: gameType 
          ? { 
              $let: {
                vars: { stats: { $arrayElemAt: ['$gameStats', { $indexOfArray: ['$gameStats.gameType', gameType] }] },
                in: '$$stats.score'
              }
            } }
          : '$totalScore',
        gamesPlayed: gameType 
          ? { 
              $let: {
                vars: { stats: { $arrayElemAt: ['$gameStats', { $indexOfArray: ['$gameStats.gameType', gameType] }] },
                in: '$$stats.count'
              }
            } }
          : '$gamesPlayed',
        gamesWon: gameType 
          ? { 
              $let: {
                vars: { stats: { $arrayElemAt: ['$gameStats', { $indexOfArray: ['$gameStats.gameType', gameType] }] },
                in: '$$stats.wins'
              }
            } }
          : '$gamesWon'
      }}
    ]);
  }



  async getUserStats(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
  
    return {
      _id: user._id,
      username: user.username,
      totalScore: user.totalScore,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      gameTypesPlayed: user.gameTypesPlayed,
      gameStats: user.gameStats,
      gameHistory: user.gameHistory.slice(-10) // Last 10 games
    };
  }

  

}


