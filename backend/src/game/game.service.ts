import { Injectable, Inject } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { GameRoom, GameRoomDocument } from './schemas/game-room.schema';
import { GameSessionEntity, GameSessionDocument } from './schemas/game-session.schema';
import { CreateGameDto, JoinGameDto, MoveCoinDto, RollDiceDto } from './dto/game.dto';
import { TriviaService } from '../trivia/trivia.service';
import { v4 as uuidv4 } from 'uuid';
import { forwardRef } from '@nestjs/common';
import { Types } from 'mongoose';
import axios from 'axios'; 
import { Socket, Server } from 'socket.io';
import { Chess } from 'chess.js';
interface PublicGameRoom {
  id: string;
  roomId: string;
  name: string;
  gameType: string;
  hostName: string;
  hostAvatar: string;
  currentPlayers: number;
  maxPlayers: number;
  isPrivate: boolean;
  isInviteOnly: boolean;
  status: 'waiting' | 'in-progress' | 'completed';
  host: string;
  createdAt: string;
  scheduledTimeCombined?: string;
  scores?: Record<string, number>;
}

interface Player {
  id: string;
  name: string;
  color?: string; // Optional for Ludo, Chess
  coins?: number[]; // Ludo-specific
  score?: number; // Trivia, Kahoot-specific
  chessColor?: 'white' | 'black'; // Chess-specific
}

interface ChessState {
  board: string; // FEN notation for chess position
  moves: string[]; // List of moves in algebraic notation
  capturedPieces?: string[]; // Optional: track captured pieces
}

interface KahootState {
  currentQuestionIndex: number;
  questions: { id: string; text: string; options: string[]; correctAnswer: number }[];
  scores: Record<string, number>;
  answers: Record<string, number | null>; // Player answers for current question
  questionTimer: number; // Seconds remaining
}

interface TriviaState {
  currentQuestionIndex: number;
  questions: { id: string; text: string; options: string[]; correctAnswer: number }[];
  scores: Record<string, number>;
  answers: Record<string, number | null>; // Player answers for current question
  questionTimer: number; // Seconds remaining
}

interface GameState {
  roomId: string;
  players: Player[];
  currentTurn: string;
  currentPlayer: number;
  gameStarted: boolean;
  gameOver: boolean;
  winner: string | null;
  roomName: string;
  gameType: string;
  // Ludo-specific
  diceValue?: number;
  diceRolled?: boolean;
  consecutiveSixes?: number;
  coins?: Record<string, number[]>;
  // Chess-specific
  chessState?: ChessState;
  // Kahoot-specific
  kahootState?: KahootState;
  triviaState?: TriviaState; 
}



@Injectable()
export class GameService {
  private server: Server;

  private boardPath = Array.from({ length: 52 }, (_, i) => i + 1);
  private startPositions = [1, 14, 27, 40]; // Red, Blue, Green, Yellow
  private safePositions = [1, 9, 14, 22, 27, 35, 40, 48];
  private homeColumnStart = 52; // Positions 52–57 are home column

  


  constructor(
    private readonly redisService: RedisService,
    @InjectModel(GameRoom.name) private gameRoomModel: Model<GameRoomDocument>,
    @InjectModel(GameSessionEntity.name) private gameSessionModel: Model<GameSessionDocument>,
    private readonly triviaService: TriviaService,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  private async fetchTriviaQuestions(topic: string = 'general') {
    return this.triviaService.fetchTriviaQuestions(topic);
  }

  async createGame(createGameDto: CreateGameDto) {
    const validGameTypes = ['ludo', 'trivia', 'chess', 'kahoot', 'uno', 'pictionary', 'sudoku'];
    if (!validGameTypes.includes(createGameDto.gameType.toLowerCase())) {
      throw new Error('Invalid game type');
    }
    const roomId = uuidv4();
    let scheduledTimeCombined: Date | undefined;
    if (createGameDto.scheduledTimeCombined) {
      scheduledTimeCombined = new Date(createGameDto.scheduledTimeCombined);
      if (isNaN(scheduledTimeCombined.getTime())) throw new Error('Invalid scheduled time format');
      if (scheduledTimeCombined <= new Date()) throw new Error('Scheduled time must be in the future');
    }
    const maxPlayers = createGameDto.gameType.toLowerCase() === 'chess' ? 2 : 4;
    const gameRoom = new this.gameRoomModel({
      roomId,
      name: createGameDto.name,
      gameType: createGameDto.gameType.toLowerCase(),
      host: createGameDto.hostId,
      maxPlayers,
      currentPlayers: 1,
      isPrivate: createGameDto.isPrivate,
      password: createGameDto.password,
      status: 'waiting',
      scheduledTimeCombined,
      playerIds: [createGameDto.hostId],
      createdAt: new Date(),
    });
    await gameRoom.save();
    await this.initializeGameState(roomId, createGameDto.hostId, createGameDto.name, createGameDto.gameType, createGameDto.triviaTopic!);
    return gameRoom;
  }



  private async initializeGameState(roomId: string, hostId: string, roomName: string, gameType: string, triviaTopic: string) {
    const colors = ['red', 'blue', 'green', 'yellow'];
    let initialGameState: GameState;

    switch (gameType.toLowerCase()) {
      case 'trivia':
        const triviaQuestions = await this.fetchTriviaQuestions(triviaTopic || 'general');
        initialGameState = {
          roomId,
          players: [{ id: hostId, name: hostId, score: 0 }],
          currentTurn: hostId,
          currentPlayer: 0,
          gameStarted: false,
          gameOver: false,
          winner: null,
          roomName,
          gameType: gameType.toLowerCase(),
          triviaState: {
            currentQuestionIndex: 0,
            questions: triviaQuestions,
            scores: { [hostId]: 0 },
            answers: { [hostId]: null },
            questionTimer: 30,
          },
        };
        break;
      case 'kahoot':
        // const questions = gameType === 'kahoot' ? await this.fetchTriviaQuestions(triviaTopic) : [];
        const questions = await this.fetchTriviaQuestions(triviaTopic || 'general');
        initialGameState = {
          roomId,
          players: [{ id: hostId, name: hostId, score: 0 }],
          currentTurn: hostId,
          currentPlayer: 0,
          gameStarted: false,
          gameOver: false,
          winner: null,
          roomName,
          gameType: gameType.toLowerCase(),
          kahootState: {
            currentQuestionIndex: 0,
            questions,
            scores: { [hostId]: 0 },
            answers: { [hostId]: null },
            questionTimer: 20,
          },
        };
        break;
  
      case 'chess':
        initialGameState = {
          roomId,
          players: [{ id: hostId, name: hostId, chessColor: 'white' }],
          currentTurn: hostId,
          currentPlayer: 0,
          gameStarted: false,
          gameOver: false,
          winner: null,
          roomName,
          gameType: 'chess',
          chessState: {
            board: 'rnbqkbnr/pppppppp/5n1f/8/8/5N1F/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Initial FEN
            moves: [],
          },
        };
        break;
      default: // ludo, uno, pictionary, sudoku
        initialGameState = {
          roomId,
          players: [{ id: hostId, name: hostId, color: colors[0], coins: [0, 0, 0, 0] }],
          currentTurn: hostId,
          currentPlayer: 0,
          diceValue: 0,
          diceRolled: false,
          consecutiveSixes: 0,
          coins: { [hostId]: [0, 0, 0, 0] },
          gameStarted: false,
          gameOver: false,
          winner: null,
          roomName,
          gameType: gameType.toLowerCase(),
        };
    }
    await this.redisService.set(`game:${roomId}`, JSON.stringify(initialGameState));
  }


  async joinGame(joinGameDto: JoinGameDto) {
    const gameRoom = await this.gameRoomModel.findOne({ roomId: joinGameDto.roomId });
    if (!gameRoom) throw new Error('Game room not found');
    if (gameRoom.currentPlayers >= gameRoom.maxPlayers) throw new Error('Game room is full');
    if (gameRoom.isPrivate && gameRoom.password !== joinGameDto.password) throw new Error('Invalid password');
    if (!gameRoom.playerIds.includes(joinGameDto.playerId)) {
      gameRoom.playerIds.push(joinGameDto.playerId);
      gameRoom.currentPlayers = gameRoom.playerIds.length;
      await gameRoom.save();
      const gameState = await this.getGameState(joinGameDto.roomId);
      const colors = ['red', 'blue', 'green', 'yellow'];
      const playerIndex = gameState.players.length;
      if (gameRoom.gameType === 'chess') {
        gameState.players.push({
          id: joinGameDto.playerId,
          name: joinGameDto.playerName || joinGameDto.playerId,
          chessColor: playerIndex === 1 ? 'black' : 'white',
        });
      } else if (gameRoom.gameType === 'kahoot' || gameRoom.gameType === 'trivia') {
        gameState.players.push({
          id: joinGameDto.playerId,
          name: joinGameDto.playerName || joinGameDto.playerId,
          score: 0,
        });
        if (gameState.kahootState) {
          gameState.kahootState.scores[joinGameDto.playerId] = 0;
          gameState.kahootState.answers[joinGameDto.playerId] = null;
        }
      } else {
        gameState.players.push({
          id: joinGameDto.playerId,
          name: joinGameDto.playerName || joinGameDto.playerId,
          color: colors[playerIndex],
          coins: [0, 0, 0, 0],
        });
        gameState.coins = gameState.coins || {};
        gameState.coins[joinGameDto.playerId] = [0, 0, 0, 0];
      }
      await this.updateGameState(joinGameDto.roomId, gameState);
    }
    return { game: gameRoom, player: joinGameDto.playerId };
  }

  async rollDice(rollDiceDto: RollDiceDto) {
    try {
      const gameState = await this.getGameState(rollDiceDto.roomId);
      if (gameState.currentTurn !== rollDiceDto.playerId) throw new Error('Not your turn');
      if (gameState.diceRolled && gameState.diceValue !== 6) throw new Error('Dice already rolled');

      // Only roll if diceValue is 0 or player explicitly wants to roll during extra turn
      if (gameState.diceValue !== 6 && gameState.diceValue === 6) {
        const diceValue = Math.floor(Math.random() * 6) + 1;
        gameState.diceValue = diceValue;
        gameState.diceRolled = true;
        // gameState.consecutiveSixes = diceValue === 6 ? gameState.consecutiveSixes! + 1 : 0;
        console.log(`Dice rolled by ${rollDiceDto.playerId}: ${diceValue}, consecutive sixes: ${gameState.consecutiveSixes}`);
      } else {
        console.log(`Using existing dice value ${gameState.diceValue} for ${rollDiceDto.playerId}'s extra turn`);
      }

      // Check for three consecutive 6s
      if (gameState.consecutiveSixes! >= 3) {
        console.log(`Player ${rollDiceDto.playerId} rolled three 6s, losing turn`);
        gameState.diceValue = 0;
        gameState.diceRolled = false;
        gameState.consecutiveSixes = 0;
        gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
        gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
        await this.updateGameState(rollDiceDto.roomId, gameState);
        if (gameState.currentTurn.startsWith('ai-') && !gameState.gameOver) {
          console.log(`Scheduling AI turn for ${gameState.currentTurn} after three 6s`);
          setTimeout(() => {
            this.handleAITurn(rollDiceDto.roomId, gameState.currentTurn).catch((error) => {
              console.error(`Error in AI turn for ${gameState.currentTurn}:`, error);
            });
          }, 1000);
        }
        return { roomId: rollDiceDto.roomId, diceValue: gameState.diceValue, playerId: rollDiceDto.playerId, noValidMove: true };
      }

      // Check if the player has any valid moves
      const playerCoins = gameState.coins![rollDiceDto.playerId] || [0, 0, 0, 0];
      const hasValidMove = gameState.diceValue === 6 || playerCoins.some((pos) => pos > 0 && pos + gameState.diceValue! <= 57);

      if (!hasValidMove) {
        console.log(`No valid moves for ${rollDiceDto.playerId} (dice: ${gameState.diceValue}), passing turn`);
        gameState.diceValue = 0;
        gameState.diceRolled = false;
        gameState.consecutiveSixes = 0;
        gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
        gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
        await this.updateGameState(rollDiceDto.roomId, gameState);
        if (gameState.currentTurn.startsWith('ai-') && !gameState.gameOver) {
          console.log(`Scheduling AI turn for ${gameState.currentTurn}`);
          setTimeout(() => {
            this.handleAITurn(rollDiceDto.roomId, gameState.currentTurn).catch((error) => {
              console.error(`Error in AI turn for ${gameState.currentTurn}:`, error);
            });
          }, 1000);
        }
        return { roomId: rollDiceDto.roomId, diceValue: gameState.diceValue, playerId: rollDiceDto.playerId, noValidMove: true };
      }

      await this.updateGameState(rollDiceDto.roomId, gameState);

      // If player is AI, trigger their move
      if (rollDiceDto.playerId.startsWith('ai-')) {
        console.log(`Scheduling AI move for ${rollDiceDto.playerId}`);
        setTimeout(() => {
          this.handleAIMove(rollDiceDto.roomId, rollDiceDto.playerId).catch((error) => {
            console.error(`Error in AI move for ${rollDiceDto.playerId}:`, error);
          });
        }, 1000);
      }

      return { roomId: rollDiceDto.roomId, diceValue: gameState.diceValue, playerId: rollDiceDto.playerId, noValidMove: false };
    } catch (error) {
      console.error(`Error in rollDice for ${rollDiceDto.playerId}:`, error);
      throw error;
    }
  }

  async moveCoin(moveCoinDto: MoveCoinDto) {
    try {
      const gameState = await this.getGameState(moveCoinDto.roomId);
      if (gameState.currentTurn.startsWith('ai-') && !gameState.gameOver) {
        // Process AI turn immediately
        await this.handleAITurn(moveCoinDto.roomId, gameState.currentTurn);
      }
      if (gameState.currentTurn !== moveCoinDto.playerId) throw new Error('Not your turn');
      
      if (!gameState.diceRolled) throw new Error('You must roll the dice first');
      const [color, coinIndexStr] = moveCoinDto.coinId.split('-');
      const coinIndex = parseInt(coinIndexStr) - 1;
      const playerIndex = gameState.players.findIndex((p) => p.id === moveCoinDto.playerId);
      const coinPosition = gameState.coins![moveCoinDto.playerId][coinIndex];
      let newPosition = coinPosition;
      let captured = false;

      console.log(`Move coin attempt: ${moveCoinDto.coinId} by ${moveCoinDto.playerId}, current position: ${coinPosition}, dice: ${gameState.diceValue}`);

      // Validate move
      if (coinPosition === 0 && gameState.diceValue === 6) {
        newPosition = this.startPositions[playerIndex];
      } else if (coinPosition > 0) {
        newPosition = coinPosition + gameState.diceValue!;
        if (newPosition > 57) throw new Error('Invalid move: Beyond home');
        if (newPosition > 51 && newPosition < 57) {
          const homeStretchPosition = newPosition - 51;
          if (homeStretchPosition > 6) throw new Error('Invalid move: Beyond home stretch');
        }
      } else {
        throw new Error('Invalid move: Coin in base requires a 6');
      }

      // Check for captures (only on non-safe positions and not in home column)
      if (!this.safePositions.includes(newPosition % 52) && newPosition <= 51) {
        for (const opponentId of Object.keys(gameState.coins!)) {
          if (opponentId !== moveCoinDto.playerId) {
            gameState.coins![opponentId].forEach((pos, idx) => {
              if (pos === newPosition) {
                gameState.coins![opponentId][idx] = 0;
                gameState.players[gameState.players.findIndex((p) => p.id === opponentId)].coins![idx] = 0;
                captured = true;
                console.log(`Captured opponent coin at position ${newPosition} for player ${opponentId}`);
              }
            });
          }
        }
      }

      // Update coin position
      gameState.coins![moveCoinDto.playerId][coinIndex] = newPosition;
      gameState.players[playerIndex].coins![coinIndex] = newPosition;
      console.log(`Coin moved: ${moveCoinDto.coinId} to position ${newPosition}`);

      // Check win condition
      const hasWon = gameState.coins![moveCoinDto.playerId].every((pos) => pos === 57);
      if (hasWon) {
        gameState.winner = moveCoinDto.playerId;
        gameState.gameOver = true;
        await this.gameRoomModel.updateOne(
          { roomId: moveCoinDto.roomId },
          { status: 'completed', winner: moveCoinDto.playerId },
        );
        await this.saveGameSession(moveCoinDto.roomId, gameState);
        console.log(`Player ${moveCoinDto.playerId} has won!`);
      }

      // Update turn logic
      if (gameState.diceValue !== 6 && !captured) {
        // Normal turn: Pass to next player
        gameState.diceValue = 0;
        gameState.diceRolled = false;
        gameState.consecutiveSixes = 0;
        gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
        gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
      } else {
        // Extra turn for 6 or capture
        gameState.diceRolled = false;
        // Preserve diceValue for human players to allow using the 6 again
        if (!moveCoinDto.playerId.startsWith('ai-') && gameState.diceValue === 6) {
          console.log(`Preserving dice value ${gameState.diceValue} for ${moveCoinDto.playerId}'s extra turn`);
        } else {
          gameState.diceValue = 0; // Reset for AI or after capture
        }
      }

      await this.updateGameState(moveCoinDto.roomId, gameState);

      // If next player is AI, trigger their turn
      if (gameState.currentTurn.startsWith('ai-') && !gameState.gameOver) {
        console.log(`Scheduling AI turn for ${gameState.currentTurn} after move`);
        setTimeout(() => {
          this.handleAITurn(moveCoinDto.roomId, gameState.currentTurn).catch((error) => {
            console.error(`Error in AI turn for ${gameState.currentTurn}:`, error);
          });
        }, 1000);
      }

      return {
        roomId: moveCoinDto.roomId,
        coins: gameState.coins,
        currentTurn: gameState.currentTurn,
        currentPlayer: gameState.currentPlayer,
        diceValue: gameState.diceValue,
        diceRolled: gameState.diceRolled,
        gameOver: gameState.gameOver,
        winner: gameState.winner,
      };
    } catch (error) {
      console.error(`Error in moveCoin for ${moveCoinDto.playerId}:`, error);
      throw error;
    }
  }

  async handleAITurn(roomId: string, aiPlayerId: string) {
    try {
      console.log(`Starting AI turn for ${aiPlayerId} in room ${roomId}`);
      const gameState = await this.getGameState(roomId);
  
      if (gameState.currentTurn !== aiPlayerId || gameState.gameOver) {
        return;
      }
      if (gameState.diceRolled) {
        console.log(`AI ${aiPlayerId} proceeding with existing dice roll: ${gameState.diceValue}`);
        await this.handleAIMove(roomId, aiPlayerId);
      } else {
        console.log(`AI ${aiPlayerId} rolling dice`);
        await this.rollDice({ roomId, playerId: aiPlayerId });
      }
    } catch (error) {
      console.error(`Error in handleAITurn for ${aiPlayerId}:`, error);
    }
  }

  async handleAIMove(roomId: string, aiPlayerId: string) {
    try {
      const gameState = await this.getGameState(roomId);
      if (gameState.currentTurn !== aiPlayerId || !gameState.diceRolled || gameState.gameOver) {
        console.log(`AI move skipped for ${aiPlayerId}: not their turn, dice not rolled, or game over`);
        return;
      }

      const playerIndex = gameState.players.findIndex((p) => p.id === aiPlayerId);
      const playerCoins = gameState.coins![aiPlayerId] || [0, 0, 0, 0];
      const movableCoins: { index: number; newPosition: number; captures: boolean }[] = [];

      // Determine movable coins
      playerCoins.forEach((position, index) => {
        let newPosition = position;
        if (position === 0 && gameState.diceValue === 6) {
          newPosition = this.startPositions[playerIndex];
        } else if (position > 0 && position < 57) {
          newPosition = position + gameState.diceValue!;
          if (newPosition <= 57) {
            let captures = false;
            if (!this.safePositions.includes(newPosition % 52) && newPosition <= 51) {
              for (const opponentId of Object.keys(gameState.coins!)) {
                if (opponentId !== aiPlayerId && gameState.coins![opponentId].includes(newPosition)) {
                  captures = true;
                  break;
                }
              }
            }
            movableCoins.push({ index, newPosition, captures });
          }
        }
      });

      console.log(`AI ${aiPlayerId} movable coins: ${JSON.stringify(movableCoins)}`);

      if (movableCoins.length > 0) {
        // Prioritize captures, then closest to home, else random
        let coinToMove = movableCoins.find((coin) => coin.captures);
        if (!coinToMove) {
          coinToMove = movableCoins.reduce((best, coin) =>
            coin.newPosition > best.newPosition ? coin : best,
            movableCoins[0]
          );
        }
        const coinId = `${gameState.players[playerIndex].color}-${coinToMove.index + 1}`;
        console.log(`AI ${aiPlayerId} moving coin: ${coinId}`);
        await this.moveCoin({ roomId, playerId: aiPlayerId, coinId });
      } else {
        // No valid moves: Pass turn
        console.log(`AI ${aiPlayerId} has no valid moves, passing turn`);
        gameState.diceValue = 0;
        gameState.diceRolled = false;
        gameState.consecutiveSixes = 0;
        gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
        gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
        await this.updateGameState(roomId, gameState);
        if (gameState.currentTurn.startsWith('ai-') && !gameState.gameOver) {
          console.log(`Scheduling AI turn for ${gameState.currentTurn} after no valid move`);
          setTimeout(() => {
            this.handleAITurn(roomId, gameState.currentTurn).catch((error) => {
              console.error(`Error in AI turn for ${gameState.currentTurn}:`, error);
            });
          }, 1000);
        }
      }
    } catch (error) {
      console.error(`Error in handleAIMove for ${aiPlayerId}:`, error);
    }
  }

  // async startGame(roomId: string) {
  //   try {
  //     const gameState = await this.getGameState(roomId);
  //     if (gameState.gameStarted) throw new Error('Game already started');
  //     const room = await this.getGameRoomById(roomId);
  //     if (!room) throw new Error('Room not found');
  //     // if (room.playerIds.length < (room.gameType === 'chess' ? 2 : 2)) throw new Error('At least 2 players required');
  //     if (room.playerIds.length < (room.gameType === 'chess' ? 2 : 2)) throw new Error('At least 2 players required');

  //     gameState.gameStarted = true;
  //     if (room.gameType === 'kahoot' && gameState.kahootState) {
  //       gameState.kahootState.currentQuestionIndex = 0;
  //       gameState.kahootState.questionTimer = 20;
  //       // Start timer (simulated)
  //       setTimeout(() => this.handleKahootQuestionTimeout(roomId), 20000);
  //     } else if (room.gameType === 'chess') {
  //       gameState.currentTurn = gameState.players[0].id; // White moves first
  //     } else if (room.gameType !== 'trivia') {
  //       const colors = ['red', 'blue', 'green', 'yellow'];
  //       while (room.playerIds.length < 4) {
  //         const aiPlayerId = `ai-${room.playerIds.length + 1}`;
  //         room.playerIds.push(aiPlayerId);
  //         gameState.players.push({
  //           id: aiPlayerId,
  //           name: `AI ${room.playerIds.length}`,
  //           color: colors[room.playerIds.length - 1],
  //           coins: [0, 0, 0, 0],
  //         });
  //         gameState.coins = gameState.coins || {};
  //         gameState.coins[aiPlayerId] = [0, 0, 0, 0];
  //       }
  //       room.currentPlayers = room.playerIds.length;
  //       await room.save();
  //       if (gameState.currentTurn.startsWith('ai-')) {
  //         setTimeout(() => this.handleAITurn(roomId, gameState.currentTurn), 1000);
  //       }
  //     }
  //     await this.updateGameState(roomId, gameState);
  //     this.server.to(roomId).emit('gameState', gameState);
  //     await this.gameRoomModel.findOneAndUpdate({ roomId }, { status: 'in-progress' }, { new: true });
  //     return gameState;
  //   } catch (error) {
  //     console.error(`Error in startGame for room ${roomId}:`, error);
  //     throw error;
  //   }
  // }

  // async startGame(roomId: string) {
  //   try {
  //     const gameState = await this.getGameState(roomId);
  //     if (gameState.gameStarted) throw new Error('Game already started');
  //     const room = await this.getGameRoomById(roomId);
  //     if (!room) throw new Error('Room not found');
      
  //     // Check minimum players based on game type
  //     const minPlayers = room.gameType === 'chess' ? 2 : 1; // Adjust as needed
  //     if (room.playerIds.length < minPlayers) {
  //       throw new Error(`At least ${minPlayers} players required`);
  //     }
  
  //     gameState.gameStarted = true;
      
  //     // Initialize game-specific state
  //     if (room.gameType === 'kahoot' && gameState.kahootState) {
  //       gameState.kahootState.currentQuestionIndex = 0;
  //       gameState.kahootState.questionTimer = 20;
  //       // Reset answers for all players
  //       gameState.players.forEach(player => {
  //         gameState.kahootState!.answers[player.id] = null;
  //       });
  //       // Start timer
  //       setTimeout(() => this.handleKahootQuestionTimeout(roomId), 20000);
  //     } else if (room.gameType === 'trivia' && gameState.triviaState) {
  //       gameState.triviaState.currentQuestionIndex = 0;
  //       gameState.triviaState.questionTimer = 30;
  //       // Reset answers for all players
  //       gameState.players.forEach(player => {
  //         gameState.triviaState!.answers[player.id] = null;
  //       });
  //     } else if (room.gameType === 'chess') {
  //       gameState.currentTurn = gameState.players[0].id; // White moves first
  //     }
  
  //     await this.updateGameState(roomId, gameState);
  //     this.server.to(roomId).emit('gameState', gameState);
  //     await this.gameRoomModel.findOneAndUpdate(
  //       { roomId }, 
  //       { status: 'in-progress' }, 
  //       { new: true }
  //     );
  //     return gameState;
  //   } catch (error) {
  //     console.error(`Error in startGame for room ${roomId}:`, error);
  //     throw error;
  //   }
  // }


  async startGame(roomId: string) {
    try {
      if (!this.server) {
        throw new Error('Server instance not available');
      }
  
      const gameState = await this.getGameState(roomId);
      if (gameState.gameStarted) throw new Error('Game already started');
      
      const room = await this.getGameRoomById(roomId);
      if (!room) throw new Error('Room not found');
      
      // Check minimum players
      const minPlayers = room.gameType === 'chess' ? 2 : 1;
      if (room.playerIds.length < minPlayers) {
        throw new Error(`At least ${minPlayers} players required`);
      }
  
      gameState.gameStarted = true;
      
      // Initialize game-specific state
      if (room.gameType === 'kahoot' && gameState.kahootState) {
        gameState.kahootState.currentQuestionIndex = 0;
        gameState.kahootState.questionTimer = 20;
        gameState.players.forEach(player => {
          gameState.kahootState!.answers[player.id] = null;
        });
        setTimeout(() => this.handleKahootQuestionTimeout(roomId), 20000);
      }
  
      await this.updateGameState(roomId, gameState);
      
      // Emit to room only if server is available
      if (this.server) {
        this.server.to(roomId).emit('gameState', gameState);
      }
      
      await this.gameRoomModel.findOneAndUpdate(
        { roomId }, 
        { status: 'in-progress' }, 
        { new: true }
      );
      return gameState;
    } catch (error) {
      console.error(`Error in startGame for room ${roomId}:`, error);
      throw error;
    }
  }

  // async makeChessMove(data: { roomId: string; playerId: string; move: string }) {
  //   const gameState = await this.getGameState(data.roomId);
  //   if (gameState.gameType !== 'chess') throw new Error('Invalid game type');
  //   if (gameState.currentTurn !== data.playerId) throw new Error('Not your turn');
  //   if (!gameState.chessState) throw new Error('Chess state not initialized');

  //   // Simulate move validation (use a chess library like chess.js in production)
  //   const move = data.move; // e.g., "e2e4"
  //   gameState.chessState.moves.push(move);
  //   // Update board (simplified; use chess.js for real validation)
  //   gameState.chessState.board = this.updateChessBoard(gameState.chessState.board, move);
    
  //   // Check for game over (simplified)
  //   const isGameOver = this.isChessGameOver(gameState.chessState.board);
  //   if (isGameOver) {
  //     gameState.gameOver = true;
  //     gameState.winner = data.playerId;
  //     await this.gameRoomModel.updateOne({ roomId: data.roomId }, { status: 'completed', winner: data.playerId });
  //     await this.saveGameSession(data.roomId, gameState);
  //   } else {
  //     gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
  //     gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
  //   }

  //   await this.updateGameState(data.roomId, gameState);
  //   return { roomId: data.roomId, move, gameState };
  // }

  // private updateChessBoard(currentFen: string, move: string): string {
  //   // Placeholder: Use chess.js for real FEN updates
  //   return currentFen; // Return updated FEN
  // }

  // private isChessGameOver(fen: string): boolean {
  //   // Placeholder: Use chess.js to check checkmate/stalemate
  //   return false;
  // }

  async makeChessMove(data: { roomId: string; playerId: string; move: string }) {
    const gameState = await this.getGameState(data.roomId);
    
    if (gameState.gameType !== 'chess') throw new Error('Invalid game type');
    if (gameState.currentTurn !== data.playerId) throw new Error('Not your turn');
    if (!gameState.chessState) throw new Error('Chess state not initialized');
  
    try {
      const chess = new Chess(gameState.chessState.board);
      const move = chess.move({
        from: data.move.substring(0, 2),
        to: data.move.substring(2, 4),
        promotion: 'q'
      });
  
      if (!move) throw new Error('Invalid move');
  
      // Update game state
      gameState.chessState = {
        board: chess.fen(),
        moves: [...gameState.chessState.moves, move.san]
      };
  
      // Switch turns
      gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
      gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
  
      // Check for game over
      if (chess.isGameOver()) {
        gameState.gameOver = true;
        gameState.winner = data.playerId;
        await this.gameRoomModel.updateOne(
          { roomId: data.roomId }, 
          { status: 'completed', winner: data.playerId }
        );
        await this.saveGameSession(data.roomId, gameState);
      }
  
      await this.updateGameState(data.roomId, gameState);
      return { 
        roomId: data.roomId, 
        move: move.san, 
        gameState 
      };
    } catch (error) {
      console.error('Chess move error:', error);
      throw new Error('Invalid chess move');
    }
  }
  
  private updateChessBoard(currentFen: string, move: string): string {
    try {
      const chess = new Chess(currentFen);
      chess.move({
        from: move.substring(0, 2),
        to: move.substring(2, 4),
        promotion: 'q'
      });
      return chess.fen();
    } catch (e) {
      console.error('Failed to update chess board:', e);
      return currentFen;
    }
  }
  
  private isChessGameOver(fen: string): boolean {
    try {
      const chess = new Chess(fen);
      return chess.isGameOver();
    } catch (e) {
      console.error('Failed to check game over:', e);
      return false;
    }
  }

  async submitKahootAnswer(data: { roomId: string; playerId: string; answerIndex: number }) {
    const gameState = await this.getGameState(data.roomId);
    if (gameState.gameType !== 'kahoot') throw new Error('Invalid game type');
    if (!gameState.kahootState) throw new Error('Kahoot state not initialized');
    if (gameState.kahootState.answers[data.playerId] !== null) throw new Error('Answer already submitted');

    gameState.kahootState.answers[data.playerId] = data.answerIndex;
    const allAnswered = gameState.players.every(p => gameState.kahootState!.answers[p.id] !== null);
    
    if (allAnswered) {
      await this.processKahootQuestion(data.roomId);
    } else {
      await this.updateGameState(data.roomId, gameState);
    }
    return { roomId: data.roomId, playerId: data.playerId, answerIndex: data.answerIndex };
  }

  async processKahootQuestion(roomId: string) {
    const gameState = await this.getGameState(roomId);
    if (!gameState.kahootState) throw new Error('Kahoot state not initialized');
    
    const question = gameState.kahootState.questions[gameState.kahootState.currentQuestionIndex];
    gameState.players.forEach(p => {
      if (gameState.kahootState!.answers[p.id] === question.correctAnswer) {
        gameState.kahootState!.scores[p.id] = (gameState.kahootState!.scores[p.id] || 0) + 100;
        p.score = gameState.kahootState!.scores[p.id];
      }
    });

    gameState.kahootState.currentQuestionIndex++;
    if (gameState.kahootState.currentQuestionIndex >= gameState.kahootState.questions.length) {
      gameState.gameOver = true;
      gameState.winner = gameState.players.reduce((a, b) => 
        (gameState.kahootState!.scores[a.id] || 0) > (gameState.kahootState!.scores[b.id] || 0) ? a : b
      ).id;
      await this.gameRoomModel.updateOne({ roomId }, { status: 'completed', winner: gameState.winner });
      await this.saveGameSession(roomId, gameState);
    } else {
      gameState.kahootState.answers = gameState.players.reduce((acc, p) => ({ ...acc, [p.id]: null }), {});
      gameState.kahootState.questionTimer = 20;
      setTimeout(() => this.handleKahootQuestionTimeout(roomId), 20000);
    }

    await this.updateGameState(roomId, gameState);
    return gameState;
  }

  async handleKahootQuestionTimeout(roomId: string) {
    const gameState = await this.getGameState(roomId);
    if (gameState.gameType !== 'kahoot' || !gameState.kahootState || gameState.gameOver) return;
    
    gameState.kahootState.questionTimer = 0;
    await this.processKahootQuestion(roomId);
  }

  async handleDisconnect(client: Socket) {
    try {
      const rooms = await this.gameRoomModel.find({ playerIds: client.id });
      for (const room of rooms) {
        const gameState = await this.getGameState(room.roomId);
        if (gameState.currentTurn === client.id) {
          gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
          gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
          gameState.diceValue = 0;
          gameState.diceRolled = false;
          gameState.consecutiveSixes = 0;
          await this.updateGameState(room.roomId, gameState);
          if (gameState.currentTurn.startsWith('ai-') && !gameState.gameOver) {
            console.log(`Scheduling AI turn for ${gameState.currentTurn} after disconnect`);
            setTimeout(() => {
              this.handleAITurn(room.roomId, gameState.currentTurn).catch((error) => {
                console.error(`Error in AI turn for ${gameState.currentTurn}:`, error);
              });
            }, 1000);
          }
        }
      }
    } catch (error) {
      console.error(`Error in handleDisconnect for client ${client.id}:`, error);
    }
  }

  async getGameState(roomId: string): Promise<GameState> {
    try {
      const redisState = await this.redisService.get(`game:${roomId}`);
      if (redisState) {
        const parsedState: GameState = JSON.parse(redisState);
        return {
          ...parsedState,
          players: parsedState.players.map((player, index) => ({
            ...player,
            name: player.id.startsWith('ai-') ? `AI ${index + 1}` : player.name,
          })),
          currentPlayer: parsedState.players.findIndex((p) => p.id === parsedState.currentTurn),
          diceRolled: parsedState.diceValue ? parsedState.diceValue !== 0 : false,
        };
      }
      const room = await this.getGameRoomById(roomId);
      if (!room) throw new Error('Room not found');
      const colors = ['red', 'blue', 'green', 'yellow'];
      let defaultGameState: GameState;
      switch (room.gameType) {
        case 'chess':
          defaultGameState = {
            roomId,
            gameType: 'chess',
            roomName: room.name,
            gameStarted: false,
            gameOver: false,
            currentPlayer: 0,
            currentTurn: room.playerIds?.[0] || '',
            players: room.playerIds.map((playerId, index) => ({
              id: playerId,
              name: playerId.startsWith('ai-') ? `AI ${index + 1}` : playerId,
              chessColor: index === 0 ? 'white' : 'black',
            })),
            winner: null,
            chessState: {
              // board: 'rnbqkbnr/pppppppp/5n1f/8/8/5N1F/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              moves: [],
            },
          };
          break;
        // case 'chess':
        //   defaultGameState = {
        //     roomId,
        //     players: [{ id: hostId, name: hostId, chessColor: 'white' }],
        //     currentTurn: hostId,
        //     currentPlayer: 0,
        //     gameStarted: false,
        //     gameOver: false,
        //     winner: null,
        //     roomName,
        //     gameType: 'chess',
        //     chessState: {
        //       board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Standard initial position
        //       moves: [],
        //     },
        //   };
        //   break;
        case 'kahoot':
        case 'trivia':
          const questions = room.gameType === 'kahoot' ? await this.fetchTriviaQuestions() : [];
          defaultGameState = {
            roomId,
            gameType: room.gameType,
            roomName: room.name,
            gameStarted: false,
            gameOver: false,
            currentPlayer: 0,
            currentTurn: room.playerIds?.[0] || '',
            players: room.playerIds.map((playerId, index) => ({
              id: playerId,
              name: playerId.startsWith('ai-') ? `AI ${index + 1}` : playerId,
              score: 0,
            })),
            winner: null,
            kahootState: {
              currentQuestionIndex: 0,
              questions,
              scores: room.playerIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
              answers: room.playerIds.reduce((acc, id) => ({ ...acc, [id]: null }), {}),
              questionTimer: 20,
            },
            // kahootState: {
            //   currentQuestionIndex: 0,
            //   questions: room.gameType === 'kahoot' ? this.kahootQuestions : [],
            //   scores: room.playerIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
            //   answers: room.playerIds.reduce((acc, id) => ({ ...acc, [id]: null }), {}),
            //   questionTimer: 20,
            // },
          };
          break;
        default:
          defaultGameState = {
            roomId,
            gameType: room.gameType,
            roomName: room.name,
            gameStarted: false,
            gameOver: false,
            currentPlayer: 0,
            currentTurn: room.playerIds?.[0] || '',
            players: room.playerIds.map((playerId, index) => ({
              id: playerId,
              name: playerId.startsWith('ai-') ? `AI ${index + 1}` : playerId,
              color: colors[index],
              coins: [0, 0, 0, 0],
            })),
            coins: room.playerIds.reduce((acc, playerId) => ({
              ...acc,
              [playerId]: [0, 0, 0, 0],
            }), {}),
            diceValue: 0,
            diceRolled: false,
            consecutiveSixes: 0,
            winner: null,
          };
      }
      await this.updateGameState(roomId, defaultGameState);
      return this.getGameState(roomId);
    } catch (error) {
      console.error(`Error in getGameState for room ${roomId}:`, error);
      throw error;
    }
  }

  async updateGameState(roomId: string, gameState: GameState) {
    try {
      await this.redisService.set(`game:${roomId}`, JSON.stringify(gameState));
    } catch (error) {
      console.error(`Error in updateGameState for room ${roomId}:`, error);
      throw error;
    }
  }

  async saveGameSession(roomId: string, gameState: GameState) {
    try {
      const room = await this.gameRoomModel.findOne({ roomId });
      
      const sessionData: Partial<GameSessionEntity> = {
        roomId,
        players: gameState.players.map((p) => p.id),
        winner: gameState.winner!,
        moves: [], // or gameState.moves if you have that
        finalState: {
          coins: gameState.coins || {},
          players: gameState.players.map(p => p.id),
          scores: gameState.players.reduce((acc, player) => {
            acc[player.id] = player.score || 0;
            return acc;
          }, {} as Record<string, number>)
        },
        startedAt: new Date(),
        endedAt: gameState.gameOver ? new Date() : undefined,
        isTournament: false // Set appropriately if you have tournaments
      };
  
      // Only include gameRoom if the room exists
      if (room) {
        sessionData.gameRoom = room._id as Types.ObjectId;
      }
  
      const gameSession = new this.gameSessionModel(sessionData);
      await gameSession.save();
    } catch (error) {
      console.error(`Error in saveGameSession for room ${roomId}:`, error);
    }
  }

  // async saveGameSession(roomId: string, gameState: GameState) {
  //   try {
  //     const gameSession = new this.gameSessionModel({
  //       roomId,
  //       players: gameState.players.map((p) => p.id),
  //       winner: gameState.winner,
  //       moves: [], //moves: gameState.chessState?.moves || [],
  //       createdAt: new Date(),
  //     });
  //     await gameSession.save();
  //   } catch (error) {
  //     console.error(`Error in saveGameSession for room ${roomId}:`, error);
  //   }
  // }

  async getScores(roomId: string) {
    try {
      const room = await this.gameRoomModel.findOne({ roomId });
      if (!room) throw new Error('Game room not found');
      return room.scores ?? {};
    } catch (error) {
      console.error(`Error in getScores for room ${roomId}:`, error);
      throw error;
    }
  }

  async getActiveGameRooms(): Promise<PublicGameRoom[]> {
    try {
      const rooms = await this.gameRoomModel
        .find({ status: { $in: ['waiting', 'in-progress'] } })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      return rooms.map((room) => ({
        id: room.roomId,
        roomId: room.roomId,
        name: room.name,
        gameType: room.gameType,
        hostName: room.host,
        hostAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(room.host)}`,
        currentPlayers: room.currentPlayers,
        maxPlayers: room.maxPlayers,
        isPrivate: room.isPrivate,
        isInviteOnly: room.isPrivate,
        status: room.status,
        host: room.host,
        createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : new Date().toISOString(),
        scheduledTimeCombined: room.scheduledTimeCombined ? new Date(room.scheduledTimeCombined).toISOString() : undefined,
        scores: room.scores ? Object.fromEntries(Object.entries(room.scores)) : {},
      }));
    } catch (error) {
      console.error(`Error in getActiveGameRooms:`, error);
      throw error;
    }
  }

  async getGameRoomById(identifier: string) {
    try {
      let room = await this.gameRoomModel.findOne({ roomId: identifier }).exec();
      if (!room && Types.ObjectId.isValid(identifier)) {
        room = await this.gameRoomModel.findById(identifier).exec();
      }
      return room;
    } catch (error) {
      console.error(`Error in getGameRoomById for ${identifier}:`, error);
      return null;
    }
  }

  async getMyGameRooms(playerId: string): Promise<{ hosted: PublicGameRoom[]; joined: PublicGameRoom[] }> {
    try {
      const rooms = await this.gameRoomModel
        .find({
          $or: [
            { host: playerId },
            { playerIds: playerId },
          ],
          status: { $in: ['waiting', 'in-progress'] },
        })
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      const hosted = rooms
        .filter((room) => room.host === playerId)
        .map((room) => ({
          id: room.roomId,
          roomId: room.roomId,
          name: room.name,
          gameType: room.gameType,
          hostName: room.host,
          hostAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(room.host)}`,
          currentPlayers: room.currentPlayers,
          maxPlayers: room.maxPlayers,
          isPrivate: room.isPrivate,
          isInviteOnly: room.isPrivate,
          status: room.status,
          host: room.host,
          createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : new Date().toISOString(),
          scheduledTimeCombined: room.scheduledTimeCombined ? new Date(room.scheduledTimeCombined).toISOString() : undefined,
          scores: room.scores ? Object.fromEntries(Object.entries(room.scores)) : {},
        }));

      const joined = rooms
        .filter((room) => room.playerIds.includes(playerId))
        .map((room) => ({
          id: room.roomId,
          roomId: room.roomId,
          name: room.name,
          gameType: room.gameType,
          hostName: room.host,
          hostAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(room.host)}`,
          currentPlayers: room.currentPlayers,
          maxPlayers: room.maxPlayers,
          isPrivate: room.isPrivate,
          isInviteOnly: room.isPrivate,
          status: room.status,
          host: room.host,
          createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : new Date().toISOString(),
          scheduledTimeCombined: room.scheduledTimeCombined ? new Date(room.scheduledTimeCombined).toISOString() : undefined,
          scores: room.scores ? Object.fromEntries(Object.entries(room.scores)) : {},
        }));

      return { hosted, joined };
    } catch (error) {
      console.error(`Error in getMyGameRooms for ${playerId}:`, error);
      throw error;
    }
  }
}
