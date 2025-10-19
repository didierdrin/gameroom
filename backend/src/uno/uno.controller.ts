import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { UnoService } from './uno.service';

@Controller('uno')
export class UnoController {
  constructor(private readonly unoService: UnoService) {}

  @Get(':roomId')
  async getGameState(@Param('roomId') roomId: string) {
    return this.unoService.getGameState(roomId);
  }

  @Post(':roomId/restart')
  async restartGame(@Param('roomId') roomId: string) {
    return this.unoService.restartGame(roomId);
  }
}