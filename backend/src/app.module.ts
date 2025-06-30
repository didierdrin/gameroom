// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { GameModule } from './game/game.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI), // e.g. mongodb://localhost:27017/ludo
    RedisModule.forRoot({
      config: {
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      },
    }),
    GameModule,
  ],
})
export class AppModule {}
