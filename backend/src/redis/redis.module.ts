import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { GameController } from 'src/game/game.controller';

@Module({
  providers: [RedisService],
  exports: [RedisService],
  controllers: [GameController],
})
export class RedisModule {}
export class GameModule {}
