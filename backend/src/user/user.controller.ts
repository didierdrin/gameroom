// src/user/user.controller.ts
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
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

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.userService.findById(id);
  }
}