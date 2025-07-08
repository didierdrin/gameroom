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
  scores: Record<string, number>;
  scheduledTimeCombined: string;
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
    await this.updateGameState(rollDiceDto.roomId, gameState);
    return { roomId: rollDiceDto.roomId, diceValue, playerId: rollDiceDto.playerId };
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
              gameState.coins[opponentId][idx] = 0; // Send back to base
            }
          });
        }
      }
    }

    // Update coin position
    gameState.coins[moveCoinDto.playerId][coinIndex] = newPosition;
    gameState.players[playerIndex].coins[coinIndex] = newPosition;

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
    // await this.updateGameState(rollDiceDto.roomId, gameState);
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
          id: player.id, // Keep original string ID
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
      scores: Object.fromEntries((room.scores as any)?.entries?.() || []),
      scheduledTimeCombined: room.scheduledTimeCombined ? new Date(room.scheduledTimeCombined).toISOString() : '',
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
//   scores: Record<string, number>;
//   scheduledTimeCombined: string;
// }

// interface GameState {
//   roomId: string;
//   players: { id: string; name: string }[];
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
//     });
//     await gameRoom.save();
//     await this.initializeGameState(roomId, createGameDto.hostId, createGameDto.name);
//     return gameRoom;
//   }

//   private async initializeGameState(roomId: string, hostId: string, roomName: string) {
//     const colors = ['red', 'blue', 'green', 'yellow'];
//     const initialGameState: GameState = {
//       roomId,
//       players: [{ id: hostId, name: hostId }],
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
//       gameState.players.push({ id: joinGameDto.playerId, name: joinGameDto.playerName || joinGameDto.playerId });
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
//               gameState.coins[opponentId][idx] = 0; // Send back to base
//             }
//           });
//         }
//       }
//     }

//     // Update coin position
//     gameState.coins[moveCoinDto.playerId][coinIndex] = newPosition;

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
//       gameState.players.push({ id: aiPlayerId, name: `AI ${room.playerIds.length}` });
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
//           id: index,
//           color: colors[index],
//           name: player.id.startsWith('ai-') ? `AI ${index + 1}` : player.name,
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
//       scores: Object.fromEntries((room.scores as any)?.entries?.() || []),
//       scheduledTimeCombined: room.scheduledTimeCombined ? new Date(room.scheduledTimeCombined).toISOString() : '',
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
// }


// // // src/game/game.service.ts

// import { Injectable } from '@nestjs/common';
// import { RedisService } from '../redis/redis.service';
// import { Model } from 'mongoose';
// import { Types, Document } from 'mongoose'; 
// import { InjectModel } from '@nestjs/mongoose';
// import { GameRoom, GameRoomDocument } from './schemas/game-room.schema';
// import { GameSessionEntity, GameSessionDocument } from './schemas/game-session.schema';
// import { CreateGameDto, JoinGameDto, MoveCoinDto, RollDiceDto } from './dto/game.dto';
// import { v4 as uuidv4 } from 'uuid';
// import { Socket } from 'socket.io';
// import { scheduled } from 'rxjs';


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
//   scores: Record<string, number>;
//   scheduledTimeCombined: string;
// }


// @Injectable()
// export class GameService {
//   constructor(
//     private readonly redisService: RedisService,
//     @InjectModel(GameRoom.name) private gameRoomModel: Model<GameRoomDocument>,
//     @InjectModel(GameSessionEntity.name) private gameSessionModel: Model<GameSessionDocument>,
//   ) {}

//   async createGame(createGameDto: CreateGameDto) {
//     const roomId = uuidv4();
//     // const scheduledTime = createGameDto.scheduledTimeCombined
//     // ? new Date(createGameDto.scheduledTimeCombined)
//     // : undefined;
//     let scheduledTimeCombined: Date | undefined;
//   if (createGameDto.scheduledTimeCombined) {
//     scheduledTimeCombined = new Date(createGameDto.scheduledTimeCombined);
    
//     // Validate the date
//     if (isNaN(scheduledTimeCombined.getTime())) {
//       throw new Error('Invalid scheduled time format');
//     }
    
//     // Optional: Validate that the scheduled time is in the future
//     const now = new Date();
//     if (scheduledTimeCombined <= now) {
//       throw new Error('Scheduled time must be in the future');
//     }
//   }
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
//     });

//     await gameRoom.save();

//     // Initialize game state in Redis
//     await this.initializeGameState(roomId, createGameDto.hostId);

//     return gameRoom;
//   }



//   private async initializeGameState(roomId: string, hostId: string) {
//     const colors = ['red', 'blue', 'green', 'yellow'];
    
//     const initialGameState = {
//       roomId,
//       players: [hostId],
//       currentTurn: hostId,
//       currentPlayer: 0,
//       diceValue: 0,
//       diceRolled: false,
//       coins: {
//         [hostId]: {
//           'red-1': { position: 'base', steps: 0 },
//           'red-2': { position: 'base', steps: 0 },
//           'red-3': { position: 'base', steps: 0 },
//           'red-4': { position: 'base', steps: 0 }
//         }
//       },
//       gameStarted: false,
//       gameOver: false,
//       winner: null,
//       roomName: '',
//       gameType: ''
//     };
  
//     await this.redisService.set(`game:${roomId}`, JSON.stringify(initialGameState));
//   }

//   private initializeCoins(playerIds: string[]) {
//     const coins = {};
//     const colors = ['red', 'blue', 'green', 'yellow'];
    
//     playerIds.forEach((playerId, index) => {
//       coins[playerId] = {};
//       for (let i = 1; i <= 4; i++) {
//         coins[playerId][`${colors[index]}-${i}`] = {
//           position: 'base',
//           steps: 0,
//         };
//       }
//     });
    
//     return coins;
//   }

//   async joinGame(joinGameDto: JoinGameDto) {
//     const gameRoom = await this.gameRoomModel.findOne({ roomId: joinGameDto.roomId });
    
//     if (!gameRoom) {
//       throw new Error('Game room not found');
//     }
    
//     if (gameRoom.currentPlayers >= gameRoom.maxPlayers) {
//       throw new Error('Game room is full');
//     }
    
//     if (gameRoom.isPrivate && gameRoom.password !== joinGameDto.password) {
//       throw new Error('Invalid password');
//     }
  
//     // Only update if player is not already in the room
//     if (!gameRoom.playerIds.includes(joinGameDto.playerId)) {
//       gameRoom.playerIds.push(joinGameDto.playerId);
//       gameRoom.currentPlayers = gameRoom.playerIds.length; // Single update point
//       await gameRoom.save();
      
//       // Update game state in Redis
//       const gameState = await this.getGameState(joinGameDto.roomId);
//       gameState.players.push(joinGameDto.playerId);
//       gameState.coins = {
//         ...gameState.coins,
//         ...this.initializeCoins([joinGameDto.playerId]),
//       };
//       await this.updateGameState(joinGameDto.roomId, gameState);
//     }
    
//     return { game: gameRoom, player: joinGameDto.playerId };
//   }

  

//   async rollDice(rollDiceDto: RollDiceDto) {
//     const gameState = await this.getGameState(rollDiceDto.roomId);
    
//     if (gameState.currentTurn !== rollDiceDto.playerId) {
//       throw new Error('Not your turn');
//     }
    
//     if (gameState.diceValue !== 0) {
//       throw new Error('Dice already rolled');
//     }
    
//     // Roll dice (1-6)
//     const diceValue = Math.floor(Math.random() * 6) + 1;
//     gameState.diceValue = diceValue;
//     await this.updateGameState(rollDiceDto.roomId, gameState);
    
//     return { roomId: rollDiceDto.roomId, diceValue, playerId: rollDiceDto.playerId };
//   }

//   async moveCoin(moveCoinDto: MoveCoinDto) {
//     const gameState = await this.getGameState(moveCoinDto.roomId);
    
//     if (gameState.currentTurn !== moveCoinDto.playerId) {
//       throw new Error('Not your turn');
//     }
    
//     if (gameState.diceValue === 0) {
//       throw new Error('You must roll the dice first');
//     }
    
//     const coin = gameState.coins[moveCoinDto.playerId][moveCoinDto.coinId];
//     if (!coin) {
//       throw new Error('Invalid coin');
//     }
    
//     // Implement Ludo movement logic
//     const newPosition = this.calculateNewPosition(coin, gameState.diceValue);
    
//     // Check if the new position is occupied by opponent's coin
//     for (const playerId in gameState.coins) {
//       if (playerId !== moveCoinDto.playerId) {
//         for (const coinId in gameState.coins[playerId]) {
//           const opponentCoin = gameState.coins[playerId][coinId];
//           if (opponentCoin.position === newPosition.position) {
//             // Send opponent's coin back to base
//             opponentCoin.position = 'base';
//             opponentCoin.steps = 0;
//           }
//         }
//       }
//     }
    
//     // Update the moved coin
//     coin.position = newPosition.position;
//     coin.steps = newPosition.steps;
    
//     // Check if player has won
//     const hasWon = this.checkWinCondition(gameState.coins[moveCoinDto.playerId]);
//     if (hasWon) {
//       gameState.winner = moveCoinDto.playerId;
//       gameState.gameOver = true;
      
//       // Update MongoDB
//       await this.gameRoomModel.updateOne(
//         { roomId: moveCoinDto.roomId },
//         { status: 'completed', winner: moveCoinDto.playerId }
//       );
      
//       // Save game session
//       await this.saveGameSession(moveCoinDto.roomId, gameState);
//     }
    
//     // Reset dice value and move to next player if not 6
//     if (gameState.diceValue !== 6) {
//       gameState.diceValue = 0;
//       gameState.currentTurn = this.getNextPlayer(gameState.players, moveCoinDto.playerId);
//     }
    
//     await this.updateGameState(moveCoinDto.roomId, gameState);
    
//     return {
//       roomId: moveCoinDto.roomId,
//       coins: gameState.coins,
//       currentTurn: gameState.currentTurn,
//       diceValue: gameState.diceValue,
//       gameOver: gameState.gameOver,
//       winner: gameState.winner,
//     };
//   }

//   private calculateNewPosition(coin: any, diceValue: number) {
//     // Simplified Ludo movement logic
//     const maxSteps = 57; // Total steps to reach home
    
//     if (coin.position === 'base') {
//       if (diceValue === 6) {
//         return { position: 'start', steps: 0 };
//       }
//       return coin; // Can't move from base unless dice is 6
//     }
    
//     const newSteps = coin.steps + diceValue;
    
//     if (newSteps > maxSteps) {
//       return coin; // Can't move beyond home
//     }
    
//     if (newSteps === maxSteps) {
//       return { position: 'home', steps: newSteps };
//     }
    
//     return { position: 'path', steps: newSteps };
//   }

//   private checkWinCondition(playerCoins: any) {
//     // Player wins if all 4 coins reach home
//     return Object.values(playerCoins).every((coin: any) => coin.position === 'home');
//   }

//   private getNextPlayer(players: string[], currentPlayerId: string) {
//     const currentIndex = players.indexOf(currentPlayerId);
//     const nextIndex = (currentIndex + 1) % players.length;
//     return players[nextIndex];
//   }

//   async startGame(roomId: string) {
//     const gameState = await this.getGameState(roomId);
    
//     if (gameState.gameStarted) {
//       throw new Error('Game already started');
//     }
  
//     // Get the room to check player count
//     const room = await this.getGameRoomById(roomId);
//     if (!room) {
//       throw new Error('Room not found');
//     }
  
//     // If not enough players, add AI players
//     if (room.playerIds.length < 4) {
//       const aiPlayersNeeded = 4 - room.playerIds.length;
//       for (let i = 0; i < aiPlayersNeeded; i++) {
//         const aiPlayerId = `ai-${i+1}`;
//         room.playerIds.push(aiPlayerId);
//       }
//       room.currentPlayers = 4;
//       await room.save();
//     }
  
//     // Update game state
//     gameState.gameStarted = true;
//     gameState.players = room.playerIds;
//     await this.updateGameState(roomId, gameState);
  
//     // Update room status
//     const updatedRoom = await this.gameRoomModel.findOneAndUpdate(
//       { roomId },
//       { status: 'in-progress', currentPlayers: 4 },
//       { new: true }
//     );
    
//     return updatedRoom;
//   }
  

//   async handleDisconnect(client: Socket) {
//     // Handle player disconnection
//     // Could implement reconnection logic or AI takeover
//   }



//   async getGameState(roomId: string) {
//     try {
//       // Try to get game state from Redis first
//       const redisState = await this.redisService.get(`game:${roomId}`);
      
//       if (redisState) {
//         const parsedState = JSON.parse(redisState);
        
//         // Convert Redis state to frontend-compatible format
//         return {
//           ...parsedState,
//           players: parsedState.players.map((playerId: string, index: number) => {
//             const colors = ['red', 'blue', 'green', 'yellow'];
//             return {
//               id: index,
//               color: colors[index],
//               name: playerId.startsWith('ai-') ? `AI ${index + 1}` : playerId,
//               coins: parsedState.coins[playerId] 
//                 ? Object.values(parsedState.coins[playerId]).map((coin: any) => coin.steps || 0)
//                 : [0, 0, 0, 0]
//             };
//           }),
//           currentPlayer: parsedState.players.indexOf(parsedState.currentTurn),
//           diceRolled: parsedState.diceValue !== 0,
//           roomName: parsedState.roomName || '',
//           gameType: parsedState.gameType || ''
//         };
//       }
      
//       // If no game state in Redis, create a default one
//       const room = await this.getGameRoomById(roomId);
//       if (!room) {
//         throw new Error('Room not found');
//       }
      
//       const colors = ['red', 'blue', 'green', 'yellow'];
//       const defaultGameState = {
//         roomId,
//         gameType: room.gameType,
//         roomName: room.name,
//         gameStarted: false,
//         gameOver: false,
//         currentPlayer: 0,
//         currentTurn: room.playerIds?.[0] || null,
//         players: room.playerIds?.map((playerId, index) => ({
//           id: index,
//           color: colors[index],
//           name: playerId.startsWith('ai-') ? `AI ${index + 1}` : playerId,
//           coins: [0, 0, 0, 0]
//         })) || [],
//         diceValue: 0,
//         diceRolled: false,
//         winner: null
//       };
      
//       // Save default state to Redis
//       await this.updateGameState(roomId, defaultGameState);
      
//       return defaultGameState;
//     } catch (error) {
//       console.error('Error getting game state:', error);
//       throw error;
//     }
//   }

//   private async updateGameState(roomId: string, gameState: any) {
//     await this.redisService.set(`game:${roomId}`, JSON.stringify(gameState));
//   }

//   private async saveGameSession(roomId: string, gameState: any) {
//     const gameSession = new this.gameSessionModel({
//       roomId,
//       players: gameState.players,
//       winner: gameState.winner,
//       moves: [], // Could track all moves if needed
//       createdAt: new Date(),
//     });
    
//     await gameSession.save();
//   }

 
  
//   async getScores(roomId: string) {
//     const room = await this.gameRoomModel.findOne({ roomId });
//     if (!room) throw new Error('Game room not found');
//     return room.scores ?? {};
//   }

//   async getAllGameRooms(): Promise<any[]> {
//     try {
//       const keys = await this.redisService.getKeys('gameRoom:*');
//       const rooms = await Promise.all(
//         keys.map(async (key) => {
//           try {
//             return await this.redisService.getJSON(key);
//           } catch (error) {
//             console.error(`Error parsing room data for key ${key}:`, error);
//             return null;
//           }
//         })
//       );
//       return rooms.filter(Boolean);
//     } catch (error) {
//       console.error('Error fetching game rooms from Redis:', error);
//       return [];
//     }
//   }




// // Update the getGameRoomById method to handle both roomId and _id
// async getGameRoomById(identifier: string) {
//   try {
//     console.log(`Looking for game room with identifier: ${identifier}`);
    
//     // First try to find by roomId
//     let room = await this.gameRoomModel.findOne({ roomId: identifier }).exec();
    
//     // If not found by roomId, try by _id (MongoDB ObjectId)
//     if (!room && Types.ObjectId.isValid(identifier)) {
//       room = await this.gameRoomModel.findById(identifier).exec();
//     }
    
//     if (!room) {
//       console.error(`Game room not found for identifier: ${identifier}`);
//       return null;
//     }
    
//     console.log(`Found room: ${room.name} (${room.roomId})`);
//     return room;
//   } catch (error) {
//     console.error('Error finding game room:', error);
//     return null;
//   }
// }

// // Update the getActiveGameRooms method to return roomId as id
// async getActiveGameRooms(): Promise<PublicGameRoom[]> {
//   const rooms = await this.gameRoomModel
//     .find({
//       status: { $in: ['waiting', 'in-progress'] },
//     })
//     .sort({ createdAt: -1 })
//     .lean()
//     .exec();

//   return rooms.map(room => ({
//     id: room.roomId, // ✅ Use roomId as id for frontend
//     roomId: room.roomId,
//     name: room.name,
//     gameType: room.gameType,
//     hostName: room.host,
//     hostAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(room.host)}`,
//     currentPlayers: room.currentPlayers,
//     maxPlayers: room.maxPlayers,
//     isPrivate: room.isPrivate,
//     isInviteOnly: room.isPrivate,
//     status: room.status,
//     host: room.host,
//     scores: Object.fromEntries((room.scores as any)?.entries?.() || []),
//     scheduledTimeCombined: room.scheduledTimeCombined ? new Date(room.scheduledTimeCombined).toISOString() : '',
//   }));
// }


  

//   private convertScoresToMap(scores: any): Map<string, number> {
//     if (scores instanceof Map) return scores;
//     const map = new Map<string, number>();
//     if (scores) {
//       Object.entries(scores).forEach(([key, value]) => {
//         map.set(key, value as number);
//       });
//     }
//     return map;
//   }
  
  
// }
