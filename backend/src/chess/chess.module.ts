// /chess/chess.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChessService } from './chess.service';
import { ChessGateway } from './chess.gateway';
import { ChessGame, ChessGameSchema } from './schemas/chess.schema';
import { GameRoom, GameRoomSchema } from '../game/schemas/game-room.schema';
import { forwardRef } from '@nestjs/common';
import { GameModule } from '../game/game.module';

@Module({
  imports: [
    forwardRef(() => GameModule),
    MongooseModule.forFeature([
      { name: ChessGame.name, schema: ChessGameSchema },
      { name: GameRoom.name, schema: GameRoomSchema },
    ]),
  ],
  providers: [ChessService, ChessGateway],
  exports: [ChessService, ChessGateway],
})
export class ChessModule {}

