// chess.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class SelectChessPlayersDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  player1Id: string;

  @IsString()
  @IsNotEmpty()
  player2Id: string;

  @IsString()
  @IsNotEmpty()
  hostId: string;
}

export class MakeChessMoveDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  playerId: string;

  @IsString()
  @IsNotEmpty()
  move: string;
}