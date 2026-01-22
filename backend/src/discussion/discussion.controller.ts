import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DiscussionService } from './discussion.service';

@Controller('discussions')
export class DiscussionController {
  constructor(private readonly discussionService: DiscussionService) {}

  @Get('user/:userId')
  async getConversations(@Param('userId') userId: string) {
    try {
      const conversations = await this.discussionService.getConversations(userId);
      return { success: true, data: conversations };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Get(':conversationId/user/:userId')
  async getConversation(
    @Param('conversationId') conversationId: string,
    @Param('userId') userId: string
  ) {
    try {
      const conversation = await this.discussionService.getConversation(userId, conversationId);
      return { success: true, data: conversation };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Post('create')
  async createConversation(
    @Body() body: { userId: string; name: string; participants: string[] }
  ) {
    try {
      const conversation = await this.discussionService.createConversation(
        body.userId,
        body.name,
        body.participants
      );
      return { success: true, data: conversation };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Post(':conversationId/message')
  async addMessage(
    @Param('conversationId') conversationId: string,
    @Body() body: { senderId: string; content: string }
  ) {
    try {
      const conversation = await this.discussionService.addMessage(
        conversationId,
        body.senderId,
        body.content
      );
      return { success: true, data: conversation };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
