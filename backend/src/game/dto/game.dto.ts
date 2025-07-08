export class CreateGameDto {
    readonly name: string;
    readonly hostId: string;
    readonly isPrivate: boolean;
    readonly password?: string;
    scheduledTimeCombined?: string | Date;
    readonly gameType: string;
  }
  
  export class JoinGameDto {
    readonly roomId: string;
    readonly playerId: string;
    readonly playerName: string;
    readonly password?: string;
    readonly scheduledTime?: string;
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