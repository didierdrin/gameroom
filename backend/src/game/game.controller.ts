// src/game/game.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { GameService } from './game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get(':roomId')
  async getGameRoom(@Param('roomId') roomId: string) {
    return this.gameService.getGameRoomById(roomId);
  }

  @Get(':roomId/score')
  async getGameScores(@Param('roomId') roomId: string) {
    return this.gameService.getScores(roomId);
  }
}
