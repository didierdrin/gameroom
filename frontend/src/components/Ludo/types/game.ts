export interface Player {
    id: string;
    name: string;
    color: string;
    coins: number[];
  }
  
  export interface GameState {
    roomId: string;
    players: Player[];
    currentTurn: string;
    currentPlayer: number;
    diceValue: number;
    diceRolled: boolean;
    coins: Record<string, number[]>;
    gameStarted: boolean;
    gameOver: boolean;
    winner: string | null;
    roomName: string;
    gameType: string;
  }