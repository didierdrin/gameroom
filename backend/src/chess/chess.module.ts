// /chess/chess.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChessService } from './chess.service';
import { ChessGateway } from './chess.gateway';
import { ChessGame, ChessGameSchema } from './schemas/chess.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChessGame.name, schema: ChessGameSchema }
    ]),
  ],
  providers: [ChessService, ChessGateway],
  exports: [ChessService], // Export so it can be used in GameModule
})
export class ChessModule {}

