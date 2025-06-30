export class CreateGameDto {
    readonly name: string;
    readonly hostId: string;
    readonly isPrivate: boolean;
    readonly password?: string;
  }
  
  export class JoinGameDto {
    readonly roomId: string;
    readonly playerId: string;
    readonly password?: string;
  }
  
  export class RollDiceDto {
    readonly roomId: string;
    readonly playerId: string;
  }
  
  export class MoveCoinDto {
    readonly roomId: string;
    readonly playerId: string;
    readonly coinId: string;
  }