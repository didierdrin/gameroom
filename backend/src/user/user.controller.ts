// src/user/user.controller.ts
import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
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
      _id: user._id,
      username: user.username,
      createdAt: user.createdAt,
    };
  }

  // Move leaderboard route BEFORE the :id route to avoid conflict
  @Get('leaderboard')
  async getLeaderboard(@Query('gameType') gameType?: string) {
    try {
      const leaderboard = await this.userService.getLeaderboard(10, gameType);
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
}

// // src/user/user.controller.ts
// import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
// import { UserService } from './user.service';

// @Controller('user')
// export class UserController {
//   constructor(private readonly userService: UserService) {}

//   @Post('login-or-register')
//   async loginOrRegister(@Body() body: { username: string }) {
//     const { username } = body;
    
//     if (!username || !username.trim()) {
//       throw new Error('Username is required');
//     }

//     // Check if user exists, if not create them
//     let user = await this.userService.findByUsername(username);
    
//     if (!user) {
//       user = await this.userService.create({ username });
//     }

//     return {
//       _id: user._id,
//       username: user.username,
//       createdAt: user.createdAt,
//     };
//   }

//   @Get(':id')
//   async getUser(@Param('id') id: string) {
//     return this.userService.findById(id);
//   }

//   @Get('leaderboard')
//   async getLeaderboard(@Query('gameType') gameType?: string) {
//     return this.userService.getLeaderboard(10, gameType);
//   }

//   @Get(':id/stats')
//   async getUserStats(@Param('id') id: string) {
//     return this.userService.getUserStats(id);
//   }

  
// }