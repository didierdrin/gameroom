import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chess } from 'chess.js';
import { ChessGame, ChessGameDocument } from './interfaces/chess.interface';
import { SelectChessPlayersDto, MakeChessMoveDto } from './dto/chess.dto';
import { ChessPlayer } from './interfaces/chess.interface';

@Injectable()
export class ChessService {
  private chessInstances: Map<string, Chess> = new Map();

  constructor(
    @InjectModel('ChessGame') private chessModel: Model<ChessGame>,
  ) {}

  // Add this method to handle integration with game rooms
  async initializeChessRoom(roomId: string): Promise<ChessGameDocument> {
    const existingGame = await this.chessModel.findOne({ roomId });
    if (existingGame) {
      return existingGame;
    }

    const game = new this.chessModel({
      roomId,
      players: [],
      chessState: { 
        board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 
        moves: [] 
      },
      currentTurn: '',
      gameStarted: false,
      gameOver: false,
    });

    await game.save();
    return game;
  }

  // Add this method to get chess state for integration
  async getChessState(roomId: string): Promise<{
    board: string;
    moves: string[];
    currentTurn: string;
    gameStarted: boolean;
    gameOver: boolean;
    winner?: string;
    winCondition?: string;
    players: ChessPlayer[];
  }> {
    const game = await this.chessModel.findOne({ roomId });
    if (!game) {
      // Return default state if game not found
      return {
        board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moves: [],
        currentTurn: '',
        gameStarted: false,
        gameOver: false,
        players: []
      };
    }

    return {
      board: game.chessState.board,
      moves: game.chessState.moves,
      currentTurn: game.currentTurn,
      gameStarted: game.gameStarted,
      gameOver: game.gameOver,
      winner: game.winner,
      winCondition: game.winCondition,
      players: game.players
    };
  }

  // Enhanced selectChessPlayers to validate against game room
  async selectChessPlayers(dto: SelectChessPlayersDto): Promise<ChessGameDocument> {
    let game = await this.chessModel.findOne({ roomId: dto.roomId });

    if (!game) {
      game = await this.initializeChessRoom(dto.roomId);
    }

    if (game.players.length > 0) {
      throw new BadRequestException('Players already selected');
    }

    if (dto.player1Id === dto.player2Id) {
      throw new BadRequestException('Cannot select the same player for both sides');
    }

    const players: ChessPlayer[] = [
      { id: dto.player1Id, chessColor: 'white' },
      { id: dto.player2Id, chessColor: 'black' },
    ];

    game.players = players;
    game.currentTurn = dto.player1Id; // White starts

    await game.save();

    // Initialize chess instance for this room
    this.chessInstances.set(dto.roomId, new Chess());

    return game;
  }

  async startChessGame(roomId: string): Promise<ChessGameDocument> {
    const game = await this.chessModel.findOne({ roomId });

    if (!game) {
      throw new BadRequestException('Game not found');
    }

    if (game.gameStarted) {
      throw new BadRequestException('Game already started');
    }

    if (game.players.length !== 2) {
      throw new BadRequestException('Players not selected');
    }

    game.gameStarted = true;
    await game.save();

    return game;
  }

  async makeMove(dto: MakeChessMoveDto): Promise<{ 
    success: boolean; 
    game: ChessGameDocument;
    moveDetails?: any;
  }> {
    const game = await this.chessModel.findOne({ roomId: dto.roomId });

    if (!game) {
      throw new BadRequestException('Game not found');
    }

    if (!game.gameStarted || game.gameOver) {
      throw new BadRequestException('Game not active');
    }

    if (game.currentTurn !== dto.playerId) {
      throw new BadRequestException('Not your turn');
    }

    let chess = this.chessInstances.get(dto.roomId);
    if (!chess) {
      chess = new Chess(game.chessState.board);
      this.chessInstances.set(dto.roomId, chess);
    }

    try {
      const moveResult = chess.move(dto.move);
      if (!moveResult) {
        throw new Error('Invalid move');
      }

      game.chessState.board = chess.fen();
      game.chessState.moves.push(dto.move);

      // Switch turn
      const nextPlayer = game.players.find(p => p.id !== dto.playerId);
      if (nextPlayer) {
        game.currentTurn = nextPlayer.id;
      } else {
        throw new Error('Next player not found');
      }

      // Check game over conditions
      if (chess.isGameOver()) {
        game.gameOver = true;
        if (chess.isCheckmate()) {
          game.winner = dto.playerId;
          game.winCondition = 'checkmate';
        } else if (chess.isStalemate()) {
          game.winner = 'draw';
          game.winCondition = 'stalemate';
        } else if (chess.isDraw()) {
          game.winner = 'draw';
          game.winCondition = 'draw';
        } else if (chess.isInsufficientMaterial()) {
          game.winner = 'draw';
          game.winCondition = 'insufficient material';
        } else if (chess.isThreefoldRepetition()) {
          game.winner = 'draw';
          game.winCondition = 'threefold repetition';
        }
      }

      await game.save();

      return { 
        success: true, 
        game,
        moveDetails: {
          from: moveResult.from,
          to: moveResult.to,
          piece: moveResult.piece,
          captured: moveResult.captured,
          promotion: moveResult.promotion,
          san: moveResult.san
        }
      };
    } catch (error) {
      throw new BadRequestException(`Invalid move: ${error.message}`);
    }
  }

  async getChessGame(roomId: string): Promise<ChessGameDocument> {
    const game = await this.chessModel.findOne({ roomId });
    if (!game) {
      // Auto-initialize if not found
      return await this.initializeChessRoom(roomId);
    }
    return game;
  }

  async resetGame(roomId: string): Promise<ChessGameDocument> {
    const game = await this.chessModel.findOne({ roomId });

    if (!game) {
      throw new BadRequestException('Game not found');
    }

    game.chessState = { 
      board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 
      moves: [] 
    };
    game.currentTurn = game.players.find(p => p.chessColor === 'white')?.id || '';
    game.gameStarted = false;
    game.gameOver = false;
    game.winner = undefined;
    game.winCondition = undefined;

    await game.save();

    this.chessInstances.delete(roomId);

    return game;
  }
}


// // Add these methods to /chess/chess.service.ts to integrate with game rooms:

// import { Injectable, BadRequestException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { Chess } from 'chess.js';
// import { ChessGameDocument } from './interfaces/chess.interface';
// import { SelectChessPlayersDto, MakeChessMoveDto } from './dto/chess.dto';
// import { ChessPlayer } from './interfaces/chess.interface';

// @Injectable()
// export class ChessService {
//   private chessInstances: Map<string, Chess> = new Map();

//   constructor(
//     @InjectModel('ChessGame') private chessModel: Model<ChessGameDocument>,
//   ) {}

//   // Add this method to handle integration with game rooms
//   async initializeChessRoom(roomId: string): Promise<ChessGameDocument> {
//     const existingGame = await this.chessModel.findOne({ roomId });
//     if (existingGame) {
//       return existingGame;
//     }

//     const game = new this.chessModel({
//       roomId,
//       players: [],
//       chessState: { 
//         board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 
//         moves: [] 
//       },
//       currentTurn: '',
//       gameStarted: false,
//       gameOver: false,
//     });

//     await game.save();
//     return game;
//   }

//   // Add this method to get chess state for integration
//   async getChessState(roomId: string): Promise<{
//     board: string;
//     moves: string[];
//     currentTurn: string;
//     gameStarted: boolean;
//     gameOver: boolean;
//     winner?: string;
//     winCondition?: string;
//     players: ChessPlayer[];
//   }> {
//     const game = await this.chessModel.findOne({ roomId });
//     if (!game) {
//       // Return default state if game not found
//       return {
//         board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
//         moves: [],
//         currentTurn: '',
//         gameStarted: false,
//         gameOver: false,
//         players: []
//       };
//     }

//     return {
//       board: game.chessState.board,
//       moves: game.chessState.moves,
//       currentTurn: game.currentTurn,
//       gameStarted: game.gameStarted,
//       gameOver: game.gameOver,
//       winner: game.winner,
//       winCondition: game.winCondition,
//       players: game.players
//     };
//   }

//   // Enhanced selectChessPlayers to validate against game room
//   async selectChessPlayers(dto: SelectChessPlayersDto): Promise<ChessGameDocument> {
//     let game = await this.chessModel.findOne({ roomId: dto.roomId });

//     if (!game) {
//       game = await this.initializeChessRoom(dto.roomId);
//     }

//     if (game.players.length > 0) {
//       throw new BadRequestException('Players already selected');
//     }

//     if (dto.player1Id === dto.player2Id) {
//       throw new BadRequestException('Cannot select the same player for both sides');
//     }

//     const players: ChessPlayer[] = [
//       { id: dto.player1Id, chessColor: 'white' },
//       { id: dto.player2Id, chessColor: 'black' },
//     ];

//     game.players = players;
//     game.currentTurn = dto.player1Id; // White starts

//     await game.save();

//     // Initialize chess instance for this room
//     this.chessInstances.set(dto.roomId, new Chess());

//     return game;
//   }

//   async startChessGame(roomId: string): Promise<ChessGameDocument> {
//     const game = await this.chessModel.findOne({ roomId });

//     if (!game) {
//       throw new BadRequestException('Game not found');
//     }

//     if (game.gameStarted) {
//       throw new BadRequestException('Game already started');
//     }

//     if (game.players.length !== 2) {
//       throw new BadRequestException('Players not selected');
//     }

//     game.gameStarted = true;
//     await game.save();

//     return game;
//   }

//   async makeMove(dto: MakeChessMoveDto): Promise<{ 
//     success: boolean; 
//     game: ChessGameDocument;
//     moveDetails?: any;
//   }> {
//     const game = await this.chessModel.findOne({ roomId: dto.roomId });

//     if (!game) {
//       throw new BadRequestException('Game not found');
//     }

//     if (!game.gameStarted || game.gameOver) {
//       throw new BadRequestException('Game not active');
//     }

//     if (game.currentTurn !== dto.playerId) {
//       throw new BadRequestException('Not your turn');
//     }

//     let chess = this.chessInstances.get(dto.roomId);
//     if (!chess) {
//       chess = new Chess(game.chessState.board);
//       this.chessInstances.set(dto.roomId, chess);
//     }

//     try {
//       const moveResult = chess.move(dto.move);
//       if (!moveResult) {
//         throw new Error('Invalid move');
//       }

//       game.chessState.board = chess.fen();
//       game.chessState.moves.push(dto.move);

//       // Switch turn
//       const nextPlayer = game.players.find(p => p.id !== dto.playerId);
//       if (nextPlayer) {
//         game.currentTurn = nextPlayer.id;
//       } else {
//         throw new Error('Next player not found');
//       }

//       // Check game over conditions
//       if (chess.isGameOver()) {
//         game.gameOver = true;
//         if (chess.isCheckmate()) {
//           game.winner = dto.playerId;
//           game.winCondition = 'checkmate';
//         } else if (chess.isStalemate()) {
//           game.winner = 'draw';
//           game.winCondition = 'stalemate';
//         } else if (chess.isDraw()) {
//           game.winner = 'draw';
//           game.winCondition = 'draw';
//         } else if (chess.isInsufficientMaterial()) {
//           game.winner = 'draw';
//           game.winCondition = 'insufficient material';
//         } else if (chess.isThreefoldRepetition()) {
//           game.winner = 'draw';
//           game.winCondition = 'threefold repetition';
//         }
//       }

//       await game.save();

//       return { 
//         success: true, 
//         game,
//         moveDetails: {
//           from: moveResult.from,
//           to: moveResult.to,
//           piece: moveResult.piece,
//           captured: moveResult.captured,
//           promotion: moveResult.promotion,
//           san: moveResult.san
//         }
//       };
//     } catch (error) {
//       throw new BadRequestException(`Invalid move: ${error.message}`);
//     }
//   }

//   async getChessGame(roomId: string): Promise<ChessGameDocument> {
//     const game = await this.chessModel.findOne({ roomId });
//     if (!game) {
//       // Auto-initialize if not found
//       return await this.initializeChessRoom(roomId);
//     }
//     return game;
//   }

//   async resetGame(roomId: string): Promise<ChessGameDocument> {
//     const game = await this.chessModel.findOne({ roomId });

//     if (!game) {
//       throw new BadRequestException('Game not found');
//     }

//     game.chessState = { 
//       board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 
//       moves: [] 
//     };
//     game.currentTurn = game.players.find(p => p.chessColor === 'white')?.id || '';
//     game.gameStarted = false;
//     game.gameOver = false;
//     game.winner = undefined;
//     game.winCondition = undefined;

//     await game.save();

//     this.chessInstances.delete(roomId);

//     return game;
//   }
// }

