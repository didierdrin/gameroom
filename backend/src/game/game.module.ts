// src/game/game.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { GameRoom, GameRoomSchema } from './schemas/game-room.schema';
import { GameSessionEntity, GameSessionSchema } from './schemas/game-session.schema';
import { RedisModule } from '../redis/redis.module';
import { TriviaService } from '../trivia/trivia.service'
import { EnhancedTriviaService } from '../trivia/enhanced-trivia.service';
import { UserModule } from '../user/user.module';
import { ChessModule } from '../chess/chess.module';
import { TriviaModule } from '../trivia/trivia.module'; 
import { UnoModule } from 'src/uno/uno.module';

@Module({
  imports: [    
    MongooseModule.forFeature([
      { name: GameRoom.name, schema: GameRoomSchema },
      { name: GameSessionEntity.name, schema: GameSessionSchema },
    ]), 
    forwardRef(() => TriviaModule),
    RedisModule,
    UserModule, 
    ChessModule,
    UnoModule, 
  ],
  controllers: [GameController],
  providers: [
    GameService, 
    GameGateway, 
    TriviaService,
    EnhancedTriviaService, 
],
  exports: [GameService],
})
export class GameModule {}
