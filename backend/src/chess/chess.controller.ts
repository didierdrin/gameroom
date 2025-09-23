// chess.controller.ts
import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ChessService } from './chess.service';
import { SelectChessPlayersDto } from './dto/chess.dto';

@Controller('chess')
export class ChessController {
  constructor(private chessService: ChessService) {}

  @Get(':roomId')
  async getGame(@Param('roomId') roomId: string) {
    return this.chessService.getChessGame(roomId);
  }

  @Post('select-players')
  async selectPlayers(@Body() dto: SelectChessPlayersDto) {
    return this.chessService.selectChessPlayers(dto);
  }
}