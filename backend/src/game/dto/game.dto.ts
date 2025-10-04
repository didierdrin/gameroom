export interface CreateGameDto {
  name: string;
  gameType: string;
  maxPlayers?: number;
  isPrivate: boolean;
  password?: string;
  scheduledTimeCombined?: string;
  hostId: string;
  description?: string;
  enableVideoChat?: boolean;
  enableVoiceChat?: boolean;
  allowSpectators?: boolean;
  triviaSettings?: {
    questionCount: number;
    difficulty: string;
    category: string;
  };
}
  
  export class JoinGameDto {
    readonly roomId: string;
    readonly playerId: string;
    readonly playerName: string;
    readonly password?: string;
    readonly scheduledTime?: string;
    readonly joinAsPlayer?: boolean; 
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