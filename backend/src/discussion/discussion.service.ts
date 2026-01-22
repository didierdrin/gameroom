import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Discussion, DiscussionDocument } from './schemas/discussion.schema';

@Injectable()
export class DiscussionService {
  constructor(
    @InjectModel(Discussion.name) private discussionModel: Model<DiscussionDocument>,
  ) {}

  async getConversations(userId: string) {
    return this.discussionModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .populate('participants', 'username avatar')
      .exec();
  }

  async getConversation(userId: string, conversationId: string) {
    return this.discussionModel
      .findOne({ _id: conversationId, userId })
      .populate('participants', 'username avatar')
      .populate('messages.sender', 'username avatar')
      .exec();
  }

  async createConversation(userId: string, name: string, participants: string[]) {
    const conversation = new this.discussionModel({
      userId,
      name,
      participants,
      messages: [],
      lastMessage: '',
      timestamp: new Date(),
      unread: 0
    });
    return conversation.save();
  }

  async addMessage(conversationId: string, senderId: string, content: string) {
    const conversation = await this.discussionModel.findByIdAndUpdate(
      conversationId,
      {
        $push: {
          messages: {
            sender: senderId,
            content,
            timestamp: new Date()
          }
        },
        lastMessage: content,
        timestamp: new Date()
      },
      { new: true }
    ).populate('messages.sender', 'username avatar');
    
    return conversation;
  }
}
