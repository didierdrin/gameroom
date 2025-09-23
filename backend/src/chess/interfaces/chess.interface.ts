// chess.interface.ts
export interface ChessPlayer {
    id: string;
    name?: string;
    chessColor: 'white' | 'black';
  }
  
  export interface ChessState {
    board: string; // FEN
    moves: string[];
  }
  
  export interface ChessGameDocument {
    roomId: string;
    players: ChessPlayer[];
    chessState: ChessState;
    currentTurn: string;
    gameStarted: boolean;
    gameOver: boolean;
    winner?: string;
    winCondition?: string;
  }