import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { GameRoom, GameRoomDocument } from './schemas/game-room.schema';
import { GameSessionEntity, GameSessionDocument } from './schemas/game-session.schema';
import { CreateGameDto, JoinGameDto, MoveCoinDto, RollDiceDto } from './dto/game.dto';
import { v4 as uuidv4 } from 'uuid';
import { Socket } from 'socket.io';
import { Types } from 'mongoose';

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

interface GameState {
  roomId: string;
  players: { id: string; name: string; color: string; coins: number[] }[];
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

@Injectable()
export class GameService {
  private boardPath = Array.from({ length: 52 }, (_, i) => i + 1);
  private startPositions = [1, 14, 27, 40];
  private safePositions = [1, 9, 14, 22, 27, 35, 40, 48];

  constructor(
    private readonly redisService: RedisService,
    @InjectModel(GameRoom.name) private gameRoomModel: Model<GameRoomDocument>,
    @InjectModel(GameSessionEntity.name) private gameSessionModel: Model<GameSessionDocument>,
  ) {}

  async createGame(createGameDto: CreateGameDto) {
    const roomId = uuidv4();
    let scheduledTimeCombined: Date | undefined;
    if (createGameDto.scheduledTimeCombined) {
      scheduledTimeCombined = new Date(createGameDto.scheduledTimeCombined);
      if (isNaN(scheduledTimeCombined.getTime())) throw new Error('Invalid scheduled time format');
      if (scheduledTimeCombined <= new Date()) throw new Error('Scheduled time must be in the future');
    }
    const gameRoom = new this.gameRoomModel({
      roomId,
      name: createGameDto.name,
      gameType: createGameDto.gameType.toLowerCase(),
      host: createGameDto.hostId,
      maxPlayers: 4,
      currentPlayers: 1,
      isPrivate: createGameDto.isPrivate,
      password: createGameDto.password,
      status: 'waiting',
      scheduledTimeCombined,
      playerIds: [createGameDto.hostId],
      createdAt: new Date(),
    });
    await gameRoom.save();
    await this.initializeGameState(roomId, createGameDto.hostId, createGameDto.name);
    return gameRoom;
  }

  private async initializeGameState(roomId: string, hostId: string, roomName: string) {
    const colors = ['red', 'blue', 'green', 'yellow'];
    const initialGameState: GameState = {
      roomId,
      players: [{ id: hostId, name: hostId, color: colors[0], coins: [0, 0, 0, 0] }],
      currentTurn: hostId,
      currentPlayer: 0,
      diceValue: 0,
      diceRolled: false,
      coins: {
        [hostId]: [0, 0, 0, 0],
      },
      gameStarted: false,
      gameOver: false,
      winner: null,
      roomName,
      gameType: 'ludo',
    };
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
      gameState.players.push({
        id: joinGameDto.playerId,
        name: joinGameDto.playerName || joinGameDto.playerId,
        color: colors[playerIndex],
        coins: [0, 0, 0, 0],
      });
      gameState.coins[joinGameDto.playerId] = [0, 0, 0, 0];
      await this.updateGameState(joinGameDto.roomId, gameState);
    }
    return { game: gameRoom, player: joinGameDto.playerId };
  }

  async rollDice(rollDiceDto: RollDiceDto) {
    const gameState = await this.getGameState(rollDiceDto.roomId);
    if (gameState.currentTurn !== rollDiceDto.playerId) throw new Error('Not your turn');
    if (gameState.diceRolled) throw new Error('Dice already rolled');
    const diceValue = Math.floor(Math.random() * 6) + 1;
    gameState.diceValue = diceValue;
    gameState.diceRolled = true;
    console.log(`Dice rolled by ${rollDiceDto.playerId}: ${diceValue}`);

    // Check if the player has any valid moves
    const playerCoins = gameState.coins[rollDiceDto.playerId] || [0, 0, 0, 0];
    const hasValidMove = diceValue === 6 || playerCoins.some((pos) => pos > 0 && pos + diceValue <= 57);

    if (!hasValidMove) {
      // No valid moves: Pass turn to next player
      console.log(`No valid moves for ${rollDiceDto.playerId} (dice: ${diceValue}), passing turn`);
      gameState.diceValue = 0;
      gameState.diceRolled = false;
      gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
      gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
      await this.updateGameState(rollDiceDto.roomId, gameState);
      // If next player is AI, trigger their turn
      if (gameState.currentTurn.startsWith('ai-') && !gameState.gameOver) {
        setTimeout(() => this.handleAITurn(rollDiceDto.roomId, gameState.currentTurn), 1000);
      }
      return { roomId: rollDiceDto.roomId, diceValue, playerId: rollDiceDto.playerId, noValidMove: true };
    }

    await this.updateGameState(rollDiceDto.roomId, gameState);

    // If player is AI, trigger their move
    if (rollDiceDto.playerId.startsWith('ai-')) {
      setTimeout(() => this.handleAIMove(rollDiceDto.roomId, rollDiceDto.playerId), 1000);
    }

    return { roomId: rollDiceDto.roomId, diceValue, playerId: rollDiceDto.playerId, noValidMove: false };
  }

  async moveCoin(moveCoinDto: MoveCoinDto) {
    const gameState = await this.getGameState(moveCoinDto.roomId);
    if (gameState.currentTurn !== moveCoinDto.playerId) throw new Error('Not your turn');
    if (!gameState.diceRolled) throw new Error('You must roll the dice first');
    const [color, coinIndexStr] = moveCoinDto.coinId.split('-');
    const coinIndex = parseInt(coinIndexStr) - 1;
    const playerIndex = gameState.players.findIndex((p) => p.id === moveCoinDto.playerId);
    const coinPosition = gameState.coins[moveCoinDto.playerId][coinIndex];
    let newPosition = coinPosition;

    console.log(`Move coin attempt: ${moveCoinDto.coinId} by ${moveCoinDto.playerId}, current position: ${coinPosition}, dice: ${gameState.diceValue}`);

    if (coinPosition === 0 && gameState.diceValue === 6) {
      newPosition = this.startPositions[playerIndex];
    } else if (coinPosition > 0 && coinPosition < 57) {
      newPosition = coinPosition + gameState.diceValue;
      if (newPosition > 57) throw new Error('Invalid move: Beyond home');
      if (newPosition > 51 && newPosition < 57) {
        const homeStretchPosition = newPosition - 51;
        if (homeStretchPosition > 6) throw new Error('Invalid move: Beyond home stretch');
      }
    } else {
      throw new Error('Invalid move');
    }

    // Check for captures
    if (!this.safePositions.includes(newPosition % 52) && newPosition <= 51) {
      for (const opponentId of Object.keys(gameState.coins)) {
        if (opponentId !== moveCoinDto.playerId) {
          gameState.coins[opponentId].forEach((pos, idx) => {
            if (pos === newPosition) {
              gameState.coins[opponentId][idx] = 0;
              gameState.players[gameState.players.findIndex((p) => p.id === opponentId)].coins[idx] = 0;
              console.log(`Captured opponent coin at position ${newPosition} for player ${opponentId}`);
            }
          });
        }
      }
    }

    // Update coin position
    gameState.coins[moveCoinDto.playerId][coinIndex] = newPosition;
    gameState.players[playerIndex].coins[coinIndex] = newPosition;
    console.log(`Coin moved: ${moveCoinDto.coinId} to position ${newPosition}`);

    // Check win condition
    const hasWon = gameState.coins[moveCoinDto.playerId].every((pos) => pos === 57);
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

    // Update turn
    if (gameState.diceValue !== 6) {
      gameState.diceValue = 0;
      gameState.diceRolled = false;
      gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
      gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
    } else {
      gameState.diceRolled = false;
    }

    await this.updateGameState(moveCoinDto.roomId, gameState);

    // If next player is AI, trigger their turn
    if (gameState.currentTurn.startsWith('ai-') && !gameState.gameOver) {
      setTimeout(() => this.handleAITurn(moveCoinDto.roomId, gameState.currentTurn), 1000);
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
  }

  async handleAITurn(roomId: string, aiPlayerId: string) {
    const gameState = await this.getGameState(roomId);
    if (gameState.currentTurn !== aiPlayerId || gameState.gameOver) return;

    console.log(`AI turn for ${aiPlayerId} in room ${roomId}`);
    await this.rollDice({ roomId, playerId: aiPlayerId });
  }

  async handleAIMove(roomId: string, aiPlayerId: string) {
    const gameState = await this.getGameState(roomId);
    if (gameState.currentTurn !== aiPlayerId || !gameState.diceRolled || gameState.gameOver) return;

    const playerIndex = gameState.players.findIndex((p) => p.id === aiPlayerId);
    const playerCoins = gameState.coins[aiPlayerId] || [0, 0, 0, 0];
    const movableCoins: number[] = [];

    // Determine movable coins
    playerCoins.forEach((position, index) => {
      if (position === 0 && gameState.diceValue === 6) {
        movableCoins.push(index);
      } else if (position > 0 && position < 57 && position + gameState.diceValue <= 57) {
        movableCoins.push(index);
      }
    });

    console.log(`AI ${aiPlayerId} movable coins: ${movableCoins}`);

    if (movableCoins.length > 0) {
      // Simple AI: Choose a random movable coin
      const coinIndex = movableCoins[Math.floor(Math.random() * movableCoins.length)];
      const coinId = `${gameState.players[playerIndex].color}-${coinIndex + 1}`;
      console.log(`AI ${aiPlayerId} moving coin: ${coinId}`);
      await this.moveCoin({ roomId, playerId: aiPlayerId, coinId });
    } else {
      // No valid moves: Pass turn
      console.log(`AI ${aiPlayerId} has no valid moves, passing turn`);
      gameState.diceValue = 0;
      gameState.diceRolled = false;
      gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
      gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
      await this.updateGameState(roomId, gameState);
      if (gameState.currentTurn.startsWith('ai-') && !gameState.gameOver) {
        setTimeout(() => this.handleAITurn(roomId, gameState.currentTurn), 1000);
      }
    }
  }

  async startGame(roomId: string) {
    const gameState = await this.getGameState(roomId);
    if (gameState.gameStarted) throw new Error('Game already started');
    const room = await this.getGameRoomById(roomId);
    if (!room) throw new Error('Room not found');
    if (room.playerIds.length < 2) throw new Error('At least 2 players required');

    // Add AI players if needed
    const colors = ['red', 'blue', 'green', 'yellow'];
    while (room.playerIds.length < 4) {
      const aiPlayerId = `ai-${room.playerIds.length + 1}`;
      room.playerIds.push(aiPlayerId);
      gameState.players.push({
        id: aiPlayerId,
        name: `AI ${room.playerIds.length}`,
        color: colors[room.playerIds.length - 1],
        coins: [0, 0, 0, 0],
      });
      gameState.coins[aiPlayerId] = [0, 0, 0, 0];
    }
    room.currentPlayers = room.playerIds.length;
    await room.save();

    gameState.gameStarted = true;
    await this.updateGameState(roomId, gameState);
    await this.gameRoomModel.findOneAndUpdate({ roomId }, { status: 'in-progress' }, { new: true });

    // If first player is AI, start their turn
    if (gameState.currentTurn.startsWith('ai-')) {
      setTimeout(() => this.handleAITurn(roomId, gameState.currentTurn), 1000);
    }

    return gameState;
  }

  async handleDisconnect(client: Socket) {
    const rooms = await this.gameRoomModel.find({ playerIds: client.id });
    for (const room of rooms) {
      const gameState = await this.getGameState(room.roomId);
      if (gameState.currentTurn === client.id) {
        gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
        gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
        gameState.diceValue = 0;
        gameState.diceRolled = false;
        await this.updateGameState(room.roomId, gameState);
        if (gameState.currentTurn.startsWith('ai-') && !gameState.gameOver) {
          setTimeout(() => this.handleAITurn(room.roomId, gameState.currentTurn), 1000);
        }
      }
    }
  }

  async getGameState(roomId: string): Promise<GameState> {
    const redisState = await this.redisService.get(`game:${roomId}`);
    if (redisState) {
      const parsedState: GameState = JSON.parse(redisState);
      const colors = ['red', 'blue', 'green', 'yellow'];
      return {
        ...parsedState,
        players: parsedState.players.map((player, index) => ({
          id: player.id,
          name: player.id.startsWith('ai-') ? `AI ${index + 1}` : player.name,
          color: colors[index],
          coins: parsedState.coins[player.id] || [0, 0, 0, 0],
        })),
        currentPlayer: parsedState.players.findIndex((p) => p.id === parsedState.currentTurn),
        diceRolled: parsedState.diceValue !== 0,
      };
    }
    const room = await this.getGameRoomById(roomId);
    if (!room) throw new Error('Room not found');
    const colors = ['red', 'blue', 'green', 'yellow'];
    const defaultGameState: GameState = {
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
      winner: null,
    };
    await this.updateGameState(roomId, defaultGameState);
    return this.getGameState(roomId);
  }

  async updateGameState(roomId: string, gameState: GameState) {
    await this.redisService.set(`game:${roomId}`, JSON.stringify(gameState));
  }

  async saveGameSession(roomId: string, gameState: GameState) {
    const gameSession = new this.gameSessionModel({
      roomId,
      players: gameState.players.map((p) => p.id),
      winner: gameState.winner,
      moves: [],
      createdAt: new Date(),
    });
    await gameSession.save();
  }

  async getScores(roomId: string) {
    const room = await this.gameRoomModel.findOne({ roomId });
    if (!room) throw new Error('Game room not found');
    return room.scores ?? {};
  }

  async getActiveGameRooms(): Promise<PublicGameRoom[]> {
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
  }

  async getGameRoomById(identifier: string) {
    try {
      let room = await this.gameRoomModel.findOne({ roomId: identifier }).exec();
      if (!room && Types.ObjectId.isValid(identifier)) {
        room = await this.gameRoomModel.findById(identifier).exec();
      }
      return room;
    } catch (error) {
      console.error('Error finding game room:', error);
      return null;
    }
  }

  async getMyGameRooms(playerId: string): Promise<{ hosted: PublicGameRoom[]; joined: PublicGameRoom[] }> {
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
  }
}

// import { Injectable } from '@nestjs/common';
// import { RedisService } from '../redis/redis.service';
// import { Model } from 'mongoose';
// import { InjectModel } from '@nestjs/mongoose';
// import { GameRoom, GameRoomDocument } from './schemas/game-room.schema';
// import { GameSessionEntity, GameSessionDocument } from './schemas/game-session.schema';
// import { CreateGameDto, JoinGameDto, MoveCoinDto, RollDiceDto } from './dto/game.dto';
// import { v4 as uuidv4 } from 'uuid';
// import { Socket } from 'socket.io';
// import { Types } from 'mongoose';

// interface PublicGameRoom {
//   id: string;
//   roomId: string;
//   name: string;
//   gameType: string;
//   hostName: string;
//   hostAvatar: string;
//   currentPlayers: number;
//   maxPlayers: number;
//   isPrivate: boolean;
//   isInviteOnly: boolean;
//   status: 'waiting' | 'in-progress' | 'completed';
//   host: string;
//   createdAt: string;
//   scheduledTimeCombined?: string;
//   scores?: Record<string, number>;
// }

// interface GameState {
//   roomId: string;
//   players: { id: string; name: string; color: string; coins: number[] }[];
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

// @Injectable()
// export class GameService {
//   private boardPath = Array.from({ length: 52 }, (_, i) => i + 1);
//   private startPositions = [1, 14, 27, 40];
//   private safePositions = [1, 9, 14, 22, 27, 35, 40, 48];

//   constructor(
//     private readonly redisService: RedisService,
//     @InjectModel(GameRoom.name) private gameRoomModel: Model<GameRoomDocument>,
//     @InjectModel(GameSessionEntity.name) private gameSessionModel: Model<GameSessionDocument>,
//   ) {}

//   async createGame(createGameDto: CreateGameDto) {
//     const roomId = uuidv4();
//     let scheduledTimeCombined: Date | undefined;
//     if (createGameDto.scheduledTimeCombined) {
//       scheduledTimeCombined = new Date(createGameDto.scheduledTimeCombined);
//       if (isNaN(scheduledTimeCombined.getTime())) throw new Error('Invalid scheduled time format');
//       if (scheduledTimeCombined <= new Date()) throw new Error('Scheduled time must be in the future');
//     }
//     const gameRoom = new this.gameRoomModel({
//       roomId,
//       name: createGameDto.name,
//       gameType: createGameDto.gameType.toLowerCase(),
//       host: createGameDto.hostId,
//       maxPlayers: 4,
//       currentPlayers: 1,
//       isPrivate: createGameDto.isPrivate,
//       password: createGameDto.password,
//       status: 'waiting',
//       scheduledTimeCombined,
//       playerIds: [createGameDto.hostId],
//       createdAt: new Date(),
//     });
//     await gameRoom.save();
//     await this.initializeGameState(roomId, createGameDto.hostId, createGameDto.name);
//     return gameRoom;
//   }

//   private async initializeGameState(roomId: string, hostId: string, roomName: string) {
//     const colors = ['red', 'blue', 'green', 'yellow'];
//     const initialGameState: GameState = {
//       roomId,
//       players: [{ id: hostId, name: hostId, color: colors[0], coins: [0, 0, 0, 0] }],
//       currentTurn: hostId,
//       currentPlayer: 0,
//       diceValue: 0,
//       diceRolled: false,
//       coins: {
//         [hostId]: [0, 0, 0, 0],
//       },
//       gameStarted: false,
//       gameOver: false,
//       winner: null,
//       roomName,
//       gameType: 'ludo',
//     };
//     await this.redisService.set(`game:${roomId}`, JSON.stringify(initialGameState));
//   }

//   async joinGame(joinGameDto: JoinGameDto) {
//     const gameRoom = await this.gameRoomModel.findOne({ roomId: joinGameDto.roomId });
//     if (!gameRoom) throw new Error('Game room not found');
//     if (gameRoom.currentPlayers >= gameRoom.maxPlayers) throw new Error('Game room is full');
//     if (gameRoom.isPrivate && gameRoom.password !== joinGameDto.password) throw new Error('Invalid password');
//     if (!gameRoom.playerIds.includes(joinGameDto.playerId)) {
//       gameRoom.playerIds.push(joinGameDto.playerId);
//       gameRoom.currentPlayers = gameRoom.playerIds.length;
//       await gameRoom.save();
//       const gameState = await this.getGameState(joinGameDto.roomId);
//       const colors = ['red', 'blue', 'green', 'yellow'];
//       const playerIndex = gameState.players.length;
//       gameState.players.push({
//         id: joinGameDto.playerId,
//         name: joinGameDto.playerName || joinGameDto.playerId,
//         color: colors[playerIndex],
//         coins: [0, 0, 0, 0],
//       });
//       gameState.coins[joinGameDto.playerId] = [0, 0, 0, 0];
//       await this.updateGameState(joinGameDto.roomId, gameState);
//     }
//     return { game: gameRoom, player: joinGameDto.playerId };
//   }

//   async rollDice(rollDiceDto: RollDiceDto) {
//     const gameState = await this.getGameState(rollDiceDto.roomId);
//     if (gameState.currentTurn !== rollDiceDto.playerId) throw new Error('Not your turn');
//     if (gameState.diceRolled) throw new Error('Dice already rolled');
//     const diceValue = Math.floor(Math.random() * 6) + 1;
//     gameState.diceValue = diceValue;
//     gameState.diceRolled = true;
//     console.log(`Dice rolled by ${rollDiceDto.playerId}: ${diceValue}`);
//     await this.updateGameState(rollDiceDto.roomId, gameState);
//     if (rollDiceDto.playerId.startsWith('ai-')) {
//       setTimeout(() => this.handleAIMove(rollDiceDto.roomId, rollDiceDto.playerId), 1000);
//     }
//     return { roomId: rollDiceDto.roomId, diceValue, playerId: rollDiceDto.playerId };
//   }

//   async moveCoin(moveCoinDto: MoveCoinDto) {
//     const gameState = await this.getGameState(moveCoinDto.roomId);
//     if (gameState.currentTurn !== moveCoinDto.playerId) throw new Error('Not your turn');
//     if (!gameState.diceRolled) throw new Error('You must roll the dice first');
//     const [color, coinIndexStr] = moveCoinDto.coinId.split('-');
//     const coinIndex = parseInt(coinIndexStr) - 1;
//     const playerIndex = gameState.players.findIndex((p) => p.id === moveCoinDto.playerId);
//     const coinPosition = gameState.coins[moveCoinDto.playerId][coinIndex];
//     let newPosition = coinPosition;

//     console.log(`Move coin attempt: ${moveCoinDto.coinId} by ${moveCoinDto.playerId}, current position: ${coinPosition}, dice: ${gameState.diceValue}`);

//     if (coinPosition === 0 && gameState.diceValue === 6) {
//       newPosition = this.startPositions[playerIndex];
//     } else if (coinPosition > 0 && coinPosition < 57) {
//       newPosition = coinPosition + gameState.diceValue;
//       if (newPosition > 57) throw new Error('Invalid move: Beyond home');
//       if (newPosition > 51 && newPosition < 57) {
//         const homeStretchPosition = newPosition - 51;
//         if (homeStretchPosition > 6) throw new Error('Invalid move: Beyond home stretch');
//       }
//     } else {
//       throw new Error('Invalid move');
//     }

//     // Check for captures
//     if (!this.safePositions.includes(newPosition % 52) && newPosition <= 51) {
//       for (const opponentId of Object.keys(gameState.coins)) {
//         if (opponentId !== moveCoinDto.playerId) {
//           gameState.coins[opponentId].forEach((pos, idx) => {
//             if (pos === newPosition) {
//               gameState.coins[opponentId][idx] = 0;
//               gameState.players[gameState.players.findIndex((p) => p.id === opponentId)].coins[idx] = 0;
//               console.log(`Captured opponent coin at position ${newPosition} for player ${opponentId}`);
//             }
//           });
//         }
//       }
//     }

//     // Update coin position
//     gameState.coins[moveCoinDto.playerId][coinIndex] = newPosition;
//     gameState.players[playerIndex].coins[coinIndex] = newPosition;
//     console.log(`Coin moved: ${moveCoinDto.coinId} to position ${newPosition}`);

//     // Check win condition
//     const hasWon = gameState.coins[moveCoinDto.playerId].every((pos) => pos === 57);
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

//     // Update turn
//     if (gameState.diceValue !== 6) {
//       gameState.diceValue = 0;
//       gameState.diceRolled = false;
//       gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
//       gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
//     } else {
//       gameState.diceRolled = false;
//     }

//     await this.updateGameState(moveCoinDto.roomId, gameState);

//     // If next player is AI, trigger their turn
//     if (gameState.currentTurn.startsWith('ai-') && !gameState.gameOver) {
//       setTimeout(() => this.handleAITurn(moveCoinDto.roomId, gameState.currentTurn), 1000);
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
//   }

//   async handleAITurn(roomId: string, aiPlayerId: string) {
//     const gameState = await this.getGameState(roomId);
//     if (gameState.currentTurn !== aiPlayerId || gameState.gameOver) return;

//     console.log(`AI turn for ${aiPlayerId} in room ${roomId}`);
//     await this.rollDice({ roomId, playerId: aiPlayerId });
//   }

//   async handleAIMove(roomId: string, aiPlayerId: string) {
//     const gameState = await this.getGameState(roomId);
//     if (gameState.currentTurn !== aiPlayerId || !gameState.diceRolled || gameState.gameOver) return;

//     const playerIndex = gameState.players.findIndex((p) => p.id === aiPlayerId);
//     const playerCoins = gameState.coins[aiPlayerId] || [0, 0, 0, 0];
//     const movableCoins: number[] = [];

//     // Determine movable coins
//     playerCoins.forEach((position, index) => {
//       if (position === 0 && gameState.diceValue === 6) {
//         movableCoins.push(index);
//       } else if (position > 0 && position < 57 && position + gameState.diceValue <= 57) {
//         movableCoins.push(index);
//       }
//     });

//     console.log(`AI ${aiPlayerId} movable coins: ${movableCoins}`);

//     if (movableCoins.length > 0) {
//       // Simple AI: Choose a random movable coin
//       const coinIndex = movableCoins[Math.floor(Math.random() * movableCoins.length)];
//       const coinId = `${gameState.players[playerIndex].color}-${coinIndex + 1}`;
//       console.log(`AI ${aiPlayerId} moving coin: ${coinId}`);
//       await this.moveCoin({ roomId, playerId: aiPlayerId, coinId });
//     } else {
//       // No valid moves: Pass turn
//       console.log(`AI ${aiPlayerId} has no valid moves, passing turn`);
//       gameState.diceValue = 0;
//       gameState.diceRolled = false;
//       gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
//       gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
//       await this.updateGameState(roomId, gameState);
//       if (gameState.currentTurn.startsWith('ai-') && !gameState.gameOver) {
//         setTimeout(() => this.handleAITurn(roomId, gameState.currentTurn), 1000);
//       }
//     }
//   }

//   async startGame(roomId: string) {
//     const gameState = await this.getGameState(roomId);
//     if (gameState.gameStarted) throw new Error('Game already started');
//     const room = await this.getGameRoomById(roomId);
//     if (!room) throw new Error('Room not found');
//     if (room.playerIds.length < 2) throw new Error('At least 2 players required');

//     // Add AI players if needed
//     const colors = ['red', 'blue', 'green', 'yellow'];
//     while (room.playerIds.length < 4) {
//       const aiPlayerId = `ai-${room.playerIds.length + 1}`;
//       room.playerIds.push(aiPlayerId);
//       gameState.players.push({
//         id: aiPlayerId,
//         name: `AI ${room.playerIds.length}`,
//         color: colors[room.playerIds.length - 1],
//         coins: [0, 0, 0, 0],
//       });
//       gameState.coins[aiPlayerId] = [0, 0, 0, 0];
//     }
//     room.currentPlayers = room.playerIds.length;
//     await room.save();

//     gameState.gameStarted = true;
//     await this.updateGameState(roomId, gameState);
//     await this.gameRoomModel.findOneAndUpdate({ roomId }, { status: 'in-progress' }, { new: true });

//     // If first player is AI, start their turn
//     if (gameState.currentTurn.startsWith('ai-')) {
//       setTimeout(() => this.handleAITurn(roomId, gameState.currentTurn), 1000);
//     }

//     return gameState;
//   }

//   async handleDisconnect(client: Socket) {
//     const rooms = await this.gameRoomModel.find({ playerIds: client.id });
//     for (const room of rooms) {
//       const gameState = await this.getGameState(room.roomId);
//       if (gameState.currentTurn === client.id) {
//         gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
//         gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
//         gameState.diceValue = 0;
//         gameState.diceRolled = false;
//         await this.updateGameState(room.roomId, gameState);
//         if (gameState.currentTurn.startsWith('ai-') && !gameState.gameOver) {
//           setTimeout(() => this.handleAITurn(room.roomId, gameState.currentTurn), 1000);
//         }
//       }
//     }
//   }

//   async getGameState(roomId: string): Promise<GameState> {
//     const redisState = await this.redisService.get(`game:${roomId}`);
//     if (redisState) {
//       const parsedState: GameState = JSON.parse(redisState);
//       const colors = ['red', 'blue', 'green', 'yellow'];
//       return {
//         ...parsedState,
//         players: parsedState.players.map((player, index) => ({
//           id: player.id,
//           name: player.id.startsWith('ai-') ? `AI ${index + 1}` : player.name,
//           color: colors[index],
//           coins: parsedState.coins[player.id] || [0, 0, 0, 0],
//         })),
//         currentPlayer: parsedState.players.findIndex((p) => p.id === parsedState.currentTurn),
//         diceRolled: parsedState.diceValue !== 0,
//       };
//     }
//     const room = await this.getGameRoomById(roomId);
//     if (!room) throw new Error('Room not found');
//     const colors = ['red', 'blue', 'green', 'yellow'];
//     const defaultGameState: GameState = {
//       roomId,
//       gameType: room.gameType,
//       roomName: room.name,
//       gameStarted: false,
//       gameOver: false,
//       currentPlayer: 0,
//       currentTurn: room.playerIds?.[0] || '',
//       players: room.playerIds.map((playerId, index) => ({
//         id: playerId,
//         name: playerId.startsWith('ai-') ? `AI ${index + 1}` : playerId, 
//         color: colors[index],
//         coins: [0, 0, 0, 0],
//       })),
//       coins: room.playerIds.reduce((acc, playerId) => ({
//         ...acc,
//         [playerId]: [0, 0, 0, 0],
//       }), {}),
//       diceValue: 0,
//       diceRolled: false,
//       winner: null,
//     };
//     await this.updateGameState(roomId, defaultGameState);
//     return this.getGameState(roomId);
//   }



//   async updateGameState(roomId: string, gameState: GameState) {
//     await this.redisService.set(`game:${roomId}`, JSON.stringify(gameState));
//   }

//   async saveGameSession(roomId: string, gameState: GameState) {
//     const gameSession = new this.gameSessionModel({
//       roomId,
//       players: gameState.players.map((p) => p.id),
//       winner: gameState.winner,
//       moves: [],
//       createdAt: new Date(),
//     });
//     await gameSession.save();
//   }

//   async getScores(roomId: string) {
//     const room = await this.gameRoomModel.findOne({ roomId });
//     if (!room) throw new Error('Game room not found');
//     return room.scores ?? {};
//   }

//   async getActiveGameRooms(): Promise<PublicGameRoom[]> {
//     const rooms = await this.gameRoomModel
//       .find({ status: { $in: ['waiting', 'in-progress'] } })
//       .sort({ createdAt: -1 })
//       .lean()
//       .exec();
//     return rooms.map((room) => ({
//       id: room.roomId,
//       roomId: room.roomId,
//       name: room.name,
//       gameType: room.gameType,
//       hostName: room.host,
//       hostAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(room.host)}`,
//       currentPlayers: room.currentPlayers,
//       maxPlayers: room.maxPlayers,
//       isPrivate: room.isPrivate,
//       isInviteOnly: room.isPrivate,
//       status: room.status,
//       host: room.host,
//       createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : new Date().toISOString(),
//       scheduledTimeCombined: room.scheduledTimeCombined ? new Date(room.scheduledTimeCombined).toISOString() : undefined,
//       scores: room.scores ? Object.fromEntries(Object.entries(room.scores)) : {},
//     }));
//   }

//   async getGameRoomById(identifier: string) {
//     try {
//       let room = await this.gameRoomModel.findOne({ roomId: identifier }).exec();
//       if (!room && Types.ObjectId.isValid(identifier)) {
//         room = await this.gameRoomModel.findById(identifier).exec();
//       }
//       return room;
//     } catch (error) {
//       console.error('Error finding game room:', error);
//       return null;
//     }
//   }

//   async getMyGameRooms(playerId: string): Promise<{ hosted: PublicGameRoom[]; joined: PublicGameRoom[] }> {
//     const rooms = await this.gameRoomModel
//       .find({
//         $or: [
//           { host: playerId },
//           { playerIds: playerId },
//         ],
//         status: { $in: ['waiting', 'in-progress'] },
//       })
//       .sort({ createdAt: -1 })
//       .lean()
//       .exec();

//     const hosted = rooms
//       .filter((room) => room.host === playerId)
//       .map((room) => ({
//         id: room.roomId,
//         roomId: room.roomId,
//         name: room.name,
//         gameType: room.gameType,
//         hostName: room.host,
//         hostAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(room.host)}`,
//         currentPlayers: room.currentPlayers,
//         maxPlayers: room.maxPlayers,
//         isPrivate: room.isPrivate,
//         isInviteOnly: room.isPrivate,
//         status: room.status,
//         host: room.host,
//         createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : new Date().toISOString(),
//         scheduledTimeCombined: room.scheduledTimeCombined ? new Date(room.scheduledTimeCombined).toISOString() : undefined,
//         scores: room.scores ? Object.fromEntries(Object.entries(room.scores)) : {},
//       }));

//     const joined = rooms
//       .filter((room) => room.playerIds.includes(playerId))
//       .map((room) => ({
//         id: room.roomId,
//         roomId: room.roomId,
//         name: room.name,
//         gameType: room.gameType,
//         hostName: room.host,
//         hostAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(room.host)}`,
//         currentPlayers: room.currentPlayers,
//         maxPlayers: room.maxPlayers,
//         isPrivate: room.isPrivate,
//         isInviteOnly: room.isPrivate,
//         status: room.status,
//         host: room.host,
//         createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : new Date().toISOString(),
//         scheduledTimeCombined: room.scheduledTimeCombined ? new Date(room.scheduledTimeCombined).toISOString() : undefined,
//         scores: room.scores ? Object.fromEntries(Object.entries(room.scores)) : {},
//       }));

//     return { hosted, joined };
//   }
// }


// import { Injectable } from '@nestjs/common';
// import { RedisService } from '../redis/redis.service';
// import { Model } from 'mongoose';
// import { InjectModel } from '@nestjs/mongoose';
// import { GameRoom, GameRoomDocument } from './schemas/game-room.schema';
// import { GameSessionEntity, GameSessionDocument } from './schemas/game-session.schema';
// import { CreateGameDto, JoinGameDto, MoveCoinDto, RollDiceDto } from './dto/game.dto';
// import { v4 as uuidv4 } from 'uuid';
// import { Socket } from 'socket.io';
// import { Types } from 'mongoose';

// interface PublicGameRoom {
//   id: string;
//   roomId: string;
//   name: string;
//   gameType: string;
//   hostName: string;
//   hostAvatar: string;
//   currentPlayers: number;
//   maxPlayers: number;
//   isPrivate: boolean;
//   isInviteOnly: boolean;
//   status: 'waiting' | 'in-progress' | 'completed';
//   host: string;
//   createdAt: string;
//   scheduledTimeCombined?: string;
//   scores?: Record<string, number>;
// }

// interface GameState {
//   roomId: string;
//   players: { id: string; name: string; color: string; coins: number[] }[];
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

// @Injectable()
// export class GameService {
//   private boardPath = Array.from({ length: 52 }, (_, i) => i + 1);
//   private startPositions = [1, 14, 27, 40];
//   private safePositions = [1, 9, 14, 22, 27, 35, 40, 48];

//   constructor(
//     private readonly redisService: RedisService,
//     @InjectModel(GameRoom.name) private gameRoomModel: Model<GameRoomDocument>,
//     @InjectModel(GameSessionEntity.name) private gameSessionModel: Model<GameSessionDocument>,
//   ) {}

//   async createGame(createGameDto: CreateGameDto) {
//     const roomId = uuidv4();
//     let scheduledTimeCombined: Date | undefined;
//     if (createGameDto.scheduledTimeCombined) {
//       scheduledTimeCombined = new Date(createGameDto.scheduledTimeCombined);
//       if (isNaN(scheduledTimeCombined.getTime())) throw new Error('Invalid scheduled time format');
//       if (scheduledTimeCombined <= new Date()) throw new Error('Scheduled time must be in the future');
//     }
//     const gameRoom = new this.gameRoomModel({
//       roomId,
//       name: createGameDto.name,
//       gameType: createGameDto.gameType.toLowerCase(),
//       host: createGameDto.hostId,
//       maxPlayers: 4,
//       currentPlayers: 1,
//       isPrivate: createGameDto.isPrivate,
//       password: createGameDto.password,
//       status: 'waiting',
//       scheduledTimeCombined,
//       playerIds: [createGameDto.hostId],
//       createdAt: new Date(),
//     });
//     await gameRoom.save();
//     await this.initializeGameState(roomId, createGameDto.hostId, createGameDto.name);
//     return gameRoom;
//   }

//   private async initializeGameState(roomId: string, hostId: string, roomName: string) {
//     const colors = ['red', 'blue', 'green', 'yellow'];
//     const initialGameState: GameState = {
//       roomId,
//       players: [{ id: hostId, name: hostId, color: colors[0], coins: [0, 0, 0, 0] }],
//       currentTurn: hostId,
//       currentPlayer: 0,
//       diceValue: 0,
//       diceRolled: false,
//       coins: {
//         [hostId]: [0, 0, 0, 0],
//       },
//       gameStarted: false,
//       gameOver: false,
//       winner: null,
//       roomName,
//       gameType: 'ludo',
//     };
//     await this.redisService.set(`game:${roomId}`, JSON.stringify(initialGameState));
//   }

//   async joinGame(joinGameDto: JoinGameDto) {
//     const gameRoom = await this.gameRoomModel.findOne({ roomId: joinGameDto.roomId });
//     if (!gameRoom) throw new Error('Game room not found');
//     if (gameRoom.currentPlayers >= gameRoom.maxPlayers) throw new Error('Game room is full');
//     if (gameRoom.isPrivate && gameRoom.password !== joinGameDto.password) throw new Error('Invalid password');
//     if (!gameRoom.playerIds.includes(joinGameDto.playerId)) {
//       gameRoom.playerIds.push(joinGameDto.playerId);
//       gameRoom.currentPlayers = gameRoom.playerIds.length;
//       await gameRoom.save();
//       const gameState = await this.getGameState(joinGameDto.roomId);
//       const colors = ['red', 'blue', 'green', 'yellow'];
//       const playerIndex = gameState.players.length;
//       gameState.players.push({
//         id: joinGameDto.playerId,
//         name: joinGameDto.playerName || joinGameDto.playerId,
//         color: colors[playerIndex],
//         coins: [0, 0, 0, 0],
//       });
//       gameState.coins[joinGameDto.playerId] = [0, 0, 0, 0];
//       await this.updateGameState(joinGameDto.roomId, gameState);
//     }
//     return { game: gameRoom, player: joinGameDto.playerId };
//   }

//   async rollDice(rollDiceDto: RollDiceDto) {
//     const gameState = await this.getGameState(rollDiceDto.roomId);
//     if (gameState.currentTurn !== rollDiceDto.playerId) throw new Error('Not your turn');
//     if (gameState.diceRolled) throw new Error('Dice already rolled');
//     const diceValue = Math.floor(Math.random() * 6) + 1;
//     gameState.diceValue = diceValue;
//     gameState.diceRolled = true;
//     await this.updateGameState(rollDiceDto.roomId, gameState);
//     return { roomId: rollDiceDto.roomId, diceValue, playerId: rollDiceDto.playerId };
//   }

//   async moveCoin(moveCoinDto: MoveCoinDto) {
//     const gameState = await this.getGameState(moveCoinDto.roomId);
//     if (gameState.currentTurn !== moveCoinDto.playerId) throw new Error('Not your turn');
//     if (!gameState.diceRolled) throw new Error('You must roll the dice first');
//     const [color, coinIndexStr] = moveCoinDto.coinId.split('-');
//     const coinIndex = parseInt(coinIndexStr) - 1;
//     const playerIndex = gameState.players.findIndex((p) => p.id === moveCoinDto.playerId);
//     const coinPosition = gameState.coins[moveCoinDto.playerId][coinIndex];
//     let newPosition = coinPosition;

//     if (coinPosition === 0 && gameState.diceValue === 6) {
//       newPosition = this.startPositions[playerIndex];
//     } else if (coinPosition > 0 && coinPosition < 57) {
//       newPosition = coinPosition + gameState.diceValue;
//       if (newPosition > 57) throw new Error('Invalid move: Beyond home');
//       if (newPosition > 51 && newPosition < 57) {
//         const homeStretchPosition = newPosition - 51;
//         if (homeStretchPosition > 6) throw new Error('Invalid move: Beyond home stretch');
//       }
//     } else {
//       throw new Error('Invalid move');
//     }

//     // Check for captures
//     if (!this.safePositions.includes(newPosition % 52) && newPosition <= 51) {
//       for (const opponentId of Object.keys(gameState.coins)) {
//         if (opponentId !== moveCoinDto.playerId) {
//           gameState.coins[opponentId].forEach((pos, idx) => {
//             if (pos === newPosition) {
//               gameState.coins[opponentId][idx] = 0;
//               gameState.players[gameState.players.findIndex((p) => p.id === opponentId)].coins[idx] = 0;
//             }
//           });
//         }
//       }
//     }

//     // Update coin position
//     gameState.coins[moveCoinDto.playerId][coinIndex] = newPosition;
//     gameState.players[playerIndex].coins[coinIndex] = newPosition;

//     // Check win condition
//     const hasWon = gameState.coins[moveCoinDto.playerId].every((pos) => pos === 57);
//     if (hasWon) {
//       gameState.winner = moveCoinDto.playerId;
//       gameState.gameOver = true;
//       await this.gameRoomModel.updateOne(
//         { roomId: moveCoinDto.roomId },
//         { status: 'completed', winner: moveCoinDto.playerId },
//       );
//       await this.saveGameSession(moveCoinDto.roomId, gameState);
//     }

//     // Update turn
//     if (gameState.diceValue !== 6) {
//       gameState.diceValue = 0;
//       gameState.diceRolled = false;
//       gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
//       gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
//     } else {
//       gameState.diceRolled = false;
//     }

//     await this.updateGameState(moveCoinDto.roomId, gameState);
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
//   }

//   async startGame(roomId: string) {
//     const gameState = await this.getGameState(roomId);
//     if (gameState.gameStarted) throw new Error('Game already started');
//     const room = await this.getGameRoomById(roomId);
//     if (!room) throw new Error('Room not found');
//     if (room.playerIds.length < 2) throw new Error('At least 2 players required');

//     // Add AI players if needed
//     const colors = ['red', 'blue', 'green', 'yellow'];
//     while (room.playerIds.length < 4) {
//       const aiPlayerId = `ai-${room.playerIds.length + 1}`;
//       room.playerIds.push(aiPlayerId);
//       gameState.players.push({
//         id: aiPlayerId,
//         name: `AI ${room.playerIds.length}`,
//         color: colors[room.playerIds.length - 1],
//         coins: [0, 0, 0, 0],
//       });
//       gameState.coins[aiPlayerId] = [0, 0, 0, 0];
//     }
//     room.currentPlayers = room.playerIds.length;
//     await room.save();

//     gameState.gameStarted = true;
//     await this.updateGameState(roomId, gameState);
//     await this.gameRoomModel.findOneAndUpdate({ roomId }, { status: 'in-progress' }, { new: true });
//     return gameState;
//   }

//   async handleDisconnect(client: Socket) {
//     const rooms = await this.gameRoomModel.find({ playerIds: client.id });
//     for (const room of rooms) {
//       const gameState = await this.getGameState(room.roomId);
//       if (gameState.currentTurn === client.id) {
//         gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
//         gameState.currentTurn = gameState.players[gameState.currentPlayer].id;
//         gameState.diceValue = 0;
//         gameState.diceRolled = false;
//         await this.updateGameState(room.roomId, gameState);
//       }
//     }
//   }

//   async getGameState(roomId: string): Promise<GameState> {
//     const redisState = await this.redisService.get(`game:${roomId}`);
//     if (redisState) {
//       const parsedState: GameState = JSON.parse(redisState);
//       const colors = ['red', 'blue', 'green', 'yellow'];
//       return {
//         ...parsedState,
//         players: parsedState.players.map((player, index) => ({
//           id: player.id,
//           name: player.id.startsWith('ai-') ? `AI ${index + 1}` : player.name,
//           color: colors[index],
//           coins: parsedState.coins[player.id] || [0, 0, 0, 0],
//         })),
//         currentPlayer: parsedState.players.findIndex((p) => p.id === parsedState.currentTurn),
//         diceRolled: parsedState.diceValue !== 0,
//       };
//     }
//     const room = await this.getGameRoomById(roomId);
//     if (!room) throw new Error('Room not found');
//     const colors = ['red', 'blue', 'green', 'yellow'];
//     const defaultGameState: GameState = {
//       roomId,
//       gameType: room.gameType,
//       roomName: room.name,
//       gameStarted: false,
//       gameOver: false,
//       currentPlayer: 0,
//       currentTurn: room.playerIds?.[0] || '',
//       players: room.playerIds.map((playerId, index) => ({
//         id: playerId,
//         name: playerId.startsWith('ai-') ? `AI ${index + 1}` : playerId,
//         color: colors[index],
//         coins: [0, 0, 0, 0],
//       })),
//       coins: room.playerIds.reduce((acc, playerId) => ({
//         ...acc,
//         [playerId]: [0, 0, 0, 0],
//       }), {}),
//       diceValue: 0,
//       diceRolled: false,
//       winner: null,
//     };
//     await this.updateGameState(roomId, defaultGameState);
//     return this.getGameState(roomId);
//   }

//   async updateGameState(roomId: string, gameState: GameState) {
//     await this.redisService.set(`game:${roomId}`, JSON.stringify(gameState));
//   }

//   async saveGameSession(roomId: string, gameState: GameState) {
//     const gameSession = new this.gameSessionModel({
//       roomId,
//       players: gameState.players.map((p) => p.id),
//       winner: gameState.winner,
//       moves: [],
//       createdAt: new Date(),
//     });
//     await gameSession.save();
//   }

//   async getScores(roomId: string) {
//     const room = await this.gameRoomModel.findOne({ roomId });
//     if (!room) throw new Error('Game room not found');
//     return room.scores ?? {};
//   }

//   async getActiveGameRooms(): Promise<PublicGameRoom[]> {
//     const rooms = await this.gameRoomModel
//       .find({ status: { $in: ['waiting', 'in-progress'] } })
//       .sort({ createdAt: -1 })
//       .lean()
//       .exec();
//     return rooms.map((room) => ({
//       id: room.roomId,
//       roomId: room.roomId,
//       name: room.name,
//       gameType: room.gameType,
//       hostName: room.host,
//       hostAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(room.host)}`,
//       currentPlayers: room.currentPlayers,
//       maxPlayers: room.maxPlayers,
//       isPrivate: room.isPrivate,
//       isInviteOnly: room.isPrivate,
//       status: room.status,
//       host: room.host,
//       createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : new Date().toISOString(),
//       scheduledTimeCombined: room.scheduledTimeCombined ? new Date(room.scheduledTimeCombined).toISOString() : undefined,
//       scores: room.scores ? Object.fromEntries(Object.entries(room.scores)) : {},
//     }));
//   }

//   async getGameRoomById(identifier: string) {
//     try {
//       let room = await this.gameRoomModel.findOne({ roomId: identifier }).exec();
//       if (!room && Types.ObjectId.isValid(identifier)) {
//         room = await this.gameRoomModel.findById(identifier).exec();
//       }
//       return room;
//     } catch (error) {
//       console.error('Error finding game room:', error);
//       return null;
//     }
//   }

//   async getMyGameRooms(playerId: string): Promise<{ hosted: PublicGameRoom[]; joined: PublicGameRoom[] }> {
//     const rooms = await this.gameRoomModel
//       .find({
//         $or: [
//           { host: playerId },
//           { playerIds: playerId },
//         ],
//         status: { $in: ['waiting', 'in-progress'] },
//       })
//       .sort({ createdAt: -1 })
//       .lean()
//       .exec();

//     const hosted = rooms
//       .filter((room) => room.host === playerId)
//       .map((room) => ({
//         id: room.roomId,
//         roomId: room.roomId,
//         name: room.name,
//         gameType: room.gameType,
//         hostName: room.host,
//         hostAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(room.host)}`,
//         currentPlayers: room.currentPlayers,
//         maxPlayers: room.maxPlayers,
//         isPrivate: room.isPrivate,
//         isInviteOnly: room.isPrivate,
//         status: room.status,
//         host: room.host,
//         createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : new Date().toISOString(),
//         scheduledTimeCombined: room.scheduledTimeCombined ? new Date(room.scheduledTimeCombined).toISOString() : undefined,
//         scores: room.scores ? Object.fromEntries(Object.entries(room.scores)) : {},
//       }));

//     const joined = rooms
//       .filter((room) => room.playerIds.includes(playerId))
//       .map((room) => ({
//         id: room.roomId,
//         roomId: room.roomId,
//         name: room.name,
//         gameType: room.gameType,
//         hostName: room.host,
//         hostAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(room.host)}`,
//         currentPlayers: room.currentPlayers,
//         maxPlayers: room.maxPlayers,
//         isPrivate: room.isPrivate,
//         isInviteOnly: room.isPrivate,
//         status: room.status,
//         host: room.host,
//         createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : new Date().toISOString(),
//         scheduledTimeCombined: room.scheduledTimeCombined ? new Date(room.scheduledTimeCombined).toISOString() : undefined,
//         scores: room.scores ? Object.fromEntries(Object.entries(room.scores)) : {},
//       }));

//     return { hosted, joined };
//   }
// }
