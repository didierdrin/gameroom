// src/game/game.module.ts
import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { GameRoom, GameRoomSchema } from './schemas/game-room.schema';
import { GameSessionEntity, GameSessionSchema } from './schemas/game-session.schema';
import { RedisModule } from '../redis/redis.module';
import { TriviaService } from '../trivia/trivia.service';
import { UserModule } from '../user/user.module';
import { ChessModule } from '../chess/chess.module';

@Module({
  imports: [    
    MongooseModule.forFeature([
      { name: GameRoom.name, schema: GameRoomSchema },
      { name: GameSessionEntity.name, schema: GameSessionSchema },
    ]), 
    RedisModule,
    UserModule, 
    ChessModule,
  ],
  controllers: [GameController],
  providers: [
    GameService, 
    GameGateway, 
    TriviaService,
],
  exports: [GameService],
})
export class GameModule {}

// // src/game/game.module.ts
// import { Module } from '@nestjs/common';
// import { GameController } from './game.controller';
// import { GameService } from './game.service';
// import { GameGateway } from './game.gateway';
// import { MongooseModule } from '@nestjs/mongoose';
// import { GameRoom, GameRoomSchema } from './schemas/game-room.schema';
// import { GameSessionEntity, GameSessionSchema } from './schemas/game-session.schema';
// import { RedisModule } from '../redis/redis.module';
// import { TriviaService } from '../trivia/trivia.service';
// import { UserModule } from '../user/user.module';
// @Module({
//   imports: [    
//     MongooseModule.forFeature([
//       { name: GameRoom.name, schema: GameRoomSchema },
//       { name: GameSessionEntity.name, schema: GameSessionSchema },
//     ]), 
//     RedisModule,
//     UserModule, 
//   ],
//   controllers: [GameController],
//   providers: [
//     GameService, 
//     GameGateway, 
//     TriviaService,
// ],
//   exports: [GameService],
// })
// export class GameModule {}





