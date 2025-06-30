// // src/game/game.service.ts

import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { GameRoom, GameRoomDocument } from './schemas/game-room.schema';
import { GameSession, GameSessionDocument } from './schemas/game-session.schema';
import { CreateGameDto, JoinGameDto, MoveCoinDto, RollDiceDto } from './dto/game.dto';
import { v4 as uuidv4 } from 'uuid';
import { Socket } from 'socket.io';

@Injectable()
export class GameService {
  constructor(
    private readonly redisService: RedisService,
    @InjectModel(GameRoom.name) private gameRoomModel: Model<GameRoomDocument>,
    @InjectModel(GameSession.name) private gameSessionModel: Model<GameSessionDocument>,
  ) {}

  async createGame(createGameDto: CreateGameDto) {
    const roomId = uuidv4();
    const gameRoom = new this.gameRoomModel({
      roomId,
      name: createGameDto.name,
      gameType: 'ludo',
      host: createGameDto.hostId,
      maxPlayers: 4,
      currentPlayers: 1,
      isPrivate: createGameDto.isPrivate,
      password: createGameDto.password,
      status: 'waiting',
    });

    await gameRoom.save();

    // Initialize game state in Redis
    await this.initializeGameState(roomId, createGameDto.hostId);

    return gameRoom;
  }

  private async initializeGameState(roomId: string, hostId: string) {
    const initialGameState = {
      players: [hostId],
      currentTurn: hostId,
      diceValue: 0,
      coins: this.initializeCoins([hostId]),
      gameStarted: false,
      winner: null,
    };

    await this.redisService.set(`game:${roomId}`, JSON.stringify(initialGameState));
  }

  private initializeCoins(playerIds: string[]) {
    const coins = {};
    const colors = ['red', 'blue', 'green', 'yellow'];
    
    playerIds.forEach((playerId, index) => {
      coins[playerId] = {};
      for (let i = 1; i <= 4; i++) {
        coins[playerId][`${colors[index]}-${i}`] = {
          position: 'base',
          steps: 0,
        };
      }
    });
    
    return coins;
  }

  async joinGame(joinGameDto: JoinGameDto) {
    const gameRoom = await this.gameRoomModel.findOne({ roomId: joinGameDto.roomId });
    
    if (!gameRoom) {
      throw new Error('Game room not found');
    }
    
    if (gameRoom.currentPlayers >= gameRoom.maxPlayers) {
      throw new Error('Game room is full');
    }
    
    if (gameRoom.isPrivate && gameRoom.password !== joinGameDto.password) {
      throw new Error('Invalid password');
    }
    
    // Update game room
    gameRoom.currentPlayers += 1;
    await gameRoom.save();
    
    // Update game state in Redis
    const gameState = await this.getGameState(joinGameDto.roomId);
    gameState.players.push(joinGameDto.playerId);
    gameState.coins = {
      ...gameState.coins,
      ...this.initializeCoins([joinGameDto.playerId]),
    };
    await this.updateGameState(joinGameDto.roomId, gameState);
    
    return { game: gameRoom, player: joinGameDto.playerId };
  }

  async rollDice(rollDiceDto: RollDiceDto) {
    const gameState = await this.getGameState(rollDiceDto.roomId);
    
    if (gameState.currentTurn !== rollDiceDto.playerId) {
      throw new Error('Not your turn');
    }
    
    if (gameState.diceValue !== 0) {
      throw new Error('Dice already rolled');
    }
    
    // Roll dice (1-6)
    const diceValue = Math.floor(Math.random() * 6) + 1;
    gameState.diceValue = diceValue;
    await this.updateGameState(rollDiceDto.roomId, gameState);
    
    return { roomId: rollDiceDto.roomId, diceValue, playerId: rollDiceDto.playerId };
  }

  async moveCoin(moveCoinDto: MoveCoinDto) {
    const gameState = await this.getGameState(moveCoinDto.roomId);
    
    if (gameState.currentTurn !== moveCoinDto.playerId) {
      throw new Error('Not your turn');
    }
    
    if (gameState.diceValue === 0) {
      throw new Error('You must roll the dice first');
    }
    
    const coin = gameState.coins[moveCoinDto.playerId][moveCoinDto.coinId];
    if (!coin) {
      throw new Error('Invalid coin');
    }
    
    // Implement Ludo movement logic
    const newPosition = this.calculateNewPosition(coin, gameState.diceValue);
    
    // Check if the new position is occupied by opponent's coin
    for (const playerId in gameState.coins) {
      if (playerId !== moveCoinDto.playerId) {
        for (const coinId in gameState.coins[playerId]) {
          const opponentCoin = gameState.coins[playerId][coinId];
          if (opponentCoin.position === newPosition.position) {
            // Send opponent's coin back to base
            opponentCoin.position = 'base';
            opponentCoin.steps = 0;
          }
        }
      }
    }
    
    // Update the moved coin
    coin.position = newPosition.position;
    coin.steps = newPosition.steps;
    
    // Check if player has won
    const hasWon = this.checkWinCondition(gameState.coins[moveCoinDto.playerId]);
    if (hasWon) {
      gameState.winner = moveCoinDto.playerId;
      gameState.gameOver = true;
      
      // Update MongoDB
      await this.gameRoomModel.updateOne(
        { roomId: moveCoinDto.roomId },
        { status: 'completed', winner: moveCoinDto.playerId }
      );
      
      // Save game session
      await this.saveGameSession(moveCoinDto.roomId, gameState);
    }
    
    // Reset dice value and move to next player if not 6
    if (gameState.diceValue !== 6) {
      gameState.diceValue = 0;
      gameState.currentTurn = this.getNextPlayer(gameState.players, moveCoinDto.playerId);
    }
    
    await this.updateGameState(moveCoinDto.roomId, gameState);
    
    return {
      roomId: moveCoinDto.roomId,
      coins: gameState.coins,
      currentTurn: gameState.currentTurn,
      diceValue: gameState.diceValue,
      gameOver: gameState.gameOver,
      winner: gameState.winner,
    };
  }

  private calculateNewPosition(coin: any, diceValue: number) {
    // Simplified Ludo movement logic
    const maxSteps = 57; // Total steps to reach home
    
    if (coin.position === 'base') {
      if (diceValue === 6) {
        return { position: 'start', steps: 0 };
      }
      return coin; // Can't move from base unless dice is 6
    }
    
    const newSteps = coin.steps + diceValue;
    
    if (newSteps > maxSteps) {
      return coin; // Can't move beyond home
    }
    
    if (newSteps === maxSteps) {
      return { position: 'home', steps: newSteps };
    }
    
    return { position: 'path', steps: newSteps };
  }

  private checkWinCondition(playerCoins: any) {
    // Player wins if all 4 coins reach home
    return Object.values(playerCoins).every((coin: any) => coin.position === 'home');
  }

  private getNextPlayer(players: string[], currentPlayerId: string) {
    const currentIndex = players.indexOf(currentPlayerId);
    const nextIndex = (currentIndex + 1) % players.length;
    return players[nextIndex];
  }

  async startGame(roomId: string) {
    const gameState = await this.getGameState(roomId);
    
    if (gameState.gameStarted) {
      throw new Error('Game already started');
    }
    
    // If not enough players, add AI players
    if (gameState.players.length < 4) {
      const aiPlayersNeeded = 4 - gameState.players.length;
      for (let i = 0; i < aiPlayersNeeded; i++) {
        const aiPlayerId = `ai-${i+1}`;
        gameState.players.push(aiPlayerId);
        gameState.coins = {
          ...gameState.coins,
          ...this.initializeCoins([aiPlayerId]),
        };
      }
    }
    
    gameState.gameStarted = true;
    await this.updateGameState(roomId, gameState);
    
    // Update MongoDB
    const gameRoom = await this.gameRoomModel.findOneAndUpdate(
      { roomId },
      { status: 'in-progress', currentPlayers: 4 },
      { new: true }
    );
    
    return gameRoom;
  }

  async handleDisconnect(client: Socket) {
    // Handle player disconnection
    // Could implement reconnection logic or AI takeover
  }

  private async getGameState(roomId: string) {
    const gameState = await this.redisService.get(`game:${roomId}`);
    return JSON.parse(gameState);
  }

  private async updateGameState(roomId: string, gameState: any) {
    await this.redisService.set(`game:${roomId}`, JSON.stringify(gameState));
  }

  private async saveGameSession(roomId: string, gameState: any) {
    const gameSession = new this.gameSessionModel({
      roomId,
      players: gameState.players,
      winner: gameState.winner,
      moves: [], // Could track all moves if needed
      createdAt: new Date(),
    });
    
    await gameSession.save();
  }
}

// import { Injectable } from '@nestjs/common';
// import { RedisService } from 'nestjs-redis';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { GameRoom, GameRoomDocument } from './schemas/game-room.schema';

// @Injectable()
// export class GameService {
//   constructor(
//     @InjectModel(GameRoom.name) private roomModel: Model<GameRoomDocument>,
//     private readonly redisService: RedisService,
//   ) {}

//   async addPlayerToRoom(roomId: string, socketId: string, playerId: string) {
//     const redis = this.redisService.getClient();
//     await redis.hset(`room:${roomId}:players`, socketId, playerId);
//   }

//   async removePlayer(socketId: string) {
//     const redis = this.redisService.getClient();
//     // Loop over rooms to remove player (or track player-room mapping)
//   }

//   async moveCoin(roomId: string, coinID: string, cellID: string) {
//     const redis = this.redisService.getClient();
//     await redis.hset(`room:${roomId}:coin:${coinID}`, 'cellID', cellID);
//   }

//   async updateScore(roomId: string, playerId: string, score: number) {
//     await this.roomModel.updateOne({ roomId }, {
//       $set: { [`scores.${playerId}`]: score },
//     }, { upsert: true });
//   }
// }

