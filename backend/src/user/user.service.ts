
// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { GameRoom, GameRoomDocument } from '../game/schemas/game-room.schema';
import { GameSessionEntity, GameSessionDocument } from '../game/schemas/game-session.schema';
import { Counter, CounterDocument } from './schemas/counter.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(GameRoom.name) private gameRoomModel: Model<GameRoomDocument>,
    @InjectModel(GameSessionEntity.name) private gameSessionModel: Model<GameSessionDocument>,
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
  ) { }

  async create(userData: { username: string; email?: string; password?: string }): Promise<User> {
    // Remove manual _id assignment - let MongoDB generate ObjectId automatically
    const user = new this.userModel({
      ...userData
    });

    const savedUser = await user.save();
    console.log('Saved user:', savedUser); // Debug log
    return savedUser;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).select('-password').exec(); // Exclude password from result
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async updateGameStats(userId: string, gameType: string, score: number, won: boolean) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        console.log(`User ${userId} not found, creating new user stats`);
        return;
      }

      // Initialize arrays if they don't exist
      if (!user.gameStats) user.gameStats = [];
      if (!user.gameTypesPlayed) user.gameTypesPlayed = [];
      if (!user.gameHistory) user.gameHistory = [];

      // Update overall stats
      user.totalScore = (user.totalScore || 0) + score;
      user.gamesPlayed = (user.gamesPlayed || 0) + 1;
      if (won) user.gamesWon = (user.gamesWon || 0) + 1;

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
      console.log(`Updated game stats for user ${userId}: score=${score}, won=${won}, gameType=${gameType}`);
    } catch (error) {
      console.error(`Error updating game stats for user ${userId}:`, error);
    }
  }

  async getLeaderboard(limit = 10, gameType?: string) {
    try {
      console.log('Getting leaderboard for gameType:', gameType);

      // Prioritize game room based leaderboard (uses gamerooms collection)
      const roomLeaderboard = await this.getRoomBasedLeaderboard(limit, gameType);
      if (roomLeaderboard && roomLeaderboard.length > 0) {
        console.log('Using room-based leaderboard with', roomLeaderboard.length, 'players');
        return roomLeaderboard;
      }

      // Fall back to game session based leaderboard
      const sessionLeaderboard = await this.getSessionBasedLeaderboard(limit, gameType);
      if (sessionLeaderboard && sessionLeaderboard.length > 0) {
        console.log('Using session-based leaderboard with', sessionLeaderboard.length, 'players');
        return sessionLeaderboard;
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
      const matchStage = gameType && gameType !== 'all' ? {} : {};

      const pipeline: PipelineStage[] = [
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

        // Project final format - 5 points per win
        {
          $project: {
            _id: 1,
            username: '$userInfo.username',
            avatar: {
              $cond: [
                { $ne: ['$userInfo.avatar', null] },
                '$userInfo.avatar',
                { $concat: ['https://api.dicebear.com/7.x/avataaars/svg?seed=', '$userInfo.username'] }
              ]
            },
            score: { $multiply: ['$totalWins', 5] }, // 5 points per win
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

      const pipeline: PipelineStage[] = [
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

        // Convert string ID to ObjectId for lookup
        {
          $addFields: {
            userObjectId: { $toObjectId: '$_id' }
          }
        },

        // Lookup user information using converted ObjectId
        {
          $lookup: {
            from: 'users',
            localField: 'userObjectId',
            foreignField: '_id',
            as: 'userInfo'
          }
        },

        // Unwind user info
        { $unwind: '$userInfo' },

        // Project final format - 5 points per win
        {
          $project: {
            _id: '$userObjectId',
            username: '$userInfo.username',
            avatar: {
              $cond: [
                { $ne: ['$userInfo.avatar', null] },
                '$userInfo.avatar',
                { $concat: ['https://api.dicebear.com/7.x/avataaars/svg?seed=', '$userInfo.username'] }
              ]
            },
            score: { $multiply: ['$totalWins', 5] }, // 5 points per win
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
          avatar: {
            $cond: [
              { $ne: ['$avatar', null] },
              '$avatar',
              { $concat: ['https://api.dicebear.com/7.x/avataaars/svg?seed=', '$username'] }
            ]
          },
          score: {
            $let: {
              vars: {
                gameStats: {
                  $filter: {
                    input: { $ifNull: ['$gameStats', []] },
                    cond: { $eq: ['$$this.gameType', gameType] }
                  }
                }
              },
              in: { $multiply: [{ $sum: '$$gameStats.score' }, 1] } // Keep original score
            }
          },
          gamesPlayed: {
            $let: {
              vars: {
                gameStats: {
                  $filter: {
                    input: { $ifNull: ['$gameStats', []] },
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
                    input: { $ifNull: ['$gameStats', []] },
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
        // For overall leaderboard - include all users, even those without games
        projectStage = {
          _id: 1,
          username: 1,
          avatar: {
            $cond: [
              { $ne: ['$avatar', null] },
              '$avatar',
              { $concat: ['https://api.dicebear.com/7.x/avataaars/svg?seed=', '$username'] }
            ]
          },
          score: { $ifNull: ['$totalScore', 0] }, // Don't multiply by 5 here
          gamesPlayed: { $ifNull: ['$gamesPlayed', 0] },
          gamesWon: { $ifNull: ['$gamesWon', 0] },
          winRate: {
            $cond: [
              { $gt: [{ $ifNull: ['$gamesPlayed', 0] }, 0] },
              { $multiply: [{ $divide: [{ $ifNull: ['$gamesWon', 0] }, { $ifNull: ['$gamesPlayed', 1] }] }, 100] },
              0
            ]
          }
        };

        sortStage = {
          score: -1,
          gamesWon: -1,
          username: 1
        };
      }

      const pipeline: PipelineStage[] = [
        { $match: matchStage },
        { $project: projectStage },
        // Remove the score > 0 filter to show all users
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

  async getUserProfile(userId: string) {
    try {
      // Get basic user info
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get comprehensive game statistics from game sessions
      const gameStats = await this.getUserGameStats(userId);

      // Get recent game history
      const recentGames = await this.getUserRecentGames(userId);

      // Get favorite games
      const favoriteGames = await this.getUserFavoriteGames(userId);

      // Get achievements and badges
      const badges = await this.getUserBadges(userId, gameStats);

      // Get global rank
      const globalRank = await this.getUserGlobalRank(userId);

      return {
        success: true,
        data: {
          _id: user._id,
          username: user.username,
          avatar: user.avatar,
          createdAt: user.createdAt,
          // updatedAt: user.updatedAt,
          totalScore: gameStats.totalScore,
          gamesPlayed: gameStats.totalGames,
          gamesWon: gameStats.totalWins,
          gameStats: gameStats.gameTypeStats,
          recentGames,
          favoriteGames,
          badges,
          globalRank,
          winRate: gameStats.totalGames > 0 ? Math.round((gameStats.totalWins / gameStats.totalGames) * 100) : 0
        }
      };
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUserGameStats(userId: string) {
    try {
      const pipeline: PipelineStage[] = [
        // Match completed games where user participated
        {
          $match: {
            playerIds: userId,
            status: 'completed'
          }
        },

        // Group by game type to get stats per game
        {
          $group: {
            _id: '$gameType',
            count: { $sum: 1 },
            wins: {
              $sum: {
                $cond: [
                  { $eq: ['$winner', userId] },
                  1,
                  0
                ]
              }
            },
            totalScore: {
              $sum: {
                $cond: [
                  { $eq: ['$winner', userId] },
                  5, // 5 points per win
                  0
                ]
              }
            },
            gameNames: { $addToSet: '$name' },
            lastPlayed: { $max: '$updatedAt' }
          }
        },

        // Project final format
        {
          $project: {
            gameType: '$_id',
            count: 1,
            wins: 1,
            totalScore: 1,
            gameNames: 1,
            lastPlayed: 1,
            winRate: {
              $multiply: [
                { $divide: ['$wins', '$count'] },
                100
              ]
            }
          }
        },

        // Sort by count descending
        { $sort: { count: -1 } }
      ];

      const gameTypeStats = await this.gameRoomModel.aggregate(pipeline);

      // Calculate overall totals
      const totalGames = gameTypeStats.reduce((sum, stat) => sum + stat.count, 0);
      const totalWins = gameTypeStats.reduce((sum, stat) => sum + stat.wins, 0);
      const totalScore = gameTypeStats.reduce((sum, stat) => sum + stat.totalScore, 0);

      return {
        totalGames,
        totalWins,
        totalScore,
        gameTypeStats: gameTypeStats.map(stat => ({
          gameType: stat.gameType,
          count: stat.count,
          wins: stat.wins,
          totalScore: stat.totalScore,
          winRate: Math.round(stat.winRate || 0),
          lastPlayed: stat.lastPlayed
        }))
      };
    } catch (error) {
      console.error('Error in getUserGameStats:', error);
      return {
        totalGames: 0,
        totalWins: 0,
        totalScore: 0,
        gameTypeStats: []
      };
    }
  }

  async getUserRecentGames(userId: string, limit = 10) {
    try {
      const pipeline: PipelineStage[] = [
        // Match completed games where user participated
        {
          $match: {
            playerIds: userId,
            status: 'completed'
          }
        },

        // Project game info
        {
          $project: {
            roomId: 1,
            gameType: 1,
            gameName: '$name',
            won: { $eq: ['$winner', userId] },
            score: {
              $cond: [
                { $eq: ['$winner', userId] },
                5, // 5 points per win
                0
              ]
            },
            createdAt: 1,
            updatedAt: 1,
            duration: {
              $divide: [
                { $subtract: ['$updatedAt', '$createdAt'] },
                60000 // Convert to minutes
              ]
            },
            totalPlayers: { $size: '$playerIds' }
          }
        },

        // Sort by most recent
        { $sort: { updatedAt: -1 } },

        // Limit results
        { $limit: limit }
      ];

      const recentGames = await this.gameRoomModel.aggregate(pipeline);

      return recentGames.map(game => ({
        id: game.roomId,
        name: game.gameName || `${game.gameType} Game`,
        type: game.gameType,
        date: game.updatedAt ? new Date(game.updatedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }) : 'Unknown',
        result: game.won ? 'Won' : 'Lost',
        score: game.score,
        duration: Math.round(game.duration || 0),
        totalPlayers: game.totalPlayers,
        startedAt: game.createdAt,
        endedAt: game.updatedAt
      }));
    } catch (error) {
      console.error('Error in getUserRecentGames:', error);
      return [];
    }
  }

  async getUserFavoriteGames(userId: string, limit = 5) {
    try {
      const pipeline: PipelineStage[] = [
        // Match completed games where user participated
        {
          $match: {
            playerIds: userId,
            status: 'completed'
          }
        },

        // Group by game type
        {
          $group: {
            _id: '$gameType',
            count: { $sum: 1 },
            wins: {
              $sum: {
                $cond: [
                  { $eq: ['$winner', userId] },
                  1,
                  0
                ]
              }
            },
            lastPlayed: { $max: '$updatedAt' }
          }
        },

        // Sort by count descending
        { $sort: { count: -1 } },

        // Limit results
        { $limit: limit }
      ];

      const favoriteGames = await this.gameRoomModel.aggregate(pipeline);

      return favoriteGames.map(game => ({
        gameType: game._id,
        count: game.count,
        wins: game.wins,
        winRate: Math.round((game.wins / game.count) * 100),
        lastPlayed: game.lastPlayed
      }));
    } catch (error) {
      console.error('Error in getUserFavoriteGames:', error);
      return [];
    }
  }

  async getUserBadges(userId: string, gameStats: any) {
    try {
      const badges: Array<{
        id: number;
        name: string;
        icon: string;
        description: string;
        date: string;
        category: string;
      }> = [];

      // Game Master badge - Win 10+ games
      if (gameStats.totalWins >= 10) {
        badges.push({
          id: 1,
          name: 'Game Master',
          icon: '🏆',
          description: `Won ${gameStats.totalWins} games`,
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          category: 'achievement'
        });
      }

      // Multi-Game Champion - Win 5+ games in multiple categories
      const gameTypesWithWins = gameStats.gameTypeStats.filter((stat: any) => stat.wins >= 5);
      if (gameTypesWithWins.length >= 2) {
        badges.push({
          id: 2,
          name: 'Multi-Game Champion',
          icon: '🥇',
          description: `Won 5+ games in ${gameTypesWithWins.length} categories`,
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          category: 'achievement'
        });
      }

      // First Win badge
      if (gameStats.totalWins >= 1) {
        badges.push({
          id: 3,
          name: 'First Victory',
          icon: '🎯',
          description: 'Won your first game',
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          category: 'milestone'
        });
      }

      // Dedicated Player - Play 20+ games
      if (gameStats.totalGames >= 20) {
        badges.push({
          id: 4,
          name: 'Dedicated Player',
          icon: '🎮',
          description: `Played ${gameStats.totalGames} games`,
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          category: 'milestone'
        });
      }

      // High Win Rate - 80%+ win rate
      if (gameStats.totalGames >= 5) {
        const winRate = (gameStats.totalWins / gameStats.totalGames) * 100;
        if (winRate >= 80) {
          badges.push({
            id: 5,
            name: 'High Roller',
            icon: '⭐',
            description: `${Math.round(winRate)}% win rate`,
            date: new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }),
            category: 'achievement'
          });
        }
      }

      // Game Type Specialist badges
      gameStats.gameTypeStats.forEach((stat: any) => {
        if (stat.wins >= 10) {
          badges.push({
            id: 100 + badges.length,
            name: `${stat.gameType.charAt(0).toUpperCase() + stat.gameType.slice(1)} Master`,
            icon: this.getGameIcon(stat.gameType),
            description: `Won ${stat.wins} ${stat.gameType} games`,
            date: new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }),
            category: 'specialist'
          });
        }
      });

      return badges;
    } catch (error) {
      console.error('Error in getUserBadges:', error);
      return [];
    }
  }

  private getGameIcon(gameType: string): string {
    const icons: { [key: string]: string } = {
      'trivia': '🎲',
      'chess': '♟️',
      'uno': '🃏',
      'kahoot': '❓',
      'pictionary': '🎨',
      'ludo': '🎲',
      'sudoku': '🧠'
    };
    return icons[gameType] || '🎮';
  }

  async getUserGlobalRank(userId: string) {
    try {
      // Get global leaderboard
      const leaderboard = await this.getLeaderboard(1000); // Get all users

      // Find user's position
      const userIndex = leaderboard.findIndex((user: any) => user._id === userId);

      if (userIndex >= 0) {
        return `#${userIndex + 1}`;
      } else {
        return 'Unranked';
      }
    } catch (error) {
      console.error('Error in getUserGlobalRank:', error);
      return 'Unranked';
    }
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

  async syncAllUserStats() {
    try {
      console.log('Starting user stats synchronization...');

      // Get all users
      const users = await this.userModel.find();
      const results: Array<{
        userId: string;
        username: string;
        totalScore: number;
        gamesPlayed: number;
        gamesWon: number;
      }> = [];

      for (const user of users) {
        // Calculate stats from game sessions
        const gameStats = await this.getUserGameStats(String(user._id));

        // Update user document with calculated stats
        await this.userModel.findByIdAndUpdate(user._id, {
          totalScore: gameStats.totalScore,
          gamesPlayed: gameStats.totalGames,
          gamesWon: gameStats.totalWins,
          gameStats: gameStats.gameTypeStats
        });

        results.push({
          userId: String(user._id),
          username: user.username,
          totalScore: gameStats.totalScore,
          gamesPlayed: gameStats.totalGames,
          gamesWon: gameStats.totalWins
        });
      }

      console.log(`Synchronized stats for ${results.length} users`);
      return results;
    } catch (error) {
      console.error('Error syncing user stats:', error);
      throw error;
    }
  }

  async updateProfile(userId: string, updateData: { username?: string; email?: string; avatar?: string }) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }



      // Check if username is being updated and if it's already taken
      if (updateData.username && updateData.username !== user.username) {
        const existingUser = await this.userModel.findOne({ username: updateData.username });
        if (existingUser) {
          return { success: false, error: 'Username already taken' };
        }
      }

      // Check if email is being updated and if it's already taken
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await this.userModel.findOne({ email: updateData.email });
        if (existingUser) {
          return { success: false, error: 'Email already taken' };
        }
      }

      // Update user
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
      );

      if (!updatedUser) {
        console.log("Not found");
        return { success: false, error: 'User not found' };
      }

      return {
        success: true,
        user: {
          _id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
          totalScore: updatedUser.totalScore,
          gamesPlayed: updatedUser.gamesPlayed,
          gamesWon: updatedUser.gamesWon,
          gameTypesPlayed: updatedUser.gameTypesPlayed,
          gameStats: updatedUser.gameStats,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  // Add a specific avatar update method
  async updateAvatar(userId: string, avatar: string) {
    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { avatar },
        { new: true }
      );

      if (!updatedUser) {
        return { success: false, error: 'User not found' };
      }

      return {
        success: true,
        user: {
          _id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
          totalScore: updatedUser.totalScore,
          gamesPlayed: updatedUser.gamesPlayed,
          gamesWon: updatedUser.gamesWon,
          gameTypesPlayed: updatedUser.gameTypesPlayed,
          gameStats: updatedUser.gameStats,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      };
    } catch (error) {
      console.error('Error updating user avatar:', error);
      return { success: false, error: 'Failed to update avatar' };
    }
  }

  async addFunds(userId: string, amount: number, transactionDetails: any) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) throw new Error('User not found');

      user.balance = (user.balance || 0) + Number(amount);
      if (!user.transactions) user.transactions = [];

      user.transactions.push({
        transactionId: transactionDetails.id || new Date().getTime().toString(),
        type: 'deposit',
        amount: Number(amount),
        date: new Date(),
        status: 'completed',
        description: `Deposit via ${transactionDetails.paymentMethod || 'PayPal'}`,
        paymentMethod: transactionDetails.paymentMethod || 'PayPal'
      });

      await user.save();
      return { success: true, balance: user.balance, transactions: user.transactions };
    } catch (error) {
      console.error('Error adding funds:', error);
      throw error;
    }
  }

  async deductFunds(userId: string, amount: number, description: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) throw new Error('User not found');

      if ((user.balance || 0) < amount) {
        throw new Error('Insufficient balance');
      }

      user.balance = (user.balance || 0) - Number(amount);
      if (!user.transactions) user.transactions = [];

      user.transactions.push({
        transactionId: `charge-${new Date().getTime()}`,
        type: 'join_game',
        amount: Number(amount),
        date: new Date(),
        status: 'completed',
        description: description,
        paymentMethod: 'Wallet'
      });

      await user.save();
      return { success: true, balance: user.balance };
    } catch (error) {
      console.error('Error deducting funds:', error);
      throw error;
    }
  }

  async getTransactions(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new Error('User not found');
    return {
      balance: user.balance || 0,
      transactions: (user.transactions || []).reverse()
    };
  }
}


