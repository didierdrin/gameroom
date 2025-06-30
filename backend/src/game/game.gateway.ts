import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { RedisService } from '../redis/redis.service';
import { CreateGameDto, JoinGameDto, MoveCoinDto, RollDiceDto } from './dto/game.dto';

@WebSocketGateway({ cors: true })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly redisService: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    await this.gameService.handleDisconnect(client);
  }

  @SubscribeMessage('createGame')
  async handleCreateGame(client: Socket, payload: CreateGameDto) {
    const game = await this.gameService.createGame(payload);
    client.join(game.roomId);
    this.server.to(game.roomId).emit('gameCreated', game);
  }

  @SubscribeMessage('joinGame')
  async handleJoinGame(client: Socket, payload: JoinGameDto) {
    const { game, player } = await this.gameService.joinGame(payload);
    client.join(game.roomId);
    this.server.to(game.roomId).emit('playerJoined', { game, player });
  }

  @SubscribeMessage('rollDice')
  async handleRollDice(client: Socket, payload: RollDiceDto) {
    const result = await this.gameService.rollDice(payload);
    this.server.to(payload.roomId).emit('diceRolled', result);
  }

  @SubscribeMessage('moveCoin')
  async handleMoveCoin(client: Socket, payload: MoveCoinDto) {
    const result = await this.gameService.moveCoin(payload);
    this.server.to(payload.roomId).emit('coinMoved', result);
    
    if (result.gameOver) {
      this.server.to(payload.roomId).emit('gameOver', result);
    }
  }

  @SubscribeMessage('startGame')
  async handleStartGame(client: Socket, payload: { roomId: string }) {
    const game = await this.gameService.startGame(payload.roomId);
    this.server.to(payload.roomId).emit('gameStarted', game);
  }
}

// // src/game/game.gateway.ts
// import {
//     WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect,
//   } from '@nestjs/websockets';
//   import { Server, Socket } from 'socket.io';
//   import { GameService } from './game.service';
  
//   @WebSocketGateway({ cors: true })
//   export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
//     @WebSocketServer()
//     server: Server;
  
//     constructor(private readonly gameService: GameService) {}
  
//     handleConnection(client: Socket) {
//       console.log(`Client connected: ${client.id}`);
//     }
  
//     handleDisconnect(client: Socket) {
//       console.log(`Client disconnected: ${client.id}`);
//       this.gameService.removePlayer(client.id);
//     }
  
//     @SubscribeMessage('join-room')
//     handleJoinRoom(client: Socket, data: { roomId: string; playerId: string }) {
//       client.join(data.roomId);
//       this.gameService.addPlayerToRoom(data.roomId, client.id, data.playerId);
//       this.server.to(data.roomId).emit('player-joined', { playerId: data.playerId });
//     }
  
//     @SubscribeMessage('move-coin')
//     handleMove(client: Socket, payload: { roomId: string; coinID: string; cellID: string }) {
//       this.gameService.moveCoin(payload.roomId, payload.coinID, payload.cellID);
//       this.server.to(payload.roomId).emit('coin-moved', payload);
//     }
  
//     @SubscribeMessage('update-score')
//     handleScoreUpdate(client: Socket, payload: { roomId: string; playerId: string; score: number }) {
//       this.gameService.updateScore(payload.roomId, payload.playerId, payload.score);
//       this.server.to(payload.roomId).emit('score-updated', payload);
//     }
//   }
  