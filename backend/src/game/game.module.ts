// src/game/game.module.ts
import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { MongooseModule } from '@nestjs/mongoose';
import { GameRoom, GameRoomSchema } from './schemas/game-room.schema';
import { GameSessionEntity, GameSessionSchema } from './schemas/game-session.schema';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    RedisModule,
    MongooseModule.forFeature([
      { name: GameRoom.name, schema: GameRoomSchema },
      { name: GameSessionEntity.name, schema: GameSessionSchema },
    ]),
  ],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}




// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { RedisModule } from '../redis/redis.module';

// @Module({
//   imports: [
//     MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ludo'),
//     RedisModule,
//   ],
// })
// export class AppModule {}





