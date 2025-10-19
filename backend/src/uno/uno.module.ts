import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UnoService } from './uno.service';
import { UnoGateway } from './uno.gateway';
import { UnoController } from './uno.controller';
import { GameRoom, GameRoomSchema } from '../game/schemas/game-room.schema';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameRoom.name, schema: GameRoomSchema },
    ]),
    RedisModule,
  ],
  providers: [UnoService, UnoGateway],
  controllers: [UnoController],
  exports: [UnoService],
})
export class UnoModule {}