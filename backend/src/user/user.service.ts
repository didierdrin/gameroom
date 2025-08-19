
// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { GameRoom, GameRoomDocument } from '../game/schemas/game-room.schema';
import { GameSessionEntity, GameSessionDocument } from '../game/schemas/game-session.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(GameRoom.name) private gameRoomModel: Model<GameRoomDocument>,
    @InjectModel(GameSessionEntity.name) private gameSessionModel: Model<GameSessionDocument>,
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
    try {
      console.log('Getting leaderboard for gameType:', gameType);
      
      // First try to get leaderboard from game sessions (most accurate)
      const sessionLeaderboard = await this.getSessionBasedLeaderboard(limit, gameType);
      if (sessionLeaderboard && sessionLeaderboard.length > 0) {
        console.log('Using session-based leaderboard with', sessionLeaderboard.length, 'players');
        return sessionLeaderboard;
      }

      // Fall back to game room based leaderboard
      const roomLeaderboard = await this.getRoomBasedLeaderboard(limit, gameType);
      if (roomLeaderboard && roomLeaderboard.length > 0) {
        console.log('Using room-based leaderboard with', roomLeaderboard.length, 'players');
        return roomLeaderboard;
      }

      // Final fallback to user-based leaderboard
      console.log('Falling back to user-based leaderboard');
      return await this.getFallbackLeaderboard(limit, gameType);
    } catch (error) {
      console.error('Error in getLeaderboard:', error);
      // Fall back to user-based leaderboard on error
      return await this.getFallbackLeaderboard(limit, gameType);
    }
  }

  async getSessionBasedLeaderboard(limit = 10, gameType?: string) {
    try {
      // Start with game sessions to get player stats
      const matchStage = gameType && gameType !== 'all' ? { gameType } : {};
      
      const pipeline: any[] = [
        // Match completed game sessions
        { $match: { ...matchStage } },
        
        // Lookup game rooms to get game type if not in session
        {
          $lookup: {
            from: 'gamerooms',
            localField: 'roomId',
            foreignField: 'roomId',
            as: 'gameRoom'
          }
        },
        
        // Unwind game room
        { $unwind: '$gameRoom' },
        
        // Filter by game type if specified
        ...(gameType && gameType !== 'all' ? [{ $match: { 'gameRoom.gameType': gameType } }] : []),
        
        // Unwind players array to get individual player stats
        { $unwind: '$players' },
        
        // Group by individual player
        {
          $group: {
            _id: '$players',
            totalGames: { $sum: 1 },
            totalWins: {
              $sum: {
                $cond: [
                  { $eq: ['$winner', '$players'] },
                  1,
                  0
                ]
              }
            },
            gameTypes: { $addToSet: '$gameRoom.gameType' }
          }
        },
        
        // Lookup user information
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        
        // Unwind user info
        { $unwind: '$userInfo' },
        
        // Project final format
        {
          $project: {
            _id: 1,
            username: '$userInfo.username',
            avatar: { $concat: ['https://api.dicebear.com/7.x/avataaars/svg?seed=', '$userInfo.username'] },
            score: { $multiply: ['$totalWins', 100] }, // 100 points per win
            gamesPlayed: '$totalGames',
            gamesWon: '$totalWins',
            winRate: {
              $multiply: [
                { $divide: ['$totalWins', '$totalGames'] },
                100
              ]
            }
          }
        },
        
        // Filter out users with no games
        { $match: { gamesPlayed: { $gt: 0 } } },
        
        // Sort by score, then by win rate, then by games won
        { $sort: { score: -1, winRate: -1, gamesWon: -1 } },
        
        // Limit results
        { $limit: limit }
      ];

      console.log('Session-based leaderboard pipeline:', JSON.stringify(pipeline, null, 2));
      
      const result = await this.gameSessionModel.aggregate(pipeline);
      console.log('Session-based leaderboard result:', result);
      
      return result;
    } catch (error) {
      console.error('Error in getSessionBasedLeaderboard:', error);
      return [];
    }
  }

  async getRoomBasedLeaderboard(limit = 10, gameType?: string) {
    try {
      const matchStage = gameType && gameType !== 'all' ? { gameType } : {};
      
      const pipeline: any[] = [
        // Match completed games only
        { $match: { ...matchStage, status: 'completed' } },
        
        // Unwind player IDs to get individual player stats
        { $unwind: '$playerIds' },
        
        // Group by individual player
        {
          $group: {
            _id: '$playerIds',
            totalGames: { $sum: 1 },
            totalWins: {
              $sum: {
                $cond: [
                  { $eq: ['$winner', '$playerIds'] },
                  1,
                  0
                ]
              }
            },
            gameTypes: { $addToSet: '$gameType' }
          }
        },
        
        // Lookup user information
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        
        // Unwind user info
        { $unwind: '$userInfo' },
        
        // Project final format
        {
          $project: {
            _id: 1,
            username: '$userInfo.username',
            avatar: { $concat: ['https://api.dicebear.com/7.x/avataaars/svg?seed=', '$userInfo.username'] },
            score: { $multiply: ['$totalWins', 100] }, // 100 points per win
            gamesPlayed: '$totalGames',
            gamesWon: '$totalWins',
            winRate: {
              $multiply: [
                { $divide: ['$totalWins', '$totalGames'] },
                100
              ]
            }
          }
        },
        
        // Filter out users with no games
        { $match: { gamesPlayed: { $gt: 0 } } },
        
        // Sort by score, then by win rate, then by games won
        { $sort: { score: -1, winRate: -1, gamesWon: -1 } },
        
        // Limit results
        { $limit: limit }
      ];

      console.log('Room-based leaderboard pipeline:', JSON.stringify(pipeline, null, 2));
      
      const result = await this.gameRoomModel.aggregate(pipeline);
      console.log('Room-based leaderboard result:', result);
      
      return result;
    } catch (error) {
      console.error('Error in getRoomBasedLeaderboard:', error);
      return [];
    }
  }

  async getFallbackLeaderboard(limit = 10, gameType?: string) {
    try {
      let matchStage = {};
      let sortStage = {};
      let projectStage = {};

      if (gameType && gameType !== 'all' && gameType.trim()) {
        // For specific game type
        matchStage = {
          'gameStats.gameType': gameType
        };
        
        projectStage = {
          _id: 1,
          username: 1,
          avatar: { $concat: ['https://api.dicebear.com/7.x/avataaars/svg?seed=', '$username'] },
          score: {
            $let: {
              vars: {
                gameStats: {
                  $filter: {
                    input: '$gameStats',
                    cond: { $eq: ['$$this.gameType', gameType] }
                  }
                }
              },
              in: { $sum: '$$gameStats.score' }
            }
          },
          gamesPlayed: {
            $let: {
              vars: {
                gameStats: {
                  $filter: {
                    input: '$gameStats',
                    cond: { $eq: ['$$this.gameType', gameType] }
                  }
                }
              },
              in: { $sum: '$$gameStats.count' }
            }
          },
          gamesWon: {
            $let: {
              vars: {
                gameStats: {
                  $filter: {
                    input: '$gameStats',
                    cond: { $eq: ['$$this.gameType', gameType] }
                  }
                }
              },
              in: { $sum: '$$gameStats.wins' }
            }
          }
        };
        
        sortStage = {
          score: -1,
          gamesWon: -1,
          username: 1
        };
      } else {
        // For overall leaderboard
        projectStage = {
          _id: 1,
          username: 1,
          avatar: { $concat: ['https://api.dicebear.com/7.x/avataaars/svg?seed=', '$username'] },
          score: { $ifNull: ['$totalScore', 0] },
          gamesPlayed: { $ifNull: ['$gamesPlayed', 0] },
          gamesWon: { $ifNull: ['$gamesWon', 0] }
        };
        
        sortStage = {
          score: -1,
          gamesWon: -1,
          username: 1
        };
      }

      const pipeline: any[] = [
        { $match: matchStage },
        { $project: projectStage },
        { $match: { score: { $gt: 0 } } }, // Only users with score > 0
        { $sort: sortStage },
        { $limit: limit }
      ];

      console.log('Fallback leaderboard pipeline:', JSON.stringify(pipeline, null, 2));
      
      const result = await this.userModel.aggregate(pipeline);
      console.log('Fallback leaderboard result:', result);
      
      return result || [];
    } catch (error) {
      console.error('Error in getFallbackLeaderboard:', error);
      return [];
    }
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

  // Method to populate sample game data for testing
  async populateSampleGameData() {
    try {
      // Create sample game rooms
      const sampleGameRooms = [
        {
          roomId: 'sample-room-1',
          name: 'Trivia Challenge 1',
          host: '686a1c5ba08ee864040b43ba', // didier0
          gameType: 'trivia',
          isPrivate: false,
          maxPlayers: 4,
          currentPlayers: 2,
          status: 'completed',
          scores: new Map([
            ['686a1c5ba08ee864040b43ba', 150],
            ['686a1b39a08ee864040b43b1', 120]
          ]),
          winner: '686a1c5ba08ee864040b43ba',
          playerIds: ['686a1c5ba08ee864040b43ba', '686a1b39a08ee864040b43b1'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          roomId: 'sample-room-2',
          name: 'Chess Match 1',
          host: '686a1b39a08ee864040b43b1', // didierdrin9
          gameType: 'chess',
          isPrivate: false,
          maxPlayers: 2,
          currentPlayers: 2,
          status: 'completed',
          scores: new Map([
            ['686a1b39a08ee864040b43b1', 200],
            ['686a1c5ba08ee864040b43ba', 180]
          ]),
          winner: '686a1b39a08ee864040b43b1',
          playerIds: ['686a1b39a08ee864040b43b1', '686a1c5ba08ee864040b43ba'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Create sample game sessions
      const sampleGameSessions = [
        {
          roomId: 'sample-room-1',
          gameRoom: null,
          players: ['686a1c5ba08ee864040b43ba', '686a1b39a08ee864040b43b1'],
          winner: '686a1c5ba08ee864040b43ba',
          duration: 300,
          moves: [],
          finalState: {
            coins: {},
            players: ['686a1c5ba08ee864040b43ba', '686a1b39a08ee864040b43b1'],
            scores: {
              '686a1c5ba08ee864040b43ba': 150,
              '686a1b39a08ee864040b43b1': 120
            }
          },
          startedAt: new Date(),
          endedAt: new Date(),
          isTournament: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          roomId: 'sample-room-2',
          gameRoom: null,
          players: ['686a1b39a08ee864040b43b1', '686a1c5ba08ee864040b43ba'],
          winner: '686a1b39a08ee864040b43b1',
          duration: 600,
          moves: [],
          finalState: {
            coins: {},
            players: ['686a1b39a08ee864040b43b1', '686a1c5ba08ee864040b43ba'],
            scores: {
              '686a1c5ba08ee864040b43ba': 180
            }
          },
          startedAt: new Date(),
          endedAt: new Date(),
          isTournament: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Insert sample data
      for (const room of sampleGameRooms) {
        await this.gameRoomModel.findOneAndUpdate(
          { roomId: room.roomId },
          room,
          { upsert: true, new: true }
        );
      }

      for (const session of sampleGameSessions) {
        await this.gameSessionModel.findOneAndUpdate(
          { roomId: session.roomId },
          session,
          { upsert: true, new: true }
        );
      }

      console.log('Sample game data populated successfully');
      return true;
    } catch (error) {
      console.error('Error populating sample game data:', error);
      return false;
    }
  }
}


