// src/game/game.module.ts
import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { GameRoom, GameRoomSchema } from './schemas/game-room.schema';
import { GameSessionEntity, GameSessionSchema } from './schemas/game-session.schema';
import { RedisModule } from '../redis/redis.module';
import { TriviaService } from 'src/trivia/trivia.service';
import { Server } from 'socket.io';
@Module({
  imports: [
    RedisModule,
    MongooseModule.forFeature([
      { name: GameRoom.name, schema: GameRoomSchema },
      { name: GameSessionEntity.name, schema: GameSessionSchema },
    ]),
  ],
  controllers: [GameController],
  providers: [
    GameService, 
    GameGateway, 
    TriviaService, 
    {
    provide: 'GameGatewayServer', // Custom token for Server
    useFactory: (gameGateway: GameGateway) => gameGateway.server, // Use Server from GameGateway
    inject: [GameGateway],
    },
],
  exports: [GameService],
})
export class GameModule {}





