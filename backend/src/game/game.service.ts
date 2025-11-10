import { Injectable, Inject } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { GameRoom, GameRoomDocument } from './schemas/game-room.schema';
import { GameSessionEntity, GameSessionDocument } from './schemas/game-session.schema';
import { CreateGameDto, JoinGameDto, MoveCoinDto, RollDiceDto } from './dto/game.dto';
import { TriviaService } from '../trivia/trivia.service';
import { EnhancedTriviaService } from 'src/trivia/enhanced-trivia.service';
import { v4 as uuidv4 } from 'uuid';
import { forwardRef } from '@nestjs/common';
import { Types } from 'mongoose';
import axios from 'axios'; 
import { Socket, Server } from 'socket.io';
import { Chess } from 'chess.js';
import { UserService } from '../user/user.service';
import { ChessService } from 'src/chess/chess.service';

type LeanGameRoom = {
  _id: Types.ObjectId;
  roomId: string;
  name: string;
  gameType: string;
  host: string;
  currentPlayers: number;
  maxPlayers: number;
  isPrivate: boolean;
  status: 'waiting' | 'in-progress' | 'completed';
  createdAt?: Date;
  scheduledTimeCombined?: Date;
  scores?: Record<string, number>;
  playerIds: string[];
  spectatorIds?: string[];
  password?: string;
};

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
  score?: number; // Trivia specific
  chessColor?: 'white' | 'black'; // Chess-specific
}

interface ChessState {
  board: string; // FEN notation for chess position
  moves: string[]; // List of moves in algebraic notation
  capturedPieces?: string[]; // Optional: track captured pieces
}

interface TriviaState {
  currentQuestionIndex: number;
  questions: { id: string; text: string; options: string[]; correctAnswer: string }[]; // Updated to match Gemini structure
  scores: Record<string, number>;
  answers: Record<string, { answer: string | null; isCorrect: boolean | null }>; // Updated to track answer and correctness
  questionTimer: number; 
  completedPlayers?: string[]; 
}

interface TriviaSettings {
  questionCount: number;
  difficulty: string;
  category: string;
}

interface GameState {
  roomId: string;
  players: Player[];
  currentTurn: string;
  currentPlayer: number;
  currentPlayerIndex?: number;
  gameStarted: boolean;
  gameOver: boolean;
  winner: string | null;
  roomName: string;
  gameType: string;
  host?: string; 
  // Trivia Sttings
  triviaSettings?: {
    questionCount: number; 
    difficulty: string; 
    category: string; 
  }
  // Ludo-specific
  diceValue?: number;
  diceRolled?: boolean;
  consecutiveSixes?: number;
  coins?: Record<string, number[]>;
  // Chess-specific
  chessState?: ChessState;
  chessPlayers?: { player1Id: string; player2Id: string }; 
  triviaState?: TriviaState; 
  winCondition?: string; 
  deck?: [];  
  discardPile?: [];
  playerTurn?: string;
  playerIds?: string[];
  spectatorIds?: string[];
  currentColor?: string;
  currentValue?: string; 
  direction?: number; 
  pendingDraw?: number; 
  pendingColorChoice?: boolean;
  lastPlayer?: any; 
  consecutivePasses?: number;
}

export interface PlayerPoints {
  playerId: string;
  name: string;
  color: string;
  position: number;
  points: number;
}

@Injectable()
export class GameService {
  private server: Server;



private boardPath: number[][] = [
  // RED starting area (position 0) - moving right
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], 
  // Corner to BLUE area
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  // BLUE starting area (position 13) - moving down
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  // Corner to GREEN area
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  // GREEN starting area (position 26) - moving left
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  // Corner to YELLOW area
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  // YELLOW starting area (position 39) - moving up
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  // Back to RED area
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0] // Position 51 - just before RED start
];

  //private startPositions: number[] = [1, 14, 27, 40];
  // private safePositions = [1, 9, 14, 22, 27, 35, 40, 48];
  private startPositions: number[] = [0, 13, 26, 39]; // Red, Blue, Green, Yellow

// 3. Safe positions (indices in the circular path)
private safePositions = [0, 8, 13, 21, 26, 34, 39, 47];

// 4. Home stretch entrance position
private homeColumnStart = 52;

  // private homeStretch: { [key: number]: number[][] } = {
  //   0: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], // Red
  //   1: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]], // Blue
  //   2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], // Green
  //   3: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], // Yellow
  // };
  private homeStretch: { [key: number]: number[][] } = {
    0: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], // Red home stretch
    1: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]], // Blue home stretch
    2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], // Green home stretch
    3: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], // Yellow home stretch
  };

  chessService: ChessService;

  constructor(
    private readonly redisService: RedisService,
    @InjectModel(GameRoom.name) private gameRoomModel: Model<GameRoomDocument>,
    @InjectModel(GameSessionEntity.name) private gameSessionModel: Model<GameSessionDocument>,
    private readonly triviaService: TriviaService,
    private readonly enhancedTriviaService: EnhancedTriviaService,
    private readonly userService: UserService,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }



    
    private getBoardPosition(playerIndex: number, position: number): number[] | null {
  if (position === 0) return null; // Coin in base
  if (position === 57) return [7, 7]; // Home center
  
  // Home stretch positions (52-57)
  if (position >= 52 && position <= 57) {
    const homeIndex = position - 52;
    return this.homeStretch[playerIndex][homeIndex];
  }
  
  // Regular board positions (1-51)
  // Formula: Start at player's start position, add (position - 1) steps
  const pathIndex = (this.startPositions[playerIndex] + (position - 1)) % 52;
  return this.boardPath[pathIndex];
}
  
    // Update the checkValidMoves method to use the same logic as frontend
    // private checkValidMoves(playerCoins: number[], diceValue: number): boolean {
    //   // Can always move if dice is 6 (can bring coin from base)
    //   if (diceValue === 6) return true;
      
    //   // Check if any coin can move on the board
    //   return playerCoins.some(pos => {
    //     if (pos === 0) return false; // Coin in base, can't move without 6
    //     if (pos >= 57) return false; // Coin already home
        
    //     // For home stretch, check if move won't exceed home
    //     if (pos >= 52 && pos < 57) {
    //       return pos + diceValue <= 57;
    //     }
        
    //     // For regular positions
    //     return pos + diceValue <= 57;
    //   });
    // }


    private checkValidMoves(playerCoins: number[], diceValue: number, playerIndex: number): boolean {
      return playerCoins.some((pos, coinIndex) => {
        // Coin in base - can only move with 6
        if (pos === 0) {
          return diceValue === 6;
        }
        
        // Coin already home - cannot move
        if (pos === 57) {
          return false;
        }
        
        const newPosition = pos + diceValue;
        
        // Check if move exceeds home
        if (newPosition > 57) {
          return false;
        }
        
        // Check if entering home stretch
        if (pos < 52 && newPosition >= 52) {
          // Calculate how many steps around the board the coin has taken
          const currentPathIndex = (this.startPositions[playerIndex] + (pos - 1)) % 52;
          const stepsFromStart = pos - 1;
          
          // Check if this player can enter home stretch at this position
          // Each player enters home stretch after completing almost full circle (around 51 steps)
          return stepsFromStart >= 50;
        }
        
        return true;
      });
    }


  // Helper method to check win condition
  private checkWinCondition(playerCoins: number[]): boolean {
    return playerCoins.every(pos => pos === 57);
  }




async createGame(createGameDto: CreateGameDto) {
  const validGameTypes = ['ludo', 'trivia', 'chess', 'uno', 'pictionary', 'sudoku'];
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
  
  // Allow more than two users to join chess rooms (only two will be selected to play later)
  const maxPlayers = createGameDto.gameType.toLowerCase() === 'chess' ? 10 : 4;
  
  const gameRoomData: any = {
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
  };

  // Add triviaSettings if gameType is trivia 
  if (createGameDto.gameType.toLowerCase() === 'trivia' && createGameDto.triviaSettings) {
    gameRoomData.triviaSettings = {
      questionCount: createGameDto.triviaSettings.questionCount,
      difficulty: createGameDto.triviaSettings.difficulty,
      category: createGameDto.triviaSettings.category,
    };
    
    console.log('Storing trivia settings in game room:', gameRoomData.triviaSettings);
  }

  const gameRoom = new this.gameRoomModel(gameRoomData);
  await gameRoom.save();
  
  await this.initializeGameState(
    roomId, 
    createGameDto.hostId, 
    createGameDto.name, 
    createGameDto.gameType,
    createGameDto.triviaSettings // Pass trivia settings to game state initialization
  );
  
  console.log('Game created and initialized:', {
    roomId,
    gameType: createGameDto.gameType,
    hostId: createGameDto.hostId,
    maxPlayers: gameRoom.maxPlayers,
    triviaSettings: gameRoom.triviaSettings
  });
  
  return gameRoom;
}

private async initializeGameState(
  roomId: string, 
  hostId: string, 
  roomName: string, 
  gameType: string,
  triviaSettings?: any
) {
  const colors = ['red', 'blue', 'green', 'yellow'];
  // const colors = ['red', 'yellow', 'green', 'blue'];
  let initialGameState: GameState;

  // Get current room to preserve player lists
  const currentRoom = await this.getGameRoomById(roomId);
  const playerIds = currentRoom?.playerIds || [hostId];
  const spectatorIds = currentRoom?.spectatorIds || [];

  console.log(`Initializing game state for ${gameType}:`, {
    roomId,
    playerIds: playerIds.length,
    spectatorIds: spectatorIds.length
  });

  switch (gameType.toLowerCase()) {
    case 'trivia':
      initialGameState = {
        roomId,
        players: playerIds.map(id => ({ id, name: id, score: 0 })),
        currentTurn: playerIds[0] || hostId,
        currentPlayer: 0,
        gameStarted: false,
        gameOver: false,
        winner: null,
        roomName,
        gameType: gameType.toLowerCase(),
        host: hostId,
        triviaState: {
          currentQuestionIndex: 0,
          questions: [],
          scores: playerIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
          answers: playerIds.reduce((acc, id) => ({ ...acc, [id]: { answer: null, isCorrect: null } }), {}),
          questionTimer: 30,
          completedPlayers: [], 
        },
        triviaSettings: triviaSettings
      };
      break;

    case 'chess':
      initialGameState = {
        roomId,
        players: playerIds.map(id => ({ 
          id, 
          name: id, 
          chessColor: undefined // Will be set when host selects players
        })),
        currentTurn: playerIds[0] || hostId,
        currentPlayer: 0,
        gameStarted: false,
        gameOver: false,
        winner: null,
        roomName,
        gameType: gameType.toLowerCase(),
        host: hostId,
        chessState: {
          board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: []
        },
        chessPlayers: undefined // Will be set when host selects players
      };
      break;
    
case 'uno':
  initialGameState = {
    roomId,
    players: playerIds.map(id => ({ 
      id, 
      name: id, 
      cards: [],
      hasUno: false,
      score: 0
    })),
    currentTurn: playerIds[0] || hostId,
    currentPlayerIndex: 0,
    gameStarted: false,
    gameOver: false,
    winner: null,
    roomName,
    gameType: gameType.toLowerCase(),
    host: hostId,
    deck: [],
    discardPile: [],
    currentColor: '',
    currentValue: '',
    direction: 1,
    pendingDraw: 0,
    pendingColorChoice: false,
    lastPlayer: null,
    consecutivePasses: 0,
    currentPlayer: 0
  };
  break;

    default: // ludo, pictionary, sudoku
      initialGameState = {
        roomId,
        players: playerIds.map((id, index) => ({ 
          id, 
          name: id, 
          color: colors[index % colors.length], 
          coins: [0, 0, 0, 0] 
        })),
        currentTurn: playerIds[0] || hostId,
        currentPlayer: 0,
        diceValue: 0,
        diceRolled: false,
        consecutiveSixes: 0,
        coins: playerIds.reduce((acc, id) => ({ ...acc, [id]: [0, 0, 0, 0] }), {}),
        gameStarted: false,
        gameOver: false,
        winner: null,
        roomName,
        gameType: gameType.toLowerCase(),
        host: hostId,
     
      };
  }
  
  // Store in Redis with clear logging
  await this.redisService.set(`game:${roomId}`, JSON.stringify(initialGameState));
  console.log(`Game state initialized and stored in Redis for room ${roomId}`);
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
          // Do not auto-assign chess players on join. Host will select two players via selectChessPlayers.
          // We still persist the updated room playerIds/currentPlayers above; no gameState player changes here.
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
        } else if (gameRoom.gameType === 'trivia') {
          // Add player with score and ensure answer maps include them
          if (!gameState.players.find(p => p.id === joinGameDto.playerId)) {
            gameState.players.push({ id: joinGameDto.playerId, name: joinGameDto.playerName || joinGameDto.playerId, score: 0 });
          }
          if (gameState.triviaState) {
            gameState.triviaState.scores[joinGameDto.playerId] = 0;
            gameState.triviaState!.answers[joinGameDto.playerId] = { answer: null, isCorrect: null };
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

  // async rollDice(rollDiceDto: RollDiceDto) {
  //   try {
  //     const gameState = await this.getGameState(rollDiceDto.roomId);
      
  //     // Validate it's the player's turn
  //     if (gameState.currentTurn !== rollDiceDto.playerId) {
  //       throw new Error('Not your turn');
  //     }
      
  //     // Check if game has started
  //     if (!gameState.gameStarted) {
  //       throw new Error('Game has not started yet');}
    
      
  //     // Check if dice can be rolled (allow re-rolling if player got a 6 and hasn't moved yet)
  //     if (gameState.diceRolled && gameState.diceValue !== 6) {
  //       throw new Error('Dice already rolled for this turn');
  //     }

  //     // Roll a new dice value
  //     const diceValue = Math.floor(Math.random() * 6) + 1;
  //     gameState.diceValue = diceValue;
  //     gameState.diceRolled = true;
      
  //     // Initialize consecutiveSixes if not set
  //     if (gameState.consecutiveSixes === undefined) {
  //       gameState.consecutiveSixes = 0;
  //     }
      
  //     // Track consecutive sixes - only count if this is a new turn, not a re-roll
  //     if (diceValue === 6) {
  //       gameState.consecutiveSixes = (gameState.consecutiveSixes || 0) + 1;
  //     } else {
  //       gameState.consecutiveSixes = 0;
  //     }
      
  //     console.log(`Dice rolled by ${rollDiceDto.playerId}: ${diceValue}, consecutive sixes: ${gameState.consecutiveSixes}`);

  //     // Check for three consecutive 6s - lose turn
  //     if (gameState.consecutiveSixes >= 3) {
  //       console.log(`Player ${rollDiceDto.playerId} rolled three 6s, losing turn`);
  //       await this.passTurn(rollDiceDto.roomId, gameState, diceValue);
  //       return { 
  //         roomId: rollDiceDto.roomId, 
  //         diceValue: 0, 
  //         playerId: rollDiceDto.playerId, 
  //         noValidMove: true,
  //         message: 'Three consecutive 6s - turn lost!'
  //       };
  //     }

  //     // Check if the player has any valid moves
  //     const playerCoins = gameState.coins![rollDiceDto.playerId] || [0, 0, 0, 0];
  //     const hasValidMove = this.checkValidMoves(playerCoins, diceValue);

  //     if (!hasValidMove) {
  //       console.log(`No valid moves for ${rollDiceDto.playerId} (dice: ${diceValue}), passing turn`);
  //       await this.passTurn(rollDiceDto.roomId, gameState, diceValue);
  //       return { 
  //         roomId: rollDiceDto.roomId, 
  //         diceValue: diceValue, 
  //         playerId: rollDiceDto.playerId, 
  //         noValidMove: true,
  //         message: 'No valid moves available'
  //       };
  //     }

  //     await this.updateGameState(rollDiceDto.roomId, gameState);

   

  //     return { 
  //       roomId: rollDiceDto.roomId, 
  //       diceValue: gameState.diceValue, 
  //       playerId: rollDiceDto.playerId, 
  //       noValidMove: false,
  //       message: diceValue === 6 ? 'You rolled a 6! Extra turn!' : null
  //     };
  //   } catch (error) {
  //     console.error(`Error in rollDice for ${rollDiceDto.playerId}:`, error);
  //     throw error;
  //   }
  // }


  async rollDice(rollDiceDto: RollDiceDto) {
    try {
      const gameState = await this.getGameState(rollDiceDto.roomId);
      
      if (gameState.currentTurn !== rollDiceDto.playerId) {
        throw new Error('Not your turn');
      }
      
      if (!gameState.gameStarted) {
        throw new Error('Game has not started yet');
      }
      
      if (gameState.diceRolled && gameState.diceValue !== 6) {
        throw new Error('Dice already rolled for this turn');
      }
  
      const diceValue = Math.floor(Math.random() * 6) + 1;
      gameState.diceValue = diceValue;
      gameState.diceRolled = true;
      
      if (gameState.consecutiveSixes === undefined) {
        gameState.consecutiveSixes = 0;
      }
      
      if (diceValue === 6) {
        gameState.consecutiveSixes = (gameState.consecutiveSixes || 0) + 1;
      } else {
        gameState.consecutiveSixes = 0;
      }
  
      if (gameState.consecutiveSixes >= 3) {
        await this.passTurn(rollDiceDto.roomId, gameState, diceValue);
        return { 
          roomId: rollDiceDto.roomId, 
          diceValue: 0, 
          playerId: rollDiceDto.playerId, 
          noValidMove: true,
          message: 'Three consecutive 6s - turn lost!'
        };
      }
  
      const playerIndex = gameState.players.findIndex(p => p.id === rollDiceDto.playerId);
      const playerCoins = gameState.coins![rollDiceDto.playerId] || [0, 0, 0, 0];
      const hasValidMove = this.checkValidMoves(playerCoins, diceValue, playerIndex);
  
      if (!hasValidMove) {
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
  
      return { 
        roomId: rollDiceDto.roomId, 
        diceValue: gameState.diceValue, 
        playerId: rollDiceDto.playerId, 
        noValidMove: false,
        message: diceValue === 6 ? 'You rolled a 6! Extra turn!' : null
      };
    } catch (error) {
      console.error(`Error in rollDice:`, error);
      throw error;
    }
  }
  

  // async moveCoin(moveCoinDto: MoveCoinDto) {
  //   try {
  //     const gameState = await this.getGameState(moveCoinDto.roomId);
      
  //     // Validate it's the player's turn
  //     if (gameState.currentTurn !== moveCoinDto.playerId) {
  //       throw new Error('Not your turn');
  //     }
      
  //     // Check if dice has been rolled
  //     if (!gameState.diceRolled) {
  //       throw new Error('You must roll the dice first');
  //     }

  //     // Parse coin ID
  //     const [color, coinIndexStr] = moveCoinDto.coinId.split('-');
  //     const coinIndex = parseInt(coinIndexStr) - 1;
  //     const playerIndex = gameState.players.findIndex((p) => p.id === moveCoinDto.playerId);
      
  //     if (playerIndex === -1) {
  //       throw new Error('Player not found');
  //     }

  //     const playerCoins = gameState.coins![moveCoinDto.playerId];
  //     const coinPosition = playerCoins[coinIndex];
  //     let newPosition = coinPosition;
  //     let captured = false;

  //     console.log(`Move coin attempt: ${moveCoinDto.coinId} by ${moveCoinDto.playerId}, current position: ${coinPosition}, dice: ${gameState.diceValue}`);

  //     // Validate move using same logic as frontend
  //     if (coinPosition === 0 && gameState.diceValue === 6) {
  //       // Moving coin from base to start position
  //       newPosition = this.startPositions[playerIndex];
  //     } else if (coinPosition > 0 && coinPosition < 57) {
  //       // Moving coin on the board
  //       newPosition = coinPosition + gameState.diceValue!;
        
  //       // Check if move exceeds home
  //       if (newPosition > 57) {
  //         throw new Error('Invalid move: Beyond home');
  //       }
        
  //       // Check if move is valid in home stretch
  //       if (newPosition > 51 && newPosition < 57) {
  //         const homeStretchPosition = newPosition - 51;
  //         if (homeStretchPosition > 6) {
  //           throw new Error('Invalid move: Beyond home stretch');
  //         }
  //       }
  //     } else {
  //       throw new Error('Invalid move: Coin in base requires a 6');
  //     }

  //     // Check for captures (only on non-safe positions and not in home column)
  //     // Use the same safe position logic as frontend
  //     const isSafePosition = (position: number): boolean => {
  //       if (position > 51) return true; // Home stretch is safe
  //       const adjustedPosition = position % 52;
  //       return this.safePositions.includes(adjustedPosition);
  //     };

  //     if (newPosition <= 51 && !isSafePosition(newPosition)) {
  //       for (const opponentId of Object.keys(gameState.coins!)) {
  //         if (opponentId !== moveCoinDto.playerId) {
  //           const opponentCoins = gameState.coins![opponentId];
  //           opponentCoins.forEach((pos, idx) => {
  //             if (pos === newPosition) {
  //               // Capture opponent coin
  //               gameState.coins![opponentId][idx] = 0;
  //               const opponentPlayerIndex = gameState.players.findIndex((p) => p.id === opponentId);
  //               if (opponentPlayerIndex !== -1) {
  //                 gameState.players[opponentPlayerIndex].coins![idx] = 0;
  //               }
  //               captured = true;
  //               console.log(`Captured opponent coin at position ${newPosition} for player ${opponentId}`);
  //             }
  //           });
  //         }
  //       }
  //     }

  //     // Update coin position
  //     gameState.coins![moveCoinDto.playerId][coinIndex] = newPosition;
  //     gameState.players[playerIndex].coins![coinIndex] = newPosition;
  //     console.log(`Coin moved: ${moveCoinDto.coinId} to position ${newPosition}`);

  //     // Check win condition
  //     const hasWon = this.checkWinCondition(gameState.coins![moveCoinDto.playerId]);
  //     if (hasWon) {
  //       gameState.winner = moveCoinDto.playerId;
  //       gameState.gameOver = true;
  //       await this.gameRoomModel.updateOne(
  //         { roomId: moveCoinDto.roomId },
  //         { status: 'completed', winner: moveCoinDto.playerId },
  //       );
  //       await this.saveGameSession(moveCoinDto.roomId, gameState);
  //       console.log(`Player ${moveCoinDto.playerId} has won!`);
  //     }

  //     // Update turn logic - same as frontend
  //     if (gameState.diceValue !== 6 && !captured) {
  //       // Normal turn: Pass to next player
  //       console.log(`Normal turn completion for ${moveCoinDto.playerId}, passing to next player`);
  //       await this.passTurn(moveCoinDto.roomId, gameState);
  //     } else {
  //       // Extra turn for 6 or capture
  //       console.log(`Extra turn for ${moveCoinDto.playerId} - ${gameState.diceValue === 6 ? 'rolled 6' : 'captured opponent'}`);
  //       gameState.diceRolled = false;
  //       gameState.diceValue = 0; // Reset dice for next roll
  //       // Don't pass turn - same player continues
  //       await this.updateGameState(moveCoinDto.roomId, gameState);
  //     }


  //     return {
  //       roomId: moveCoinDto.roomId,
  //       coins: gameState.coins,
  //       currentTurn: gameState.currentTurn,
  //       currentPlayer: gameState.currentPlayer,
  //       diceValue: gameState.diceValue,
  //       diceRolled: gameState.diceRolled,
  //       gameOver: gameState.gameOver,
  //       winner: gameState.winner,
  //     };
  //   } catch (error) {
  //     console.error(`Error in moveCoin for ${moveCoinDto.playerId}:`, error);
  //     throw error;
  //   }
  // }


  async moveCoin(moveCoinDto: MoveCoinDto) {
    try {
      const gameState = await this.getGameState(moveCoinDto.roomId);
      
      if (gameState.currentTurn !== moveCoinDto.playerId) {
        throw new Error('Not your turn');
      }
      
      if (!gameState.diceRolled) {
        throw new Error('You must roll the dice first');
      }
  
      const [color, coinIndexStr] = moveCoinDto.coinId.split('-');
      const coinIndex = parseInt(coinIndexStr) - 1;
      const playerIndex = gameState.players.findIndex((p) => p.id === moveCoinDto.playerId);
      
      if (playerIndex === -1) {
        throw new Error('Player not found');
      }
  
      const playerCoins = gameState.coins![moveCoinDto.playerId];
      const coinPosition = playerCoins[coinIndex];
      let newPosition: number;
      let captured = false;
  
      console.log(`Move attempt: Player ${playerIndex} (${color}), Coin ${coinIndex}, Position ${coinPosition} -> ${coinPosition + gameState.diceValue!}`);
  
      // Moving coin from base
      if (coinPosition === 0 && gameState.diceValue === 6) {
        newPosition = 1; // All players start at position 1 (their entry point)
        console.log(`Moving coin from base to position 1`);
      } 
      // Moving coin on board
      else if (coinPosition > 0 && coinPosition < 57) {
        newPosition = coinPosition + gameState.diceValue!;
        
        if (newPosition > 57) {
          throw new Error('Invalid move: Exceeds home position');
        }
        
        // Check if entering home stretch
        if (coinPosition < 52 && newPosition >= 52) {
          // Calculate steps taken from start
          const stepsFromStart = coinPosition - 1;
          
          // Player must complete ~51 steps before entering home stretch
          if (stepsFromStart < 50) {
            throw new Error('Invalid move: Not ready for home stretch yet');
          }
          
          console.log(`Entering home stretch at position ${newPosition}`);
        }
      } 
      else {
        throw new Error('Invalid move: Coin cannot move');
      }
  
      // Check for captures (only on regular board, positions 1-51, non-safe positions)
      if (newPosition >= 1 && newPosition <= 51) {
        const newBoardPosition = this.getBoardPosition(playerIndex, newPosition);
        
        // Check if this is a safe position
        const pathIndex = (this.startPositions[playerIndex] + (newPosition - 1)) % 52;
        const isSafe = this.safePositions.includes(pathIndex);
        
        if (!isSafe && newBoardPosition) {
          // Check all opponent coins
          for (const opponentId of Object.keys(gameState.coins!)) {
            if (opponentId !== moveCoinDto.playerId) {
              const opponentPlayerIndex = gameState.players.findIndex(p => p.id === opponentId);
              const opponentCoins = gameState.coins![opponentId];
              
              opponentCoins.forEach((opponentPos, opponentCoinIndex) => {
                if (opponentPos >= 1 && opponentPos <= 51) {
                  const opponentBoardPos = this.getBoardPosition(opponentPlayerIndex, opponentPos);
                  
                  // Check if positions match
                  if (opponentBoardPos && 
                      opponentBoardPos[0] === newBoardPosition[0] && 
                      opponentBoardPos[1] === newBoardPosition[1]) {
                    // Capture!
                    gameState.coins![opponentId][opponentCoinIndex] = 0;
                    gameState.players[opponentPlayerIndex].coins![opponentCoinIndex] = 0;
                    captured = true;
                    console.log(`Captured opponent coin at [${newBoardPosition[0]}, ${newBoardPosition[1]}]`);
                  }
                }
              });
            }
          }
        }
      }
  
      // Update coin position
      gameState.coins![moveCoinDto.playerId][coinIndex] = newPosition;
      gameState.players[playerIndex].coins![coinIndex] = newPosition;
  
      // Check win condition
      const hasWon = this.checkWinCondition(gameState.coins![moveCoinDto.playerId]);
      if (hasWon) {
        gameState.winner = moveCoinDto.playerId;
        gameState.gameOver = true;
        await this.gameRoomModel.updateOne(
          { roomId: moveCoinDto.roomId },
          { status: 'completed', winner: moveCoinDto.playerId }
        );
        await this.saveGameSession(moveCoinDto.roomId, gameState);
      }
  
      // Turn logic: Extra turn for rolling 6 or capturing
      if (gameState.diceValue !== 6 && !captured) {
        await this.passTurn(moveCoinDto.roomId, gameState);
      } else {
        gameState.diceRolled = false;
        gameState.diceValue = 0;
        await this.updateGameState(moveCoinDto.roomId, gameState);
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
      console.error(`Error in moveCoin:`, error);
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
    if (room.gameType === 'trivia') {
      // Fetch trivia settings from room - FIX: Use actual settings from room
      const triviaSettings: TriviaSettings = room.triviaSettings || {
        questionCount: 10,
        difficulty: 'medium',
        category: 'general'
      };
      
      console.log('Fetching trivia questions with settings:', triviaSettings);
      
     
      // Use enhanced service to get unique questions
    const questions = await this.enhancedTriviaService.getUniqueQuestionsForSession(
      triviaSettings, 
      roomId // Use roomId as session identifier
    );
      
      // Validate questions are from the correct category
      const categoryQuestions = questions.filter(q => 
        q.category?.toLowerCase().includes(triviaSettings.category.toLowerCase())
      );
      
      console.log(`Questions loaded: ${questions.length}, from category ${triviaSettings.category}: ${categoryQuestions.length}`);
      
      if (gameState.triviaState) {
        // Use all questions or filter by category if needed
        gameState.triviaState.questions = questions;
        gameState.triviaState.currentQuestionIndex = 0;
        gameState.triviaState.questionTimer = 30;
        // Initialize answers for all players
        gameState.players.forEach(player => {
          gameState.triviaState!.answers[player.id] = { answer: null, isCorrect: null };
        });
      }
      
      // Store trivia settings in game state for frontend display
      gameState.triviaSettings = triviaSettings;
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




  async submitTriviaAnswer(data: { 
    roomId: string; 
    playerId: string; 
    qId: string; 
    answer: string | null; 
    correct?: string; 
    isCorrect?: boolean;
    pointsEarned?: number;
    timeRemaining?: number;
  }) {
    const gameState = await this.getGameState(data.roomId);
    if (gameState.gameType !== 'trivia') throw new Error('Invalid game type');
    if (!gameState.triviaState) throw new Error('Trivia state not initialized');
  
    // Find the question by ID
    const question = gameState.triviaState.questions.find(q => q.id === data.qId);
    if (!question) {
      throw new Error('Question not found');
    }
  
    // CRITICAL FIX: Handle auto-submitted null answers properly
    const isCorrect = data.answer === question.correctAnswer;
    const pointsEarned = data.pointsEarned !== undefined ? data.pointsEarned : (isCorrect ? 5 : 0);
    
    console.log('=== PROCESSING TRIVIA ANSWER ===', {
      playerId: data.playerId,
      questionId: data.qId,
      answer: data.answer,
      correctAnswer: question.correctAnswer,
      isCorrect: isCorrect,
      timeRemaining: data.timeRemaining,
      pointsEarned: pointsEarned,
      isAutoSubmitted: data.answer === null
    });
  
    // CRITICAL FIX: Always create/update answer tracking, even for null answers
    if (!gameState.triviaState.answers[data.playerId]) {
      gameState.triviaState.answers[data.playerId] = { answer: null, isCorrect: null };
    }
    
    // Update answer tracking - mark as answered even with null
    gameState.triviaState.answers[data.playerId] = { 
      answer: data.answer, 
      isCorrect: isCorrect 
    };
  
    // Update score only for correct answers
    if (isCorrect) {
      const currentScore = gameState.triviaState.scores[data.playerId] || 0;
      const newScore = currentScore + pointsEarned;
      gameState.triviaState.scores[data.playerId] = newScore;
      
      // Sync with player object
      const player = gameState.players.find(p => p.id === data.playerId);
      if (player) {
        player.score = newScore;
      }
      
      console.log(`✅ SCORE UPDATED: ${data.playerId} ${currentScore} → ${newScore} (earned ${pointsEarned} points)`);
    } else {
      console.log(`❌ ${data.answer === null ? 'Auto-submitted' : 'Incorrect'} answer for ${data.playerId}, score remains: ${gameState.triviaState.scores[data.playerId] || 0}`);
    }
    
    // Save immediately to Redis
    await this.updateGameState(data.roomId, gameState);
  
    // Check if all players have answered (including auto-submitted null answers)
    const allPlayersAnswered = await this.checkAllPlayersAnswered(data.roomId, gameState);
    if (allPlayersAnswered) {
      console.log('🎯 ALL PLAYERS HAVE ANSWERED - EMITTING EVENT');
      
      // Emit event to all clients that all players have answered
      if (this.server) {
        this.server.to(data.roomId).emit('triviaAllPlayersAnswered', {
          roomId: data.roomId,
          currentQuestionIndex: gameState.triviaState!.currentQuestionIndex,
          scores: gameState.triviaState.scores
        });
      }
    }
    
    return {
      roomId: data.roomId,
      playerId: data.playerId,
      qId: data.qId,
      answer: data.answer,
      correct: question.correctAnswer,
      isCorrect: isCorrect,
      pointsEarned: pointsEarned,
      timeRemaining: data.timeRemaining,
      scores: gameState.triviaState.scores,
      currentScore: gameState.triviaState.scores[data.playerId] || 0
    };
  }


//   // Update the submitTriviaAnswer method to handle time-based scoring
// async submitTriviaAnswer(data: { 
//   roomId: string; 
//   playerId: string; 
//   qId: string; 
//   answer: string | null; 
//   correct?: string; 
//   isCorrect?: boolean;
//   pointsEarned?: number; // New parameter for time-based scoring
//   timeRemaining?: number; // New parameter for time data
// }) {
//   const gameState = await this.getGameState(data.roomId);
//   if (gameState.gameType !== 'trivia') throw new Error('Invalid game type');
//   if (!gameState.triviaState) throw new Error('Trivia state not initialized');

//   // Find the question by ID (not by current index, to handle timing issues)
//   const question = gameState.triviaState.questions.find(q => q.id === data.qId);
//   if (!question) {
//     throw new Error('Question not found');
//   }

//   const isCorrect = data.answer === question.correctAnswer;
  
//   // Use provided pointsEarned or calculate default (5 points for correct answer)
//   const pointsEarned = data.pointsEarned !== undefined ? data.pointsEarned : (isCorrect ? 5 : 0);
  
//   console.log('=== PROCESSING TRIVIA ANSWER WITH TIME-BASED SCORING ===', {
//     playerId: data.playerId,
//     questionId: data.qId,
//     answer: data.answer,
//     correctAnswer: question.correctAnswer,
//     isCorrect: isCorrect,
//     timeRemaining: data.timeRemaining,
//     pointsEarned: pointsEarned,
//     currentScoreBefore: gameState.triviaState.scores[data.playerId] || 0
//   });

//   // Update answer tracking
//   if (!gameState.triviaState.answers[data.playerId]) {
//     gameState.triviaState.answers[data.playerId] = { answer: null, isCorrect: null };
//   }
//   gameState.triviaState.answers[data.playerId] = { 
//     answer: data.answer, 
//     isCorrect: isCorrect 
//   };

//   // Update score with time-based points
//   if (isCorrect) {
//     const currentScore = gameState.triviaState.scores[data.playerId] || 0;
//     const newScore = currentScore + pointsEarned;
//     gameState.triviaState.scores[data.playerId] = newScore;
    
//     // Sync with player object
//     const player = gameState.players.find(p => p.id === data.playerId);
//     if (player) {
//       player.score = newScore;
//     }
    
//     console.log(`✅ TIME-BASED SCORE UPDATED: ${data.playerId} ${currentScore} → ${newScore} (earned ${pointsEarned} points)`);
//   } else {
//     console.log(`❌ Incorrect answer for ${data.playerId}, score remains: ${gameState.triviaState.scores[data.playerId] || 0}`);
//   }
  
//   // Save immediately to Redis with detailed logging
//   await this.updateGameState(data.roomId, gameState);


  

// // Check if all players have answered
// const allPlayersAnswered = await this.checkAllPlayersAnswered(data.roomId, gameState);
// if (allPlayersAnswered) {
//   console.log('🎯 ALL PLAYERS HAVE ANSWERED - EMITTING EVENT');
  
//   // Emit event to all clients that all players have answered
//   if (this.server) {
//     this.server.to(data.roomId).emit('triviaAllPlayersAnswered', {
//       roomId: data.roomId,
//       currentQuestionIndex: gameState.triviaState!.currentQuestionIndex,
//       scores: gameState.triviaState.scores
//     });
//   }
// }
  
//   console.log('=== AFTER ANSWER PROCESSING ===', {
//     playerId: data.playerId,
//     finalScore: gameState.triviaState.scores[data.playerId] || 0,
//     allScores: gameState.triviaState.scores
//   });

//   const result = {
//     roomId: data.roomId,
//     playerId: data.playerId,
//     qId: data.qId,
//     answer: data.answer,
//     correct: question.correctAnswer,
//     isCorrect: isCorrect,
//     pointsEarned: pointsEarned,
//     timeRemaining: data.timeRemaining,
//     scores: gameState.triviaState.scores,
//     currentScore: gameState.triviaState.scores[data.playerId] || 0
//   };

//   return result;
// }



async updateTriviaSettings(roomId: string, hostId: string, newSettings: any) {
  const gameRoom = await this.gameRoomModel.findOne({ roomId });
  if (!gameRoom) throw new Error('Game room not found');
  if (gameRoom.host !== hostId) throw new Error('Only the host can update trivia settings');
  if (gameRoom.gameType !== 'trivia') throw new Error('This is not a trivia game room');
  
  console.log('Updating trivia settings for room:', roomId, newSettings);
  
  // Validate the new settings
  if (!newSettings.questionCount || !newSettings.difficulty || !newSettings.category) {
    throw new Error('Invalid trivia settings provided');
  }
  
  // Update the game room's trivia settings
  gameRoom.triviaSettings = {
    questionCount: newSettings.questionCount,
    difficulty: newSettings.difficulty,
    category: newSettings.category
  };
  
  await gameRoom.save();
  
  // Also update the current game state's trivia settings
  const gameState = await this.getGameState(roomId);
  if (gameState.triviaSettings) {
    gameState.triviaSettings = {
      questionCount: newSettings.questionCount,
      difficulty: newSettings.difficulty,
      category: newSettings.category
    };
    await this.updateGameState(roomId, gameState);
  }
  
  console.log('Trivia settings updated successfully:', {
    roomId,
    newSettings,
    gameRoomSettings: gameRoom.triviaSettings
  });
  
  return { success: true, triviaSettings: gameRoom.triviaSettings };
}



// Update the completeTriviaGame method to verify final scores
async completeTriviaGame(data: { roomId: string; playerId: string; score: number; total: number }) {
  const gameState = await this.getGameState(data.roomId);
  if (gameState.gameType !== 'trivia') throw new Error('Invalid game type');
  if (!gameState.triviaState) throw new Error('Trivia state not initialized');
  
  console.log('=== PLAYER COMPLETING TRIVIA GAME ===');
  console.log(`Player: ${data.playerId}`);
  console.log('Current trivia state scores:', gameState.triviaState.scores);
  console.log('Player objects scores:', gameState.players.map(p => ({ id: p.id, score: p.score })));
  
  // Use the actual score from triviaState (source of truth)
  const playerScore = gameState.triviaState.scores[data.playerId] || 0;
  
  // Verify the score makes sense based on questions
  const totalQuestions = gameState.triviaState.questions.length;
  const maxPossibleScore = totalQuestions * 5;
  
  console.log(`Score validation: ${playerScore} points out of ${maxPossibleScore} possible`);
  
  // Update player object with verified score
  const player = gameState.players.find(p => p.id === data.playerId);
  if (player) {
    player.score = playerScore;
  }
  
  // Track completed players
  if (!gameState.triviaState.completedPlayers) {
    gameState.triviaState.completedPlayers = [];
  }
  if (!gameState.triviaState.completedPlayers.includes(data.playerId)) {
    gameState.triviaState.completedPlayers.push(data.playerId);
  }
  
  const totalPlayers = gameState.players.length;
  const completedCount = gameState.triviaState.completedPlayers.length;
  
  console.log(`Completion progress: ${completedCount}/${totalPlayers} players completed`);
  
  // Check if ALL players have completed
  const allPlayersCompleted = completedCount === totalPlayers;
  
  if (allPlayersCompleted) {
    console.log('=== ALL PLAYERS COMPLETED - FINALIZING GAME ===');
    
    // Final score verification
    console.log('FINAL SCORES BEFORE SAVING:', gameState.triviaState.scores);
    
    // Determine winner based on verified scores
    const scores = gameState.triviaState.scores;
    const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const highestScore = sortedScores[0]?.[1] || 0;
    const winner = highestScore > 0 ? sortedScores[0][0] : 'draw';
    
    // CRITICAL: Set game over flags
    gameState.winner = winner;
    gameState.gameOver = true;
    
    console.log('🏆 FINAL RESULTS:', {
      winner: winner,
      winnerScore: highestScore,
      allScores: scores,
      players: gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        score: gameState.triviaState!.scores[p.id] || 0
      }))
    });
    
    // Update database with verified scores
    await this.gameRoomModel.updateOne(
      { roomId: data.roomId }, 
      { 
        status: 'completed', 
        winner: winner,
        scores: scores  // Use the verified scores from triviaState
      }
    );
    
    // CRITICAL: Save to gamesessionentities collection with verified scores
    await this.saveGameSession(data.roomId, gameState);
    console.log('✅ Game session saved to database with verified scores');
  }
  
  // Save state to Redis
  await this.updateGameState(data.roomId, gameState);
  
  return { 
    roomId: data.roomId, 
    playerId: data.playerId, 
    score: playerScore, 
    total: data.total,
    gameOver: gameState.gameOver,
    winner: gameState.winner,
    scores: gameState.triviaState.scores,
    completedPlayers: gameState.triviaState.completedPlayers,
    message: allPlayersCompleted ? 'All players finished!' : `Waiting for ${totalPlayers - completedCount} more player(s)`
  };
}



async processTriviaQuestion(roomId: string) {
  const gameState = await this.getGameState(roomId);
  if (!gameState.triviaState) throw new Error('Trivia state not initialized');
  
  console.log('Processing next trivia question:', {
    currentIndex: gameState.triviaState.currentQuestionIndex,
    totalQuestions: gameState.triviaState.questions.length,
    scores: gameState.triviaState.scores
  });

  // Start server-side timeout for this question
  const currentQuestion = gameState.triviaState.questions[gameState.triviaState.currentQuestionIndex];
  if (currentQuestion) {
    this.enforceTriviaTimeout(roomId, currentQuestion.id);
  }
  
  gameState.triviaState.currentQuestionIndex++;
  
  if (gameState.triviaState.currentQuestionIndex >= gameState.triviaState.questions.length) {
    // Game over - all questions answered
    gameState.gameOver = true;
    
    // Determine winner based on highest score
    let highestScore = -1;
    let winner = '';
    
    Object.entries(gameState.triviaState.scores).forEach(([playerId, score]) => {
      if (score > highestScore) {
        highestScore = score;
        winner = playerId;
      } else if (score === highestScore && highestScore > 0) {
        if (!winner) {
          winner = playerId;
        }
      }
    });
    
    if (highestScore <= 0) {
      winner = 'draw';
    }
    
    gameState.winner = winner;
    
    console.log('Trivia game completed - final results:', {
      winner,
      scores: gameState.triviaState.scores,
      players: gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        score: gameState.triviaState!.scores[p.id] || 0
      }))
    });
    
    await this.gameRoomModel.updateOne({ roomId }, { 
      status: 'completed', 
      winner: gameState.winner,
      scores: gameState.triviaState.scores
    });
    await this.saveGameSession(roomId, gameState);
  } else {
    // Reset answers for next question
    gameState.triviaState!.answers = gameState.players.reduce((acc, p) => ({ 
      ...acc, 
      [p.id]: { answer: null, isCorrect: null } 
    }), {});
    gameState.triviaState.questionTimer = 30;
    
    console.log('Moving to next question:', {
      newIndex: gameState.triviaState.currentQuestionIndex,
      scores: gameState.triviaState.scores
    });
  }

  await this.updateGameState(roomId, gameState);
  return gameState;
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
        
        // Enhance with player names
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
  
        console.log(`Retrieved game state from Redis for room ${roomId}`);
        return enhancedState;
      }
      
      // No Redis state - reconstruct from database
      console.log(`No Redis state found for ${roomId}, reconstructing from database`);
      const room = await this.getGameRoomById(roomId);
      if (!room) throw new Error('Room not found');
      
      const colors = ['red', 'blue', 'green', 'yellow'];
      let defaultGameState: GameState;
      
      switch (room.gameType) {
        case 'trivia':
          defaultGameState = {
            roomId,
            gameType: room.gameType,
            roomName: room.name,
            host: room.host,
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
            triviaState: {
              currentQuestionIndex: 0,
              questions: [],
              scores: room.playerIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
              answers: room.playerIds.reduce((acc, id) => ({ ...acc, [id]: { answer: null, isCorrect: null } }), {}),
              questionTimer: 30,
              completedPlayers: [], 
            },
            triviaSettings: room.triviaSettings
          };
          break;
          
        case 'chess':
          defaultGameState = {
            roomId,
            gameType: room.gameType,
            roomName: room.name,
            host: room.host,
            gameStarted: false,
            gameOver: false,
            currentPlayer: 0,
            currentTurn: room.playerIds?.[0] || '',
            players: room.playerIds.map((playerId) => ({
              id: playerId,
              name: playerId,
              chessColor: undefined,
            })),
            winner: null,
            chessState: {
              board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              moves: []
            },
            chessPlayers: undefined
          };
          break;
          
        default:
          defaultGameState = {
            roomId,
            gameType: room.gameType,
            roomName: room.name,
            host: room.host,
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
      return defaultGameState;
    } catch (error) {
      console.error(`Error in getGameState for room ${roomId}:`, error);
      throw error;
    }
  }

  // In game.service.ts, update the updateGameState method:
async updateGameState(roomId: string, gameState: GameState) {
  try {
    // If it's a chess game, ensure we have the latest chess state
    if (gameState.gameType === 'chess' && this.chessService) {
      const chessState = await this.chessService.getChessState(roomId);
      
      // Force sync the turn from chess state
      if (chessState.currentTurn && chessState.currentTurn !== gameState.currentTurn) {
        console.log(`Syncing turn from chess state: ${gameState.currentTurn} -> ${chessState.currentTurn}`);
        gameState.currentTurn = chessState.currentTurn;
        
        // Update current player index
        const currentPlayerIndex = gameState.players.findIndex(p => p.id === chessState.currentTurn);
        gameState.currentPlayer = currentPlayerIndex !== -1 ? currentPlayerIndex : 0;
      }
    }
    
    await this.redisService.set(`game:${roomId}`, JSON.stringify(gameState));
    console.log(`Game state updated for room ${roomId}:`, {
      currentTurn: gameState.currentTurn,
      gameStarted: gameState.gameStarted,
      gameOver: gameState.gameOver,
      gameType: gameState.gameType,
    });
  } catch (error) {
    console.error(`Error in updateGameState for room ${roomId}:`, error);
    throw error;
  }
}

// Update the saveGameSession method to ensure it saves trivia scores
async saveGameSession(roomId: string, gameState: GameState) {
  try {
    const room = await this.gameRoomModel.findOne({ roomId });
    
    // For trivia games, use triviaState.scores, otherwise use player scores
    let finalScores: Record<string, number> = {};
    
    if (gameState.gameType === 'trivia' && gameState.triviaState) {
      // Use the actual trivia scores
      finalScores = gameState.triviaState.scores;
      console.log('Saving trivia scores to session:', finalScores);
    } else {
      // For other games, use player scores
      finalScores = gameState.players.reduce((acc, player) => {
        acc[player.id] = player.score || 0;
        return acc;
      }, {} as Record<string, number>);
    }

    const sessionData: Partial<GameSessionEntity> = {
      roomId,
      players: gameState.players.map((p) => p.id),
      winner: gameState.winner!,
      moves: [],
      finalState: {
        coins: gameState.coins || {},
        players: gameState.players.map(p => p.id),
        scores: finalScores  // Use the properly calculated scores
      },
      startedAt: new Date(),
      endedAt: gameState.gameOver ? new Date() : undefined,
      isTournament: false
    };

    console.log('Saving game session with data:', {
      roomId,
      winner: gameState.winner,
      scores: finalScores,
      gameType: gameState.gameType
    });

    // Only include gameRoom if the room exists
    if (room) {
      sessionData.gameRoom = room._id as Types.ObjectId;
    }

    const gameSession = new this.gameSessionModel(sessionData);
    await gameSession.save();
    
    console.log(`Game session saved for room ${roomId}`, {
      winner: gameState.winner,
      scores: finalScores,
      sessionId: gameSession._id
    });
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
      var rooms = await this.gameRoomModel
        .find({ status: { $ne: 'completed' } }) 
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      
      const roomsWithHostNames = await Promise.all(
        (rooms as any).map(async (room) => {
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

          const actualCurrentPlayers = room.playerIds?.length || 0;
          
          return {
            id: room.roomId,
            roomId: room.roomId,
            name: room.name,
            gameType: room.gameType,
            hostName: hostName,
            hostAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(room.host)}`,
            currentPlayers: actualCurrentPlayers, //room.currentPlayers,
            maxPlayers: room.maxPlayers,
            isPrivate: room.isPrivate,
            isInviteOnly: room.isPrivate,
            status: room.status,
            host: room.host,
            createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : new Date().toISOString(),
            scheduledTimeCombined: room.scheduledTimeCombined ? new Date(room.scheduledTimeCombined).toISOString() : undefined,
            scores: room.scores ? (room.scores as Record<string, number>) : {},
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

async restartGame(roomId: string, hostId: string) {
  const gameRoom = await this.gameRoomModel.findOne({ roomId });
  if (!gameRoom) throw new Error('Game room not found');
  if (gameRoom.host !== hostId) throw new Error('Only the host can restart the game');
  
  console.log(`Restarting trivia game for room ${roomId}, current status: ${gameRoom.status}`);
  
  // CRITICAL: Reset room status to 'waiting' and clear winner
  gameRoom.status = 'waiting';
  gameRoom.winner = undefined;
  gameRoom.scores = {};
  await gameRoom.save();
  
  // Get current players and spectators before reset
  const currentPlayerIds = gameRoom.playerIds || [];
  const currentSpectatorIds = gameRoom.spectatorIds || [];
  
  console.log(`Preserving players: ${currentPlayerIds.length}, spectators: ${currentSpectatorIds.length}`);
  
  // For trivia games, regenerate questions with current settings
  if (gameRoom.gameType === 'trivia') {
    try {
      // Use the current trivia settings from the game room
      const triviaSettings = gameRoom.triviaSettings || {
        questionCount: 10,
        difficulty: 'medium',
        category: 'general'
      };
      
      console.log('Regenerating trivia questions with settings:', triviaSettings);
      
      // Regenerate questions with the current settings
      const newQuestions = await this.enhancedTriviaService.regenerateQuestionsWithNewCategory(
        roomId, 
        triviaSettings
      );
      
      console.log('Trivia questions regenerated for restart:', newQuestions.length);
      
      // Update the game state with new questions
      const gameState = await this.getGameState(roomId);
      
      // CRITICAL: Reset all game state for trivia
      gameState.gameStarted = false;
      gameState.gameOver = false;
      gameState.winner = null;
      
      if (gameState.triviaState) {
        gameState.triviaState.currentQuestionIndex = 0;
        gameState.triviaState.questions = newQuestions;
        gameState.triviaState.scores = {};
        gameState.triviaState.answers = {};
        gameState.triviaState.completedPlayers = [];
        gameState.triviaState.questionTimer = 30;
        
        // Reset player scores
        gameState.players.forEach(player => {
          gameState.triviaState!.scores[player.id] = 0;
          player.score = 0;
        });
      }
      
      // Save the updated state immediately
      await this.updateGameState(roomId, gameState);
      
      console.log('Trivia game state reset with new questions');
      
    } catch (error) {
      console.error('Error regenerating trivia questions:', error);
      // Continue with restart even if question regeneration fails
    }
  }
  
  // For non-trivia games or as fallback, do general reinitialization
  await this.initializeGameState(
    roomId, 
    hostId, 
    gameRoom.name, 
    gameRoom.gameType, 
    gameRoom.triviaSettings
  );
  
  // Get the fresh game state to ensure everything is reset
  const finalGameState = await this.getGameState(roomId);
  
  console.log(`Game restarted successfully for room ${roomId}`, {
    status: gameRoom.status,
    players: finalGameState.players.length,
    gameStarted: finalGameState.gameStarted,
    gameOver: finalGameState.gameOver,
    winner: finalGameState.winner,
    triviaQuestions: finalGameState.triviaState?.questions?.length || 0
  });
  
  // Emit game state update to all clients in the room
  if (this.server) {
    this.server.to(roomId).emit('gameState', finalGameState);
    this.server.to(roomId).emit('gameRestarted', { 
      roomId, 
      gameState: finalGameState,
      message: 'New round started!' 
    });
  }
  
  return finalGameState;
}


async endGame(roomId: string, hostId: string) {
  const gameRoom = await this.gameRoomModel.findOne({ roomId });
  if (!gameRoom) throw new Error('Game room not found');
  if (gameRoom.host !== hostId) throw new Error('Only the host can end the game');
  
  console.log(`Ending game for room ${roomId}`);
  
  // Mark as completed but keep game state in Redis for potential restart
  gameRoom.status = 'completed';
  await gameRoom.save();
  
  // Set a longer expiration on Redis state to allow restart within reasonable time
  await this.redisService.expire(`game:${roomId}`, 3600); // 1 hour expiration
  
  return { success: true, message: 'Game ended successfully' };
}




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


// Add this method to the GameService class
async regenerateTriviaQuestions(roomId: string): Promise<void> {
  const gameState = await this.getGameState(roomId);
  const room = await this.getGameRoomById(roomId);
  
  if (room?.gameType !== 'trivia' || !gameState.triviaSettings) {
    return;
  }

  try {
    console.log('Regenerating trivia questions for room:', roomId);
    
    // Fetch new questions with the same settings
    const newQuestions = await this.triviaService.getQuestions(gameState.triviaSettings);
    
    if (gameState.triviaState) {
      // Replace questions with new ones
      gameState.triviaState.questions = newQuestions;
      gameState.triviaState.currentQuestionIndex = 0;
      
      // Reset all game state for trivia
      gameState.triviaState.scores = {};
      gameState.triviaState.answers = {};
      gameState.triviaState.completedPlayers = [];
      
      // Initialize scores and answers for all players
      gameState.players.forEach(player => {
        gameState.triviaState!.scores[player.id] = 0;
        gameState.triviaState!.answers[player.id] = { answer: null, isCorrect: null };
        player.score = 0;
      });
      
      await this.updateGameState(roomId, gameState);
      console.log('Trivia questions regenerated successfully');
    }
  } catch (error) {
    console.error('Error regenerating trivia questions:', error);
    throw error;
  }
}


// Add to GameService class in game.service.ts
private calculatePlayerPoints(gameState: GameState): PlayerPoints[] {
  if (!gameState.players || !gameState.coins) return [];

  // Calculate player progress (coins in home)
  const playerProgress = gameState.players.map(player => {
    const playerCoins = gameState.coins![player.id] || [0, 0, 0, 0];
    const coinsHome = playerCoins.filter(pos => pos === 57).length;
    return {
      playerId: player.id,
      name: player.name,
      color: player.color || 'gray',
      coinsHome,
      totalProgress: playerCoins.reduce((sum, pos) => sum + pos, 0)
    };
  });

  // Sort by coins home (descending), then by total progress (descending)
  const sortedPlayers = [...playerProgress].sort((a, b) => {
    if (b.coinsHome !== a.coinsHome) {
      return b.coinsHome - a.coinsHome;
    }
    return b.totalProgress - a.totalProgress;
  });

  // Assign points based on position
  const pointsMap: { [key: number]: number } = {
    1: 10, // Winner
    2: 5,  // Second
    3: 2,  // Third
    4: 1   // Last
  };

  return sortedPlayers.map((player, index) => ({
    ...player,
    position: index + 1,
    points: pointsMap[index + 1] || 0
  }));
}

// Update the game over handling to include points
async handleGameOver(roomId: string, winnerId: string) {
  const gameState = await this.getGameState(roomId);
  const playerPoints = this.calculatePlayerPoints(gameState);
  
  // Store points in Redis for persistence
  await this.redisService.set(`game:${roomId}:points`, JSON.stringify(playerPoints));
  
  return playerPoints;
}




private async checkAllPlayersAnswered(roomId: string, gameState: GameState): Promise<boolean> {
  if (gameState.gameType !== 'trivia' || !gameState.triviaState) {
    return false;
  }

  const allPlayers = gameState.players;
  
  // CRITICAL FIX: Consider null answers as "answered" for the purpose of moving the game forward
  const allAnswered = allPlayers.every(player => {
    const answerData = gameState.triviaState!.answers[player.id];
    // Player has answered if answerData exists (even if answer is null)
    return answerData !== undefined && answerData !== null;
  });

  console.log('Checking if all players answered:', {
    totalPlayers: allPlayers.length,
    answeredPlayers: Object.values(gameState.triviaState.answers).filter(a => a !== undefined && a !== null).length,
    allAnswered: allAnswered,
    answers: gameState.triviaState.answers
  });

  return allAnswered;
}




// private async checkAllPlayersAnswered(roomId: string, gameState: GameState): Promise<boolean> {
//   if (gameState.gameType !== 'trivia' || !gameState.triviaState) {
//     return false;
//   }

//   const allPlayers = gameState.players;
//   const allAnswered = allPlayers.every(player => 
//     gameState.triviaState!.answers[player.id]?.answer !== null
//   );

//   console.log('Checking if all players answered:', {
//     totalPlayers: allPlayers.length,
//     answeredPlayers: Object.values(gameState.triviaState.answers).filter((a: any) => a.answer !== null).length,
//     allAnswered
//   });

//   return allAnswered;
// }




async enforceTriviaTimeout(roomId: string, questionId: string) {
  const gameState = await this.getGameState(roomId);
  if (gameState.gameType !== 'trivia' || !gameState.triviaState) return;

  // Wait for the full question time + buffer
  setTimeout(async () => {
    const currentState = await this.getGameState(roomId);
    if (!currentState.triviaState || currentState.gameOver) return;

    // Check if we're still on the same question
    const currentQuestion = currentState.triviaState.questions[currentState.triviaState.currentQuestionIndex];
    if (!currentQuestion || currentQuestion.id !== questionId) return;

    // Auto-submit for any players who haven't answered
    const unansweredPlayers = currentState.players.filter(player => {
      const answerData = currentState.triviaState!.answers[player.id];
      return answerData === undefined || answerData === null;
    });

    console.log(`⏰ Server-side timeout: Auto-submitting for ${unansweredPlayers.length} players`);

    for (const player of unansweredPlayers) {
      await this.submitTriviaAnswer({
        roomId,
        playerId: player.id,
        qId: questionId,
        answer: null,
        pointsEarned: 0,
        timeRemaining: 0
      });
    }
  }, 35000); // 35 seconds (30s question + 5s buffer)
}



}
