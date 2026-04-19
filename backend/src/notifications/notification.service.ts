import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { FirebaseAdminService } from './firebase-admin.service';

export type PushEventType =
  | 'PLAYER_JOINED_ROOM'
  | 'SPECTATOR_JOINED_ROOM'
  | 'DISCUSSION_MESSAGE';

const TTL_SEC = 60 * 60 * 24 * 30;

const TEMPLATES: Record<
  PushEventType,
  (d: Record<string, string>) => { title: string; body: string }
> = {
  PLAYER_JOINED_ROOM: ({ joinerName, roomName }) => ({
    title: 'Player joined your game',
    body: `${joinerName || 'Someone'} joined ${roomName || 'a game room'}`,
  }),
  SPECTATOR_JOINED_ROOM: ({ joinerName, roomName }) => ({
    title: 'Spectator joined',
    body: `${joinerName || 'Someone'} is watching ${roomName || 'your room'}`,
  }),
  DISCUSSION_MESSAGE: ({ senderName, preview }) => ({
    title: `Message from ${senderName || 'someone'}`,
    body: preview?.slice(0, 120) || 'New message',
  }),
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly firebaseAdmin: FirebaseAdminService,
  ) {}

  private tokenKey(playerId: string) {
    return `fcm:tokens:${playerId}`;
  }

  async saveToken(playerId: string, token: string) {
    if (!playerId || !token) return;
    const key = this.tokenKey(playerId);
    await this.redis.sAdd(key, token);
    await this.redis.expire(key, TTL_SEC);
  }

  async notifyPlayer(
    playerId: string,
    type: PushEventType,
    templateData: Record<string, string | number | undefined | null>,
  ) {
    const messaging = this.firebaseAdmin.messaging();
    if (!messaging) return;

    const tokens = await this.redis.sMembers(this.tokenKey(playerId));
    if (!tokens.length) return;

    const flat: Record<string, string> = Object.fromEntries(
      Object.entries(templateData).map(([k, v]) => [k, v == null ? '' : String(v)]),
    );

    const tmpl = TEMPLATES[type];
    if (!tmpl) return;
    const { title, body } = tmpl(flat);

    const data: Record<string, string> = {
      type,
      ...flat,
    };

    const baseUrl =
      process.env.FRONTEND_PUBLIC_URL ||
      process.env.VITE_APP_URL ||
      'http://localhost:5173';

    let link = baseUrl.replace(/\/$/, '');
    if (type === 'DISCUSSION_MESSAGE' && flat.conversationId) {
      link = `${link}/discussions`;
    } else if (flat.roomId) {
      link = `${link}/game-room/${flat.roomId}`;
    }

    try {
      const res = await messaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
        data,
        webpush: {
          headers: { Urgency: 'high' },
          fcmOptions: { link },
        },
      });

      for (let i = 0; i < res.responses.length; i++) {
        const r = res.responses[i];
        if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
          await this.redis.sRem(this.tokenKey(playerId), tokens[i]);
        }
      }
    } catch (e) {
      this.logger.warn(`FCM send failed for ${playerId}: ${(e as Error).message}`);
    }
  }
}
