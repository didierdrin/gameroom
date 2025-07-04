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
  
  // @SubscribeMessage('createGame')
  // async handleCreateGame(client: Socket, payload: CreateGameDto) {
  //   const game = await this.gameService.createGame(payload);
  //   client.join(game.roomId);
  //   const response = {
  //     ...game.toObject(),
  //     roomId: game.roomId,
  //     startTime: game.scheduledTimeCombined // or whatever field stores the scheduled time
  //   };
  //   this.server.to(game.roomId).emit('gameCreated', game);
  // }

  // Updated createGame handler in game.gateway.ts

@SubscribeMessage('createGame')
async handleCreateGame(client: Socket, payload: CreateGameDto) {
  try {
    const game = await this.gameService.createGame(payload);
    client.join(game.roomId);
    
    // Format the response to include scheduledTimeCombined
    const response = {
      ...game.toObject(),
      roomId: game.roomId,
      scheduledTimeCombined: game.scheduledTimeCombined 
        ? game.scheduledTimeCombined.toISOString() 
        : null,
    };
    
    // Emit to the room
    this.server.to(game.roomId).emit('gameCreated', response);
    
    // Also emit to the client who created the game
    client.emit('gameCreated', response);
    
    // Refresh the game rooms list for all clients
    const rooms = await this.gameService.getActiveGameRooms();
    this.server.emit('gameRoomsList', { rooms });
    
  } catch (error) {
    console.error('Error creating game:', error);
    client.emit('error', { message: error.message || 'Failed to create game' });
  }
}

  // @SubscribeMessage('joinGame')
  // async handleJoinGame(client: Socket, payload: JoinGameDto) {
  //   const { game, player } = await this.gameService.joinGame(payload);
  //   client.join(game.roomId);
  //   this.server.to(game.roomId).emit('playerJoined', { game, player });
  // }

  @SubscribeMessage('joinGame')
async handleJoinGame(
  @MessageBody() data: { roomId: string; playerId: string; password?: string },
  @ConnectedSocket() client: Socket,
) {
  const { roomId, playerId, password } = data;

  const room = await this.gameService.getGameRoomById(roomId);
  if (!room) {
    client.emit('error', 'Room not found');
    return;
  }

  if (room.isPrivate && room.password !== password) {
    client.emit('error', 'Incorrect password');
    return;
  }

  // Add playerId to currentPlayers array if not already present
  if (!room.playerIds) {
    room.playerIds = [];
  }

  if (!room.playerIds.includes(playerId)) {
    room.playerIds.push(playerId);
    room.currentPlayers = room.playerIds.length;
    await room.save();
  }

  client.join(roomId);
  client.emit('playerJoined', { roomId });
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
async handleStartGame(@MessageBody() data: { roomId: string }) {
  const room = await this.gameService.startGame(data.roomId);
  const gameState = await this.gameService['getGameState'](data.roomId); // Call internal game state fetch
  this.server.to(data.roomId).emit('gameState', gameState);
}



@SubscribeMessage('getGameRooms')
async handleGetGameRooms(@ConnectedSocket() client: Socket) {
  try {
    const rooms = await this.gameService.getActiveGameRooms();
    // client.emit('gameRoomsList', { rooms });
    const formattedRooms = rooms.map(room => ({
      ...room,
      startTime: room.scheduledTimeCombined // or whatever field stores the scheduled time
    }));
    
    client.emit('gameRoomsList', { rooms: formattedRooms });
  } catch (error) {
    console.error('Error fetching game rooms:', error);
    client.emit('error', { message: 'Failed to fetch game rooms' });
  }
}

@SubscribeMessage('getMyGameRooms')
async handleGetMyGameRooms(@MessageBody() data: { playerId: string }, @ConnectedSocket() client: Socket) {
  const { playerId } = data;

  const allRooms = await this.gameService.getAllGameRooms(); // or filter by status
  const hosted = allRooms.filter(r => r.hostId === playerId);
  const joined = allRooms.filter(r => r.currentPlayers?.some(p => p.playerId === playerId));

  client.emit('myGameRoomsList', { hosted, joined });
}




}

