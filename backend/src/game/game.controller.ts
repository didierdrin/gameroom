// src/game/game.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { GameService } from './game.service';

@Controller()
export class GameController {
  constructor(private readonly gameService: GameService) {}

  // Add this new endpoint
  @Get('gamerooms')
  async getAllGameRooms() {
    return this.gameService.getAllGameRooms();
  }

  @Get('game/:roomId')
  async getGameRoom(@Param('roomId') roomId: string) {
    return this.gameService.getGameRoomById(roomId);
  }

  @Get('game/:roomId/score')
  async getGameScores(@Param('roomId') roomId: string) {
    return this.gameService.getScores(roomId);
  }
}
