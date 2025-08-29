export class CreateGameDto {
    readonly name: string;
    readonly hostId: string;
    readonly isPrivate: boolean;
    readonly password?: string;
    scheduledTimeCombined?: string | Date;
    readonly gameType: string;
    readonly triviaTopic?: string; 
  }
  
  export class JoinGameDto {
    readonly roomId: string;
    readonly playerId: string;
    readonly playerName: string;
    readonly password?: string;
    readonly scheduledTime?: string;
    readonly joinAsPlayer?: boolean; // Add this new field
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