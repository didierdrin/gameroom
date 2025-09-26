// chess.service.ts 
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chess } from 'chess.js';
import { ChessGame, ChessGameDocument } from './interfaces/chess.interface';
import { SelectChessPlayersDto, MakeChessMoveDto } from './dto/chess.dto';
import { ChessPlayer } from './interfaces/chess.interface';
import { GameRoom } from '../game/schemas/game-room.schema';

@Injectable()
export class ChessService {
  private chessInstances: Map<string, Chess> = new Map();

  constructor(
    @InjectModel('ChessGame') private chessModel: Model<ChessGame>,
    @InjectModel(GameRoom.name) private gameRoomModel: Model<GameRoom>,
  ) {}

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

  async selectChessPlayers(dto: SelectChessPlayersDto): Promise<ChessGameDocument> {
    let game = await this.chessModel.findOne({ roomId: dto.roomId });

    if (!game) {
      try {
        game = await this.initializeChessRoom(dto.roomId);
      } catch (error) {
        if (error.code === 11000) { // duplicate key error
          // Race condition, find again
          game = await this.chessModel.findOne({ roomId: dto.roomId });
          if (!game) {
            throw error;
          }
        } else {
          throw error;
        }
      }
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

    // Update GameRoom to set selected players as players and others as spectators
    const gameRoom = await this.gameRoomModel.findOne({ roomId: dto.roomId });
    if (gameRoom) {
      const selectedIds = [dto.player1Id, dto.player2Id];
      const allCurrentIds = [...(gameRoom.playerIds || []), ...(gameRoom.spectatorIds || [])];
      const newPlayerIds = selectedIds.filter(id => allCurrentIds.includes(id));
      const newSpectatorIds = allCurrentIds.filter(id => !newPlayerIds.includes(id));

      gameRoom.playerIds = newPlayerIds;
      gameRoom.spectatorIds = [...new Set(newSpectatorIds)];

      await gameRoom.save();
    }

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
  nextTurn?: string;
}> {
  const game = await this.chessModel.findOne({ roomId: dto.roomId });

  if (!game) {
    throw new BadRequestException('Game not found');
  }

  if (!game.gameStarted || game.gameOver) {
    throw new BadRequestException('Game not active');
  }

  // Log current state
  console.log('===== CHESS MOVE START =====');
  console.log('Current game state:', {
    currentTurn: game.currentTurn,
    playerId: dto.playerId,
    players: game.players.map(p => ({ id: p.id, color: p.chessColor }))
  });

  // CRITICAL FIX: Verify it's the correct player's turn
  if (game.currentTurn !== dto.playerId) {
    console.log(`Turn validation failed: currentTurn=${game.currentTurn}, playerId=${dto.playerId}`);
    throw new BadRequestException('Not your turn');
  }

  // Always create chess instance from current board state
  let chess = new Chess(game.chessState.board);
  
  // ADDITIONAL VALIDATION: Check if it's the right color's turn
  const playerData = game.players.find(p => p.id === dto.playerId);
  if (!playerData) {
    throw new BadRequestException('Player not in game');
  }
  
  const chessTurn = chess.turn(); // 'w' or 'b'
  const expectedColor = playerData.chessColor === 'white' ? 'w' : 'b';
  
  if (chessTurn !== expectedColor) {
    console.log(`Chess turn mismatch: chessTurn=${chessTurn}, expectedColor=${expectedColor}`);
    throw new BadRequestException('Not your color\'s turn in chess position');
  }

  try {
    // Parse the move format from frontend (e.g., "e2e4" to {from: "e2", to: "e4"})
    const from = dto.move.substring(0, 2);
    const to = dto.move.substring(2, 4);
    const promotion = dto.move.length > 4 ? dto.move[4] : undefined;
    
    console.log('Attempting move:', { from, to, promotion });
    
    const moveResult = chess.move({
      from,
      to,
      promotion: promotion || 'q'
    });
    
    if (!moveResult) {
      throw new Error('Invalid move');
    }

    console.log('Move successful:', moveResult.san);

    // Update game state with new board position
    game.chessState.board = chess.fen();
    game.chessState.moves.push(dto.move);

    // CRITICAL FIX: Properly switch turn to the other player
    const currentPlayerIndex = game.players.findIndex(p => p.id === dto.playerId);
    const nextPlayerIndex = currentPlayerIndex === 0 ? 1 : 0;
    const nextPlayer = game.players[nextPlayerIndex];
    
    if (nextPlayer) {
      const previousTurn = game.currentTurn;
      game.currentTurn = nextPlayer.id;
      
      console.log('===== TURN SWITCH =====');
      console.log(`Previous turn: ${previousTurn}`);
      console.log(`Next turn: ${game.currentTurn}`);
      console.log(`Player 0: ${game.players[0].id} (${game.players[0].chessColor})`);
      console.log(`Player 1: ${game.players[1].id} (${game.players[1].chessColor})`);
      console.log('=======================');
    } else {
      console.error('ERROR: Could not find next player!');
      console.error('Current player index:', currentPlayerIndex);
      console.error('Players:', game.players);
    }

    // Check game over conditions
    if (chess.isGameOver()) {
      game.gameOver = true;
      if (chess.isCheckmate()) {
        game.winner = dto.playerId; // Current player wins if they delivered checkmate
        game.winCondition = 'checkmate';
      } else if (chess.isStalemate()) {
        game.winner = 'draw';
        game.winCondition = 'stalemate';
      } else if (chess.isDraw()) {
        game.winner = 'draw';
        game.winCondition = 'draw';
      }
    }

    // Save to database
    await game.save();
    console.log('Game saved to database with new turn:', game.currentTurn);

    // Update the chess instance in memory
    this.chessInstances.set(dto.roomId, chess);

    console.log('===== CHESS MOVE END =====');
    console.log(`Move completed: ${dto.move} by ${dto.playerId}`);
    console.log(`Next turn is now: ${game.currentTurn}`);
    console.log('=========================');

    return { 
      success: true, 
      game,
      nextTurn: game.currentTurn, // Explicitly return next turn
      moveDetails: {
        from: moveResult.from,
        to: moveResult.to,
        piece: moveResult.piece,
        captured: moveResult.captured,
        promotion: moveResult.promotion,
        san: moveResult.san,
        fen: chess.fen(),
        isCheck: chess.isCheck(),
        isCheckmate: chess.isCheckmate(),
        isDraw: chess.isDraw(),
        isStalemate: chess.isStalemate()
      }
    };
  } catch (error) {
    console.error(`Move error for ${dto.playerId}: ${error.message}`);
    throw new BadRequestException(`Invalid move: ${error.message}`);
  }
}

 

  async getChessGame(roomId: string): Promise<ChessGameDocument> {
    const game = await this.chessModel.findOne({ roomId });
    if (!game) {
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
