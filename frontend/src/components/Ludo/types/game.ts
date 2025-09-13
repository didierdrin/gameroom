
export interface Player {
  id: string;
  name: string;
  color?: string;
  coins?: number[];
  score?: number;
  chessColor?: 'white' | 'black';
  isSpectator?: boolean;
}
  
  export interface ChessState {
    board: string;
    moves: string[];
    capturedPieces?: string[];
  }
  
  export interface KahootState {
    currentQuestionIndex: number;
    questions: { id: string; text: string; options: string[]; correctAnswer: number }[];
    scores: Record<string, number>;
    answers: Record<string, number | null>;
    questionTimer: number;
  }

  // export interface GameState {
  //   roomId: string;
  //   players: Player[];
  //   currentTurn: string;
  //   currentPlayer: number;
  //   diceValue: number;
  //   diceRolled: boolean;
  //   coins: Record<string, number[]>;
  //   gameStarted: boolean;
  //   gameOver: boolean;
  //   winner: string | null;
  //   roomName: string;
  //   gameType: string;
  // }

  export interface GameState {
    roomId: string;
    players: Player[];
    currentTurn: string;
    currentPlayer: number;
    gameStarted: boolean;
    gameOver: boolean;
    winner: string | null;
    roomName: string;
    gameType: string;
    diceValue?: number;
    diceRolled?: boolean;
    consecutiveSixes?: number;
    coins?: Record<string, number[]>;
    chessState?: ChessState;
    chessPlayers?: { player1Id: string; player2Id: string };
    kahootState?: KahootState;
    host?: string;
  }