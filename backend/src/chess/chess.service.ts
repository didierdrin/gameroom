// chess.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chess } from 'chess.js';
import { ChessGameDocument } from './interfaces/chess.interface';
import { SelectChessPlayersDto, MakeChessMoveDto } from './dto/chess.dto';
import { ChessPlayer } from './interfaces/chess.interface';

@Injectable()
export class ChessService {
  private chessInstances: Map<string, Chess> = new Map();

  constructor(
    @InjectModel('ChessGame') private chessModel: Model<ChessGameDocument>,
  ) {}

  async selectChessPlayers(dto: SelectChessPlayersDto): Promise<ChessGameDocument> {
    let game = await this.chessModel.findOne({ roomId: dto.roomId });

    if (!game) {
      game = new this.chessModel({
        roomId: dto.roomId,
        players: [],
        chessState: { board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [] },
        currentTurn: '',
        gameStarted: false,
        gameOver: false,
      });
    }

            if (game.players.length > 0) {
                throw new BadRequestException('Players already selected');
            }

            const players: ChessPlayer[] = [
                { id: dto.player1Id, chessColor: 'white' },
                { id: dto.player2Id, chessColor: 'black' },
            ];

            game.players = players;
            game.currentTurn = dto.player1Id; // White starts

    await game.save();

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

  async makeMove(dto: MakeChessMoveDto): Promise<{ success: boolean; game: ChessGameDocument }> {
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
        throw new Error();
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

      // Check game over
      if (chess.isGameOver()) {
        game.gameOver = true;
        if (chess.isCheckmate()) {
          game.winner = dto.playerId; // The player who just moved wins
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

      return { success: true, game };
    } catch (error) {
      throw new BadRequestException('Invalid move');
    }
  }

  async getChessGame(roomId: string): Promise<ChessGameDocument> {
    const game = await this.chessModel.findOne({ roomId });
    if (!game) {
      throw new BadRequestException('Game not found');
    }
    return game;
  }

  async resetGame(roomId: string): Promise<ChessGameDocument> {
    const game = await this.chessModel.findOne({ roomId });

    if (!game) {
      throw new BadRequestException('Game not found');
    }

    game.chessState = { board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [] };
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