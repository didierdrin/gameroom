import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Discussion, DiscussionDocument } from './schemas/discussion.schema';
import { NotificationService } from '../notifications/notification.service';
import { UserService } from '../user/user.service';

@Injectable()
export class DiscussionService {
  constructor(
    @InjectModel(Discussion.name) private discussionModel: Model<DiscussionDocument>,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
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
    const conversation = await this.discussionModel
      .findByIdAndUpdate(
        conversationId,
        {
          $push: {
            messages: {
              sender: senderId,
              content,
              timestamp: new Date(),
            },
          },
          lastMessage: content,
          timestamp: new Date(),
        },
        { new: true },
      )
      .populate('messages.sender', 'username avatar')
      .populate('participants', 'username');

    if (!conversation) return null;

    const sender = await this.userService.findById(senderId);
    const senderName = sender?.username || 'Someone';

    const participantIds = (conversation.participants || []).map((p: any) =>
      String(p?._id ?? p),
    );
    const recipients = participantIds.filter((id) => id !== String(senderId));

    await Promise.all(
      recipients.map((pid) =>
        this.notificationService.notifyPlayer(pid, 'DISCUSSION_MESSAGE', {
          conversationId,
          senderName,
          preview: content,
        }),
      ),
    );

    return conversation;
  }
}
