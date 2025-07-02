import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket } from '@nestjs/websockets';
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

  // @SubscribeMessage('startGame')
  // async handleStartGame(client: Socket, payload: { roomId: string }) {
  //   const game = await this.gameService.startGame(payload.roomId);
  //   this.server.to(payload.roomId).emit('gameStarted', game);
  // }
  @SubscribeMessage('startGame')
async handleStartGame(@MessageBody() data: { roomId: string }) {
  const room = await this.gameService.startGame(data.roomId);
  const gameState = await this.gameService['getGameState'](data.roomId); // Call internal game state fetch
  this.server.to(data.roomId).emit('gameState', gameState);
}

// @SubscribeMessage('getGameRooms')
// handleGetGameRooms(@ConnectedSocket() client: Socket) {
//   const gameRooms = this.gameService.getAllGameRooms(); // Get live rooms from memory/Redis
//   client.emit('gameRoomsList', gameRooms);
// }

@SubscribeMessage('getGameRooms')
async handleGetGameRooms(@ConnectedSocket() client: Socket) {
  const gameRooms = await this.gameService.getAllGameRooms(); 
  client.emit('gameRoomsList', { rooms: gameRooms }); 
}




}

