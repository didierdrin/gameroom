import { Global, Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { FirebaseAdminService } from './firebase-admin.service';
import { NotificationService } from './notification.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [FirebaseAdminService, NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
