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
import { UserService } from '../user/user.service';
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
  host?: string; 
  // Ludo-specific
  diceValue?: number;
  diceRolled?: boolean;
  consecutiveSixes?: number;
  coins?: Record<string, number[]>;
  // Chess-specific
  chessState?: ChessState;
  chessPlayers?: { player1Id: string; player2Id: string }; // Track selected chess players
  // Kahoot-specific
  kahootState?: KahootState;
  triviaState?: TriviaState; 
  winCondition?: string; 
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
    private readonly userService: UserService,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  // Helper method to check if player has valid moves
  private checkValidMoves(playerCoins: number[], diceValue: number): boolean {
    // Can always move if dice is 6 (can bring coin from base)
    if (diceValue === 6) return true;
    
    // Check if any coin can move on the board
    return playerCoins.some(pos => {
      if (pos === 0) return false; // Coin in base, can't move without 6
      if (pos >= 57) return false; // Coin already home
      return pos + diceValue <= 57; // Can move without exceeding home
    });
  }

  // Helper method to check win condition
  private checkWinCondition(playerCoins: number[]): boolean {
    return playerCoins.every(pos => pos === 57);
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
    console.log('Game created and initialized:', {
      roomId,
      gameType: createGameDto.gameType,
      hostId: createGameDto.hostId,
      maxPlayers: gameRoom.maxPlayers
    });
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
          host: hostId,
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
          host: hostId,
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
          host: hostId,
          chessState: {
            board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Initial FEN
            moves: [],
          },
        };
        console.log('Chess game initialized:', {
          roomId,
          hostId,
          currentTurn: initialGameState.currentTurn,
          players: initialGameState.players.map((p: any) => ({ 
            id: p.id, 
            chessColor: p.chessColor 
          }))
        });
        break;
      default: // ludo, uno, pictionary, sudoku
        initialGameState = {
          roomId,
          players: [{ 
            id: hostId, 
            name: hostId, 
            color: colors[0], 
            coins: [0, 0, 0, 0] 
          }],
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
          host: hostId,
        };
        console.log('Ludo game initialized:', {
          roomId,
          hostId,
          currentTurn: initialGameState.currentTurn,
          players: initialGameState.players.map((p: any) => ({ 
            id: p.id, 
            color: p.color,
            coins: p.coins
          }))
        });
    }
    await this.redisService.set(`game:${roomId}`, JSON.stringify(initialGameState));
  }


  async joinGame(joinGameDto: JoinGameDto) {
    const gameRoom = await this.gameRoomModel.findOne({ roomId: joinGameDto.roomId });
    if (!gameRoom) throw new Error('Game room not found');
    if (gameRoom.isPrivate && gameRoom.password !== joinGameDto.password) throw new Error('Invalid password');
    
    let isNewJoin = false;
    let assignedRole = 'player';
    
    // Check if user is already in the room (as player or spectator)
    const isAlreadyPlayer = gameRoom.playerIds.includes(joinGameDto.playerId);
    const isAlreadySpectator = gameRoom.spectatorIds.includes(joinGameDto.playerId);
    
    if (!isAlreadyPlayer && !isAlreadySpectator) {
      isNewJoin = true;
      
      // Determine if user should be player or spectator
      if (gameRoom.playerIds.length < gameRoom.maxPlayers) {
        // Add as player
        gameRoom.playerIds.push(joinGameDto.playerId);
        gameRoom.currentPlayers = gameRoom.playerIds.length;
        assignedRole = 'player';
        
        // Initialize game state for new player if needed
        const gameState = await this.getGameState(joinGameDto.roomId);
        const colors = ['red', 'blue', 'green', 'yellow'];
        const playerIndex = gameState.players.length;
        
        if (gameRoom.gameType === 'chess') {
          // Ensure game state has correct players for chess (max 2)
          if (!gameState.players.find(p => p.id === joinGameDto.playerId)) {
            const currentCount = gameState.players.length;
            if (currentCount >= 2) {
              // Should not happen because maxPlayers gate, but guard anyway
              throw new Error('Chess game already has two players');
            }
            gameState.players.push({ id: joinGameDto.playerId, name: joinGameDto.playerName || joinGameDto.playerId, chessColor: currentCount === 0 ? 'white' : 'black' });
          }
          // Ensure currentTurn starts with white
          const whitePlayer = gameState.players.find(p => p.chessColor === 'white');
          if (whitePlayer) {
            gameState.currentTurn = whitePlayer.id;
            gameState.currentPlayer = gameState.players.findIndex(p => p.id === gameState.currentTurn);
          }
          await this.updateGameState(joinGameDto.roomId, gameState);
        } else if (gameRoom.gameType === 'ludo') {
          // Assign next color and initialize coins
          const nextColor = colors[playerIndex % colors.length];
          if (!gameState.players.find(p => p.id === joinGameDto.playerId)) {
            gameState.players.push({ id: joinGameDto.playerId, name: joinGameDto.playerName || joinGameDto.playerId, color: nextColor, coins: [0, 0, 0, 0] });
          }
          if (!gameState.coins) gameState.coins = {};
          if (!gameState.coins[joinGameDto.playerId]) {
            gameState.coins[joinGameDto.playerId] = [0, 0, 0, 0];
          }
          await this.updateGameState(joinGameDto.roomId, gameState);
        } else if (gameRoom.gameType === 'trivia' || gameRoom.gameType === 'kahoot') {
          // Add player with score and ensure answer maps include them
          if (!gameState.players.find(p => p.id === joinGameDto.playerId)) {
            gameState.players.push({ id: joinGameDto.playerId, name: joinGameDto.playerName || joinGameDto.playerId, score: 0 });
          }
          if (gameRoom.gameType === 'trivia' && gameState.triviaState) {
            gameState.triviaState.scores[joinGameDto.playerId] = 0;
            gameState.triviaState.answers[joinGameDto.playerId] = null;
          }
          if (gameRoom.gameType === 'kahoot' && gameState.kahootState) {
            gameState.kahootState.scores[joinGameDto.playerId] = 0;
            gameState.kahootState.answers[joinGameDto.playerId] = null;
          }
          await this.updateGameState(joinGameDto.roomId, gameState);
        }
        
      } else {
        // Add as spectator (player limit reached)
        gameRoom.spectatorIds.push(joinGameDto.playerId);
        assignedRole = 'spectator';
      }
      
      await gameRoom.save();
    } else if (isAlreadyPlayer) {
      assignedRole = 'player';
    } else if (isAlreadySpectator) {
      assignedRole = 'spectator';
    }

    return { 
      game: gameRoom, 
      player: joinGameDto.playerId, 
      isNewJoin, 
      role: assignedRole 
    };
  }

  async joinAsSpectator(joinGameDto: JoinGameDto) {
    const gameRoom = await this.gameRoomModel.findOne({ roomId: joinGameDto.roomId });
    if (!gameRoom) throw new Error('Game room not found');
    if (gameRoom.isPrivate && gameRoom.password !== joinGameDto.password) throw new Error('Invalid password');
    
    let isNewJoin = false;
    
    // Check if user is not already a spectator
    if (!gameRoom.spectatorIds.includes(joinGameDto.playerId)) {
      // Remove from players if they were a player (role switch)
      if (gameRoom.playerIds.includes(joinGameDto.playerId)) {
        gameRoom.playerIds = gameRoom.playerIds.filter(id => id !== joinGameDto.playerId);
        gameRoom.currentPlayers = gameRoom.playerIds.length;
      }
      
      gameRoom.spectatorIds.push(joinGameDto.playerId);
      isNewJoin = true;
      await gameRoom.save();
    }
    
    return { game: gameRoom, isNewJoin, role: 'spectator' };
  }


  async rollDice(rollDiceDto: RollDiceDto) {
    try {
      const gameState = await this.getGameState(rollDiceDto.roomId);
      
      // Validate it's the player's turn
      if (gameState.currentTurn !== rollDiceDto.playerId) {
        throw new Error('Not your turn');
      }
      
      // Check if game has started
      if (!gameState.gameStarted) {
        throw new Error('Game has not started yet');}
    
      
      // Check if dice can be rolled (allow re-rolling if player got a 6 and hasn't moved yet)
      if (gameState.diceRolled && gameState.diceValue !== 6) {
        throw new Error('Dice already rolled for this turn');
      }

      // Roll a new dice value
      const diceValue = Math.floor(Math.random() * 6) + 1;
      gameState.diceValue = diceValue;
      gameState.diceRolled = true;
      
      // Initialize consecutiveSixes if not set
      if (gameState.consecutiveSixes === undefined) {
        gameState.consecutiveSixes = 0;
      }
      
      // Track consecutive sixes - only count if this is a new turn, not a re-roll
      if (diceValue === 6) {
        gameState.consecutiveSixes = (gameState.consecutiveSixes || 0) + 1;
      } else {
        gameState.consecutiveSixes = 0;
      }
      
      console.log(`Dice rolled by ${rollDiceDto.playerId}: ${diceValue}, consecutive sixes: ${gameState.consecutiveSixes}`);

      // Check for three consecutive 6s - lose turn
      if (gameState.consecutiveSixes >= 3) {
        console.log(`Player ${rollDiceDto.playerId} rolled three 6s, losing turn`);
        await this.passTurn(rollDiceDto.roomId, gameState, diceValue);
        return { 
          roomId: rollDiceDto.roomId, 
          diceValue: 0, 
          playerId: rollDiceDto.playerId, 
          noValidMove: true,
          message: 'Three consecutive 6s - turn lost!'
        };
      }

      // Check if the player has any valid moves
      const playerCoins = gameState.coins![rollDiceDto.playerId] || [0, 0, 0, 0];
      const hasValidMove = this.checkValidMoves(playerCoins, diceValue);

      if (!hasValidMove) {
        console.log(`No valid moves for ${rollDiceDto.playerId} (dice: ${diceValue}), passing turn`);
        await this.passTurn(rollDiceDto.roomId, gameState, diceValue);
        return { 
          roomId: rollDiceDto.roomId, 
          diceValue: diceValue, 
          playerId: rollDiceDto.playerId, 
          noValidMove: true,
          message: 'No valid moves available'
        };
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

      return { 
        roomId: rollDiceDto.roomId, 
        diceValue: gameState.diceValue, 
        playerId: rollDiceDto.playerId, 
        noValidMove: false,
        message: diceValue === 6 ? 'You rolled a 6! Extra turn!' : null
      };
    } catch (error) {
      console.error(`Error in rollDice for ${rollDiceDto.playerId}:`, error);
      throw error;
    }
  }

  async moveCoin(moveCoinDto: MoveCoinDto) {
    try {
      const gameState = await this.getGameState(moveCoinDto.roomId);
      
      // Validate it's the player's turn
      if (gameState.currentTurn !== moveCoinDto.playerId) {
        throw new Error('Not your turn');
      }
      
      // Check if dice has been rolled
      if (!gameState.diceRolled) {
        throw new Error('You must roll the dice first');
      }

      // Parse coin ID
      const [color, coinIndexStr] = moveCoinDto.coinId.split('-');
      const coinIndex = parseInt(coinIndexStr) - 1;
      const playerIndex = gameState.players.findIndex((p) => p.id === moveCoinDto.playerId);
      
      if (playerIndex === -1) {
        throw new Error('Player not found');
      }

      const playerCoins = gameState.coins![moveCoinDto.playerId];
      const coinPosition = playerCoins[coinIndex];
      let newPosition = coinPosition;
      let captured = false;

      console.log(`Move coin attempt: ${moveCoinDto.coinId} by ${moveCoinDto.playerId}, current position: ${coinPosition}, dice: ${gameState.diceValue}`);

      // Validate move
      if (coinPosition === 0 && gameState.diceValue === 6) {
        // Moving coin from base to start position
        newPosition = this.startPositions[playerIndex];
      } else if (coinPosition > 0 && coinPosition < 57) {
        // Moving coin on the board
        newPosition = coinPosition + gameState.diceValue!;
        
        // Check if move exceeds home
        if (newPosition > 57) {
          throw new Error('Invalid move: Beyond home');
        }
        
        // Check if move is valid in home stretch
        if (newPosition > 51 && newPosition < 57) {
          const homeStretchPosition = newPosition - 51;
          if (homeStretchPosition > 6) {
            throw new Error('Invalid move: Beyond home stretch');
          }
        }
      } else {
        throw new Error('Invalid move: Coin in base requires a 6');
      }

      // Check for captures (only on non-safe positions and not in home column)
      if (newPosition <= 51 && !this.safePositions.includes(newPosition % 52)) {
        for (const opponentId of Object.keys(gameState.coins!)) {
          if (opponentId !== moveCoinDto.playerId) {
            const opponentCoins = gameState.coins![opponentId];
            opponentCoins.forEach((pos, idx) => {
              if (pos === newPosition) {
                // Capture opponent coin
                gameState.coins![opponentId][idx] = 0;
                const opponentPlayerIndex = gameState.players.findIndex((p) => p.id === opponentId);
                if (opponentPlayerIndex !== -1) {
                  gameState.players[opponentPlayerIndex].coins![idx] = 0;
                }
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
      const hasWon = this.checkWinCondition(gameState.coins![moveCoinDto.playerId]);
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
        console.log(`Normal turn completion for ${moveCoinDto.playerId}, passing to next player`);
        await this.passTurn(moveCoinDto.roomId, gameState);
      } else {
        // Extra turn for 6 or capture
        console.log(`Extra turn for ${moveCoinDto.playerId} - ${gameState.diceValue === 6 ? 'rolled 6' : 'captured opponent'}`);
        gameState.diceRolled = false;
        gameState.diceValue = 0; // Reset dice for next roll
        // Don't pass turn - same player continues
        await this.updateGameState(moveCoinDto.roomId, gameState);
      }

      // If next player is AI and the turn was passed, trigger their turn
      if (gameState.currentTurn.startsWith('ai-') && !gameState.gameOver && gameState.gameStarted) {
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

  private async passTurn(roomId: string, gameState: GameState, diceValue?: number) {
    console.log(`Passing turn from ${gameState.currentTurn} in room ${roomId}`);
    
    // Reset dice values and state
    gameState.diceValue = 0;
    gameState.diceRolled = false;
    gameState.consecutiveSixes = 0;
    
    // Move to next eligible player (must be in room.playerIds)
    const room = await this.getGameRoomById(roomId);
    const eligibleIds = new Set(room?.playerIds || []);
    const previousPlayer = gameState.currentPlayer;
    if (gameState.players.length > 0) {
      let attempts = 0;
      do {
        gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
        attempts++;
        if (attempts > gameState.players.length) break; // safety
      } while (!eligibleIds.has(gameState.players[gameState.currentPlayer].id));
      gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
    }
    
    console.log(`Turn passed from player ${previousPlayer} to player ${gameState.currentPlayer} (${gameState.currentTurn})`);
    
    await this.updateGameState(roomId, gameState);

    // Handle AI turn if next player is AI
    if (gameState.currentTurn.startsWith('ai-') && !gameState.gameOver && gameState.gameStarted) {
      console.log(`Scheduling AI turn for ${gameState.currentTurn}`);
      setTimeout(() => {
        this.handleAITurn(roomId, gameState.currentTurn).catch((error) => {
          console.error(`Error in AI turn for ${gameState.currentTurn}:`, error);
        });
      }, 1000);
    }
  }





  async handleAITurn(roomId: string, aiPlayerId: string) {
    try {
      console.log(`Starting AI turn for ${aiPlayerId} in room ${roomId}`);
      const gameState = await this.getGameState(roomId);
  
      if (gameState.currentTurn !== aiPlayerId || gameState.gameOver) {
        console.log(`AI turn skipped for ${aiPlayerId}: not their turn or game over`);
        return;
      }
      
      if (gameState.diceRolled) {
        console.log(`AI ${aiPlayerId} proceeding with existing dice roll: ${gameState.diceValue}`);
        await this.handleAIMove(roomId, aiPlayerId);
      } else {
        console.log(`AI ${aiPlayerId} rolling dice`);
        const rollResult = await this.rollDice({ roomId, playerId: aiPlayerId });
        console.log(`AI ${aiPlayerId} rolled: ${rollResult.diceValue}`);
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
      if (playerIndex === -1) {
        console.log(`AI player ${aiPlayerId} not found in players array`);
        return;
      }

      const playerCoins = gameState.coins![aiPlayerId] || [0, 0, 0, 0];
      const movableCoins: { index: number; newPosition: number; captures: boolean; priority: number }[] = [];

      // Determine movable coins with priority
      playerCoins.forEach((position, index) => {
        let newPosition = position;
        let captures = false;
        let priority = 0;

        if (position === 0 && gameState.diceValue === 6) {
          // Can move coin from base
          newPosition = this.startPositions[playerIndex];
          priority = 1; // Low priority for moving from base
        } else if (position > 0 && position < 57) {
          newPosition = position + gameState.diceValue!;
          if (newPosition <= 57) {
            // Check for captures
            if (newPosition <= 51 && !this.safePositions.includes(newPosition % 52)) {
              for (const opponentId of Object.keys(gameState.coins!)) {
                if (opponentId !== aiPlayerId && gameState.coins![opponentId].includes(newPosition)) {
                  captures = true;
                  priority = 10; // Highest priority for captures
                  break;
                }
              }
            }
            
            // Check if this is a home stretch move
            if (newPosition > 51) {
              priority = 5; // High priority for home stretch
            } else if (position > 0) {
              priority = 3; // Medium priority for regular moves
            }
          }
        }

        if (newPosition !== position && newPosition <= 57) {
          movableCoins.push({ index, newPosition, captures, priority });
        }
      });

      console.log(`AI ${aiPlayerId} movable coins: ${JSON.stringify(movableCoins)}`);

      if (movableCoins.length > 0) {
        // Sort by priority: captures > home stretch > regular moves > base moves
        movableCoins.sort((a, b) => b.priority - a.priority);
        
        const coinToMove = movableCoins[0];
        const coinId = `${gameState.players[playerIndex].color}-${coinToMove.index + 1}`;
        console.log(`AI ${aiPlayerId} moving coin: ${coinId} with priority ${coinToMove.priority}`);
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
      } else if (room.gameType === 'trivia' && gameState.triviaState) {
        gameState.triviaState.currentQuestionIndex = 0;
        gameState.triviaState.questionTimer = 30;
        gameState.players.forEach(player => {
          gameState.triviaState!.answers[player.id] = null;
        });
      } else if (room.gameType === 'chess') {
        // For chess, use the selected chess players
        if (gameState.chessPlayers) {
          gameState.currentTurn = gameState.chessPlayers.player1Id; // White starts
          gameState.currentPlayer = gameState.players.findIndex(p => p.id === gameState.chessPlayers!.player1Id);
        } else {
          // Fallback to first player if chess players not selected
          gameState.currentTurn = gameState.players[0]?.id || '';
          gameState.currentPlayer = 0;
        }
        
        console.log('Chess game started:', {
          currentTurn: gameState.currentTurn,
          chessPlayers: gameState.chessPlayers,
          players: gameState.players.map((p: any) => ({ 
            id: p.id, 
            chessColor: p.chessColor 
          }))
        });
      } else {
        // Ensure starting turn is an eligible player present in room.playerIds
        const roomEntity = await this.getGameRoomById(roomId);
        const eligible = new Set(roomEntity?.playerIds || []);
        if (!eligible.has(gameState.currentTurn) && gameState.players.length > 0) {
          const nextIndex = gameState.players.findIndex(p => eligible.has(p.id));
          if (nextIndex !== -1) {
            gameState.currentPlayer = nextIndex;
            gameState.currentTurn = gameState.players[nextIndex].id;
          }
        }
      }
  
      await this.updateGameState(roomId, gameState);
      
              console.log('Game started, state updated:', {
          roomId,
          gameType: gameState.gameType,
          currentTurn: gameState.currentTurn,
          gameStarted: gameState.gameStarted,
          players: gameState.players.map((p: any) => ({ 
            id: p.id, 
            chessColor: p.chessColor,
            color: p.color,
            score: p.score
          }))
        });
      
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



// COMPLETE FIX FOR CHESS MULTIPLAYER - Replace your makeChessMove method in game.service.ts
async makeChessMove(data: { roomId: string; playerId: string; move: string }) {
  const gameState = await this.getGameState(data.roomId);
  
  console.log('=== BACKEND CHESS MOVE START ===');
  console.log('Move request:', {
    playerId: data.playerId,
    move: data.move,
    currentTurn: gameState.currentTurn,
    gameStarted: gameState.gameStarted,
    gameOver: gameState.gameOver,
    currentBoard: gameState.chessState?.board,
    timestamp: new Date().toISOString()
  });
  
  // Validate game state
  if (gameState.gameType !== 'chess') {
    throw new Error('Not a chess game');
  }
  
  if (!gameState.gameStarted) {
    throw new Error('Game has not started yet');
  }
  
  if (gameState.gameOver) {
    throw new Error('Game is already over');
  }
  
  // CRITICAL: Strict turn validation
  if (gameState.currentTurn !== data.playerId) {
    console.log('❌ Turn validation failed:', {
      expectedPlayer: gameState.currentTurn,
      attemptingPlayer: data.playerId,
      players: gameState.players.map(p => ({ id: p.id, color: p.chessColor }))
    });
    throw new Error(`Not your turn. Current turn belongs to: ${gameState.currentTurn}`);
  }

  // Find the player making the move
  const movingPlayer = gameState.players.find(p => p.id === data.playerId);
  if (!movingPlayer || !movingPlayer.chessColor) {
    throw new Error('Player not found or not assigned a color');
  }

  try {
    // Create chess instance from current board state
    const chess = new Chess(gameState.chessState!.board);
    
    console.log('Chess state validation:', {
      fen: chess.fen(),
      boardTurn: chess.turn(),
      playerColor: movingPlayer.chessColor,
      isCheck: chess.inCheck(),
      legalMovesCount: chess.moves().length,
      gameOver: chess.isGameOver()
    });

    // Validate that it's the correct color's turn according to the board
    const boardTurn = chess.turn(); // 'w' or 'b'
    const expectedColor = boardTurn === 'w' ? 'white' : 'black';
    
    if (movingPlayer.chessColor !== expectedColor) {
      console.log('❌ Color/turn mismatch:', {
        boardTurn,
        expectedColor,
        playerColor: movingPlayer.chessColor
      });
      throw new Error(`It's ${expectedColor}'s turn, but you are ${movingPlayer.chessColor}`);
    }

    // Parse the move (format: "e2e4" or "e7e8q" for promotion)
    const fromSquare = data.move.substring(0, 2);
    const toSquare = data.move.substring(2, 4);
    const promotion = data.move.length > 4 ? data.move.substring(4) : 'q';

    console.log('Move parsing:', {
      rawMove: data.move,
      fromSquare,
      toSquare,
      promotion: data.move.length > 4 ? promotion : 'none'
    });

    // Attempt to make the move
    const move = chess.move({
      from: fromSquare,
      to: toSquare,
      promotion: promotion
    });

    if (!move) {
      console.log('❌ Invalid move:', {
        from: fromSquare,
        to: toSquare,
        promotion: promotion,
        legalMoves: chess.moves().slice(0, 10), // Show first 10 legal moves for debugging
        currentFen: chess.fen()
      });
      throw new Error(`Invalid chess move: ${data.move}`);
    }

    console.log('✅ Valid move executed:', {
      moveNotation: move.san,
      from: move.from,
      to: move.to,
      piece: move.piece,
      captured: move.captured,
      newFen: chess.fen(),
      check: chess.inCheck(),
      checkmate: chess.isCheckmate()
    });

    // Update game state with new board position
    gameState.chessState = {
      board: chess.fen(),
      moves: [...(gameState.chessState?.moves || []), move.san]
    };

    // CRITICAL: Handle turn switching and game end detection
    if (chess.isGameOver()) {
      console.log('🏁 Game Over Detected');
      gameState.gameOver = true;
      
      if (chess.isCheckmate()) {
        gameState.winner = data.playerId; // The player who just moved is the winner
        gameState.winCondition = 'checkmate';
        console.log(`🏆 Checkmate! Winner: ${data.playerId} (${movingPlayer.chessColor})`);
      } else if (chess.isStalemate()) {
        gameState.winner = 'draw';
        gameState.winCondition = 'stalemate';
        console.log('🤝 Stalemate - Draw');
      } else if (chess.isDraw()) {
        gameState.winner = 'draw';
        if (chess.isInsufficientMaterial()) {
          gameState.winCondition = 'insufficient_material';
        } else if (chess.isThreefoldRepetition()) {
          gameState.winCondition = 'threefold_repetition';
        } else {
          gameState.winCondition = 'fifty_move_rule';
        }
        console.log(`🤝 Draw: ${gameState.winCondition}`);
      }
      
      // Update database
      await this.gameRoomModel.updateOne(
        { roomId: data.roomId }, 
        { status: 'completed', winner: gameState.winner }
      );
      await this.saveGameSession(data.roomId, gameState);
    } else {
      // CRITICAL: Proper turn switching logic
      const nextBoardTurn = chess.turn(); // Get the next turn from chess.js
      const nextColor = nextBoardTurn === 'w' ? 'white' : 'black';
      
      console.log('🔄 Turn switching logic:', {
        currentMoveBy: data.playerId,
        currentMoveColor: movingPlayer.chessColor,
        nextBoardTurn,
        nextColor,
        availablePlayers: gameState.players.map(p => ({ id: p.id, color: p.chessColor }))
      });
      
      // Find the player with the next color
      const nextPlayer = gameState.players.find(p => p.chessColor === nextColor);
      
      if (!nextPlayer) {
        console.error('❌ Critical error: No player found for next color:', {
          nextColor,
          nextBoardTurn,
          players: gameState.players.map(p => ({ id: p.id, color: p.chessColor }))
        });
        throw new Error('Chess game configuration error - missing player for next turn');
      }
      
      // Update the game state turn
      const previousTurn = gameState.currentTurn;
      gameState.currentTurn = nextPlayer.id;
      gameState.currentPlayer = gameState.players.findIndex(p => p.id === nextPlayer.id);
      
      console.log('✅ Turn switched successfully:', {
        previousPlayer: previousTurn,
        previousColor: movingPlayer.chessColor,
        nextPlayer: nextPlayer.id,
        nextPlayerColor: nextColor,
        boardTurn: nextBoardTurn,
        currentPlayerIndex: gameState.currentPlayer
      });
    }

    // CRITICAL: Save state immediately and verify it was saved
    await this.updateGameState(data.roomId, gameState);
    
    // Verify the state was saved correctly
    const verifyState = await this.getGameState(data.roomId);
    console.log('🔍 State verification:', {
      savedCurrentTurn: verifyState.currentTurn,
      savedBoard: verifyState.chessState?.board?.substring(0, 20) + '...',
      savedMoveCount: verifyState.chessState?.moves?.length || 0,
      gameOver: verifyState.gameOver
    });

    console.log('=== BACKEND CHESS MOVE COMPLETED ===');
    console.log('Final response data:', {
      roomId: data.roomId,
      moveNotation: move.san,
      newTurn: gameState.currentTurn,
      gameOver: gameState.gameOver,
      winner: gameState.winner,
      moveNumber: gameState.chessState?.moves?.length || 0,
      timestamp: new Date().toISOString()
    });

    return { 
      roomId: data.roomId, 
      move: move.san, 
      gameState, // Return the complete updated game state
      moveDetails: {
        from: move.from,
        to: move.to,
        piece: move.piece,
        captured: move.captured,
        san: move.san,
        fen: chess.fen(),
        check: chess.inCheck(),
        checkmate: chess.isCheckmate()
      },
      success: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Chess move processing error:', {
      error: error.message,
      playerId: data.playerId,
      move: data.move,
      currentTurn: gameState.currentTurn,
      gameState: {
        started: gameState.gameStarted,
        over: gameState.gameOver,
        currentBoard: gameState.chessState?.board?.substring(0, 30) + '...'
      }
    });
    throw error;
  }
}

async selectChessPlayers(data: { roomId: string; hostId: string; player1Id: string; player2Id: string }) {
  const gameState = await this.getGameState(data.roomId);
  const room = await this.getGameRoomById(data.roomId);

  if (room?.host !== data.hostId) {
    throw new Error('Only the host can select chess players');
  }

  if (gameState.gameType !== 'chess') {
    throw new Error('This is not a chess game');
  }

  if (data.player1Id === data.player2Id) {
    throw new Error('Cannot select the same player for both sides');
  }

  // Ensure both players exist in the room (either as players or spectators)
  const allParticipants = [...(room?.playerIds || []), ...(room?.spectatorIds || [])];
  if (!allParticipants.includes(data.player1Id) || !allParticipants.includes(data.player2Id)) {
    throw new Error('Selected players must be in the room');
  }

  // Store chess players selection
  gameState.chessPlayers = {
    player1Id: data.player1Id,
    player2Id: data.player2Id
  };

  // Clear existing players and add only the selected chess players
  gameState.players = [
    {
      id: data.player1Id,
      name: data.player1Id,
      chessColor: 'white' as const
    },
    {
      id: data.player2Id,
      name: data.player2Id,
      chessColor: 'black' as const
    }
  ];

  // White always goes first
  gameState.currentTurn = data.player1Id;
  gameState.currentPlayer = 0;

  // Reset chess state to initial position
  gameState.chessState = {
    board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: []
  };

  await this.updateGameState(data.roomId, gameState);

  console.log('Chess players selected:', {
    roomId: data.roomId,
    host: data.hostId,
    player1: { id: data.player1Id, color: 'white' },
    player2: { id: data.player2Id, color: 'black' },
    initialTurn: gameState.currentTurn,
    currentPlayerIndex: gameState.currentPlayer,
    initialBoard: gameState.chessState.board
  });

  return { 
    roomId: data.roomId, 
    chessPlayers: gameState.chessPlayers,
    currentTurn: gameState.currentTurn,
    gameState 
  };
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

  async submitTriviaAnswer(data: { roomId: string; playerId: string; qId: string; answer: string | null; correct?: string; isCorrect?: boolean }) {
    const gameState = await this.getGameState(data.roomId);
    if (gameState.gameType !== 'trivia') throw new Error('Invalid game type');
    if (!gameState.triviaState) throw new Error('Trivia state not initialized');
    if (gameState.triviaState.answers[data.playerId] !== null) throw new Error('Answer already submitted');

    gameState.triviaState.answers[data.playerId] = data.answer ? 0 : null; // Simple answer tracking
    if (data.isCorrect) {
      gameState.triviaState.scores[data.playerId] = (gameState.triviaState.scores[data.playerId] || 0) + 10;
    }
    
    const allAnswered = gameState.players.every(p => gameState.triviaState!.answers[p.id] !== null);
    
    if (allAnswered) {
      await this.processTriviaQuestion(data.roomId);
    } else {
      await this.updateGameState(data.roomId, gameState);
    }
    return { roomId: data.roomId, playerId: data.playerId, answer: data.answer, isCorrect: data.isCorrect };
  }

  async completeTriviaGame(data: { roomId: string; playerId: string; score: number; total: number }) {
    const gameState = await this.getGameState(data.roomId);
    if (gameState.gameType !== 'trivia') throw new Error('Invalid game type');
    
    // Update final scores
    gameState.triviaState!.scores[data.playerId] = data.score;
    
    // Determine winner
    const winner = Object.entries(gameState.triviaState!.scores).reduce((a, b) => 
      (gameState.triviaState!.scores[a[0]] || 0) > (gameState.triviaState!.scores[b[0]] || 0) ? a : b
    )[0];
    
    gameState.winner = winner;
    gameState.gameOver = true;
    
    await this.updateGameState(data.roomId, gameState);
    await this.gameRoomModel.updateOne({ roomId: data.roomId }, { status: 'completed', winner });
    await this.saveGameSession(data.roomId, gameState);
    
    return { roomId: data.roomId, winner, scores: gameState.triviaState!.scores };
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

  async processTriviaQuestion(roomId: string) {
    const gameState = await this.getGameState(roomId);
    if (!gameState.triviaState) throw new Error('Trivia state not initialized');
    
    gameState.triviaState.currentQuestionIndex++;
    if (gameState.triviaState.currentQuestionIndex >= gameState.triviaState.questions.length) {
      gameState.gameOver = true;
      gameState.winner = gameState.players.reduce((a, b) => 
        (gameState.triviaState!.scores[a.id] || 0) > (gameState.triviaState!.scores[b.id] || 0) ? a : b
      ).id;
      await this.gameRoomModel.updateOne({ roomId }, { status: 'completed', winner: gameState.winner });
      await this.saveGameSession(roomId, gameState);
    } else {
      gameState.triviaState.answers = gameState.players.reduce((acc, p) => ({ ...acc, [p.id]: null }), {});
      gameState.triviaState.questionTimer = 30;
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
      
      // Ensure chessState is always present for chess games
      if (parsedState.gameType === 'chess' && !parsedState.chessState) {
        console.warn(`Chess state missing for room ${roomId}. Initializing default chess state.`);
        parsedState.chessState = {
          board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: []
        };
      }
      
      const enhancedPlayers = await Promise.all(
        parsedState.players.map(async (player) => {
          const playerName = await this.getPlayerName(player.id);
          return {
            ...player,
            name: playerName
          };
        })
      );
      
      const enhancedState = {
        ...parsedState,
        players: enhancedPlayers,
        currentPlayer: parsedState.players.findIndex((p) => p.id === parsedState.currentTurn),
        diceRolled: parsedState.diceValue ? parsedState.diceValue !== 0 : false,
        diceValue: parsedState.diceValue,
      };

      console.log(`Retrieved enhanced game state from Redis for room ${roomId}:`, {
        currentTurn: enhancedState.currentTurn,
        gameStarted: enhancedState.gameStarted,
        gameOver: enhancedState.gameOver,
        gameType: enhancedState.gameType,
        chessStateExists: !!enhancedState.chessState,
        players: enhancedState.players.map((p: any) => ({ 
          id: p.id, 
          name: p.name,
          chessColor: p.chessColor,
          color: p.color,
          score: p.score
        }))
      });
      
      return enhancedState;
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
            host: room.host, // Add this line
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
              board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              moves: [],
            },
          };
          break;
    
        case 'kahoot':
        case 'trivia':
          const questions = room.gameType === 'kahoot' ? await this.fetchTriviaQuestions() : [];
          defaultGameState = {
            roomId,
            gameType: room.gameType,
            roomName: room.name,
            host: room.host, // Add this line
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
            ...(room.gameType === 'kahoot' ? {
              kahootState: {
                currentQuestionIndex: 0,
                questions,
                scores: room.playerIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
                answers: room.playerIds.reduce((acc, id) => ({ ...acc, [id]: null }), {}),
                questionTimer: 20,
              }
            } : {
              triviaState: {
                currentQuestionIndex: 0,
                questions,
                scores: room.playerIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
                answers: room.playerIds.reduce((acc, id) => ({ ...acc, [id]: null }), {}),
                questionTimer: 30,
              }
            })
          };
          break;
        default:
          defaultGameState = {
            roomId,
            gameType: room.gameType,
            roomName: room.name,
            host: room.host, // Add this line
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
              console.log('Default game state created and saved:', {
          roomId,
          gameType: defaultGameState.gameType,
          currentTurn: defaultGameState.currentTurn,
          players: defaultGameState.players.map((p: any) => ({ 
            id: p.id, 
            chessColor: p.chessColor,
            color: p.color,
            score: p.score
          }))
        });
      return this.getGameState(roomId);
    } catch (error) {
      console.error(`Error in getGameState for room ${roomId}:`, error);
      throw error;
    }
  }

  async updateGameState(roomId: string, gameState: GameState) {
    try {
      await this.redisService.set(`game:${roomId}`, JSON.stringify(gameState));
      console.log(`Game state updated for room ${roomId}:`, {
        currentTurn: gameState.currentTurn,
        gameStarted: gameState.gameStarted,
        gameOver: gameState.gameOver,
        gameType: gameState.gameType,
        players: gameState.players.map((p: any) => ({ 
          id: p.id, 
          chessColor: p.chessColor,
          color: p.color,
          score: p.score
        }))
      });
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
        isTournament: false
      };

      // Update user stats for all players - Award 5 points for wins
      for (const player of gameState.players) {
        let score = 0;
        
        // Calculate score based on game type - Winner gets 5 points, others get 1 point
        if (gameState.gameType === 'ludo') {
          score = gameState.winner === player.id ? 5 : 1;
        } else if (gameState.kahootState?.scores?.[player.id] !== undefined) {
          score = gameState.kahootState.scores[player.id];
        } else if (gameState.triviaState?.scores?.[player.id] !== undefined) {
          score = gameState.triviaState.scores[player.id];
        } else {
          // Default scoring for other games - Winner gets 5 points, others get 1 point
          score = gameState.winner === player.id ? 5 : 1;
        }
        
        try {
          await this.userService.updateGameStats(
            player.id,
            gameState.gameType,
            score,
            gameState.winner === player.id
          );
        } catch (error) {
          console.error(`Error updating user stats for player ${player.id}:`, error);
        }
      }

      // Only include gameRoom if the room exists
      if (room) {
        sessionData.gameRoom = room._id as Types.ObjectId;
      }

      const gameSession = new this.gameSessionModel(sessionData);
      await gameSession.save();
      
      console.log(`Game session saved for room ${roomId}, winner: ${gameState.winner}`);
    } catch (error) {
      console.error(`Error in saveGameSession for room ${roomId}:`, error);
    }
  }


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
        .find({ status: { $ne: 'completed' } }) // Exclude completed games
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      
      const roomsWithHostNames = await Promise.all(
        rooms.map(async (room) => {
          let hostName = room.host;
          try {
            // Try to get the actual username from the user service
            const user = await this.userService.findById(room.host);
            if (user && user.username) {
              hostName = user.username;
            }
          } catch (error) {
            console.log(`Could not fetch username for host ${room.host}, using ID as fallback`);
          }
          
          return {
            id: room.roomId,
            roomId: room.roomId,
            name: room.name,
            gameType: room.gameType,
            hostName: hostName,
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
          };
        })
      );
      
      return roomsWithHostNames;
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

      const hosted = await Promise.all(
        rooms
          .filter((room) => room.host === playerId)
          .map(async (room) => {
            let hostName = room.host;
            try {
              const user = await this.userService.findById(room.host);
              if (user && user.username) {
                hostName = user.username;
              }
            } catch (error) {
              console.log(`Could not fetch username for host ${room.host}, using ID as fallback`);
            }
            
            return {
              id: room.roomId,
              roomId: room.roomId,
              name: room.name,
              gameType: room.gameType,
              hostName: hostName,
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
            };
          })
      );

      const joined = await Promise.all(
        rooms
          .filter((room) => room.playerIds.includes(playerId))
          .map(async (room) => {
            let hostName = room.host;
            try {
              const user = await this.userService.findById(room.host);
              if (user && user.username) {
                hostName = user.username;
              }
            } catch (error) {
              console.log(`Could not fetch username for host ${room.host}, using ID as fallback`);
            }
            
            return {
              id: room.roomId,
              roomId: room.roomId,
              name: room.name,
              gameType: room.gameType,
              hostName: hostName,
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
            };
          })
      );

      return { hosted, joined };
    } catch (error) {
      console.error(`Error in getMyGameRooms for ${playerId}:`, error);
      throw error;
    }
  }


  // chat
  // In game.service.ts

async storeChatMessage(roomId: string, playerId: string, message: string) {
  try {
    // Store in Redis with expiration (e.g., 24 hours)
    const chatKey = `chat:${roomId}`;
    const chatMessage = JSON.stringify({
      playerId,
      message,
      timestamp: new Date().toISOString()
    });
    
    await this.redisService.lpush(chatKey, chatMessage);
    await this.redisService.ltrim(chatKey, 0, 100); // Keep only last 100 messages
    await this.redisService.expire(chatKey, 86400); // Expire after 24 hours
  } catch (error) {
    console.error('Error storing chat message:', error);
  }
}

async getChatHistory(roomId: string) {
  try {
    const chatKey = `chat:${roomId}`;
    const messages = await this.redisService.lrange(chatKey, 0, -1);
    return messages.map(msg => JSON.parse(msg));
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return [];
  }
}

async getAllGameRooms() {
  try {
    const rooms = await this.gameRoomModel
      .find({})
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const gamesessions = await this.gameSessionModel
      .find({})
      .lean()
      .exec();

    const roomsWithPlayerData = await Promise.all(
      rooms.map(async (room) => {
        // Get corresponding game session for additional data
        const gameSession = gamesessions.find(session => session.roomId === room.roomId);
        
        // Build players array with username and game data
        const players = await Promise.all(
          room.playerIds.map(async (playerId, index) => {
            let username = playerId;
            let score = 0;
            let position = index + 1;
            let isWinner = false;

            try {
              // Try to get the actual username from the user service
              const user = await this.userService.findById(playerId);
              if (user && user.username) {
                username = user.username;
              }
            } catch (error) {
              console.log(`Could not fetch username for player ${playerId}, using ID as fallback`);
            }

            // Get score and winner info from room scores or game session
            if (room.scores && room.scores[playerId]) {
              score = room.scores[playerId];
            } else if (gameSession?.finalState?.scores?.[playerId]) {
              score = gameSession.finalState.scores[playerId];
            }

            // Check if this player is the winner
            if (room.winner === playerId || gameSession?.winner === playerId) {
              isWinner = true;
              position = 1;
            }

            return {
              id: playerId,
              username: username,
              score: score,
              position: position,
              isWinner: isWinner
            };
          })
        );

        return {
          _id: room._id.toString(),
          roomName: room.name,
          gameType: room.gameType,
          creator: room.host,
          players: players,
          status: room.status,
          createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : new Date().toISOString(),
          startedAt: gameSession?.startedAt ? new Date(gameSession.startedAt).toISOString() : undefined,
          endedAt: gameSession?.endedAt ? new Date(gameSession.endedAt).toISOString() : undefined,
          maxPlayers: room.maxPlayers,
          currentPlayers: room.currentPlayers,
          scores: room.scores ? room.scores : {},
          winner: room.winner || gameSession?.winner
        };
      })
    );

    return {
      success: true,
      data: roomsWithPlayerData
    };
  } catch (error) {
    console.error(`Error in getAllGameRooms:`, error);
    throw error;
  }
}

async endGame(roomId: string, hostId: string) {
  const gameRoom = await this.gameRoomModel.findOne({ roomId });
  if (!gameRoom) throw new Error('Game room not found');
  if (gameRoom.host !== hostId) throw new Error('Only the host can end the game');
  
  // Update status to 'completed' so it won't be displayed in active rooms
  gameRoom.status = 'completed';
  await gameRoom.save();
  
  // Clean up Redis game state
  await this.redisService.del(`game:${roomId}`);
  
  return { success: true, message: 'Game ended successfully' };
}

async restartGame(roomId: string, hostId: string) {
  const gameRoom = await this.gameRoomModel.findOne({ roomId });
  if (!gameRoom) throw new Error('Game room not found');
  if (gameRoom.host !== hostId) throw new Error('Only the host can restart the game');
  
  // Reset game state but keep players
  await this.initializeGameState(roomId, hostId, gameRoom.name, gameRoom.gameType, '');
  
  // Get the fresh game state
  const gameState = await this.getGameState(roomId);
  return gameState;
}

// Add after line 110
private async getPlayerName(playerId: string): Promise<string> {
  if (playerId.startsWith('ai-')) {
    return `AI ${playerId.split('-')[1]}`;
  }
  
  try {
    const user = await this.userService.findById(playerId);
    return user?.username || playerId;
  } catch (error) {
    console.log(`Could not fetch username for player ${playerId}, using ID as fallback`);
    return playerId;
  }
}

private ensureChessPlayersSet(gameState: GameState): void {
  if (!gameState.chessPlayers && gameState.gameType === 'chess') {
    // Auto-assign chess players if not set
    const playersWithColors = gameState.players.filter(p => p.chessColor);
    if (playersWithColors.length >= 2) {
      const whitePlayer = playersWithColors.find(p => p.chessColor === 'white');
      const blackPlayer = playersWithColors.find(p => p.chessColor === 'black');
      
      if (whitePlayer && blackPlayer) {
        gameState.chessPlayers = {
          player1Id: whitePlayer.id,
          player2Id: blackPlayer.id
        };
        console.log('Auto-assigned chess players:', gameState.chessPlayers);
      }
    }
  }
}

}
