// src/user/user.controller.ts
import { Controller, Post, Body, Get, Param, Query, Put } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('login-or-register')
  async loginOrRegister(@Body() body: { username: string }) {
    const { username } = body;
    
    if (!username || !username.trim()) {
      throw new Error('Username is required');
    }

    // Check if user exists, if not create them
    let user = await this.userService.findByUsername(username);
    
    if (!user) {
      user = await this.userService.create({ username });
    }

    return {
      id: (user as any).id, // Cast to access Mongoose virtuals
      username: user.username,
      createdAt: user.createdAt,
    };
  }

  // Move leaderboard route BEFORE the :id route to avoid conflict
  @Get('leaderboard')
  async getLeaderboard(@Query('gameType') gameType?: string) {
    try {
      console.log('Leaderboard request received for gameType:', gameType);
      const leaderboard = await this.userService.getLeaderboard(10, gameType);
      console.log('Leaderboard result:', leaderboard);
      return {
        success: true,
        data: leaderboard
      };
    } catch (error) {
      console.error('Leaderboard error:', error);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  @Post('populate-sample-data')
  async populateSampleData() {
    try {
      const result = await this.userService.populateSampleGameData();
      return {
        success: result,
        message: result ? 'Sample data populated successfully' : 'Failed to populate sample data'
      };
    } catch (error) {
      console.error('Populate sample data error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('sync-user-stats')
  async syncUserStats() {
    try {
      console.log('Starting user stats synchronization...');
      const result = await this.userService.syncAllUserStats();
      return {
        success: true,
        message: 'User statistics synchronized successfully',
        data: result
      };
    } catch (error) {
      console.error('Sync user stats error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('bootstrap-test-data')
  async bootstrapTestData() {
    try {
      console.log('Bootstrapping test data...');
      
      // First sync user stats from existing game sessions
      await this.userService.syncAllUserStats();
      
      // If still no data, create some sample users with stats
      const users = await this.userService.findAll();
      if (users.length === 0) {
        // Create sample users with game stats
        const sampleUsers = [
          { username: 'testuser1', totalScore: 150, gamesPlayed: 10, gamesWon: 6 },
          { username: 'testuser2', totalScore: 120, gamesPlayed: 8, gamesWon: 4 },
          { username: 'testuser3', totalScore: 90, gamesPlayed: 6, gamesWon: 3 },
        ];
        
        for (const userData of sampleUsers) {
          const user = await this.userService.create({ username: userData.username });
          await this.userService.updateGameStats((user as any).id, 'trivia', userData.totalScore, true);
        }
      }
      
      return {
        success: true,
        message: 'Test data bootstrapped successfully'
      };
    } catch (error) {
      console.error('Bootstrap test data error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    try {
      const user = await this.userService.findById(id);
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      return { success: true, data: user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Get(':id/profile')
  async getUserProfile(@Param('id') id: string) {
    try {
      const profile = await this.userService.getUserProfile(id);
      return profile;
    } catch (error) {
      console.error('Get user profile error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get(':id/stats')
  async getUserStats(@Param('id') id: string) {
    try {
      const stats = await this.userService.getUserStats(id);
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Put(':id/profile')
  async updateUserProfile(@Param('id') id: string, @Body() body: { username?: string; email?: string }) {
    try {
      const { username, email } = body;
      const result = await this.userService.updateProfile(id, { username, email });
      return result;
    } catch (error) {
      console.error('Update user profile error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
