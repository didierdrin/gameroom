// // src/game/game.module.ts

import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { MongooseModule } from '@nestjs/mongoose';
import { GameRoom, GameRoomSchema } from './schemas/game-room.schema';
import { GameSessionEntity, GameSessionSchema } from './schemas/game-session.schema';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameRoom.name, schema: GameRoomSchema },
      { name: GameSessionEntity.name, schema: GameSessionSchema },
    ]),
    RedisModule,
  ],
  providers: [GameGateway, GameService],
})
export class GameModule {}


// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { GameGateway } from './game.gateway';
// import { GameService } from './game.service';
// import { GameRoom, GameRoomSchema } from './schemas/game.schema';
// import { RedisService } from '../redis/redis.service';

// @Module({
//   imports: [
//     MongooseModule.forFeature([{ name: GameRoom.name, schema: GameRoomSchema }]),
//   ],
//   providers: [GameGateway, GameService, RedisService],
// })
// export class GameModule {}
