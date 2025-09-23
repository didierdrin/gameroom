// chess.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChessService } from './chess.service';
import { ChessGateway } from './chess.gateway';
import { ChessController } from './chess.controller';
import { ChessGameSchema } from './schemas/chess.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'ChessGame', schema: ChessGameSchema }]),
  ],
  controllers: [ChessController],
  providers: [ChessService, ChessGateway],
})
export class ChessModule {}