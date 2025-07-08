
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { CreateGameDto, JoinGameDto, MoveCoinDto, RollDiceDto } from './dto/game.dto';

@WebSocketGateway({ cors: { origin: 'https://alu-globe-gameroom.onrender.com', credentials: true } })
export class GameGateway {
  @WebSocketServer() server: Server;

  constructor(private readonly gameService: GameService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    await this.gameService.handleDisconnect(client);
  }

  @SubscribeMessage('createGame')
  async handleCreateGame(@MessageBody() payload: CreateGameDto, @ConnectedSocket() client: Socket) {
    try {
      const game = await this.gameService.createGame(payload);
      client.join(game.roomId);
      const response = {
        ...game.toObject(),
        roomId: game.roomId,
        scheduledTimeCombined: game.scheduledTimeCombined ? game.scheduledTimeCombined.toISOString() : null,
      };
      this.server.to(game.roomId).emit('gameCreated', response);
      client.emit('gameCreated', response);
      const rooms = await this.gameService.getActiveGameRooms();
      this.server.emit('gameRoomsList', { rooms });
    } catch (error) {
      client.emit('error', { message: error.message || 'Failed to create game' });
    }
  }

  @SubscribeMessage('joinGame')
  async handleJoinGame(@MessageBody() data: JoinGameDto, @ConnectedSocket() client: Socket) {
    try {
      const result = await this.gameService.joinGame(data);
      client.join(data.roomId);
      client.emit('playerJoined', { roomId: data.roomId, playerId: data.playerId, playerName: data.playerName, success: true });
      client.to(data.roomId).emit('playerConnected', { playerId: data.playerId, playerName: data.playerName, roomId: data.roomId, currentPlayers: result.game.currentPlayers });
      const gameState = await this.gameService.getGameState(data.roomId);
      this.server.to(data.roomId).emit('gameState', {
        ...gameState,
        gameType: result.game.gameType,
        roomName: result.game.name,
      });
    } catch (error) {
      client.emit('error', { message: error.message, type: 'joinError' });
    }
  }

  @SubscribeMessage('rollDice')
  async handleRollDice(@MessageBody() payload: RollDiceDto, @ConnectedSocket() client: Socket) {
    try {
      const result = await this.gameService.rollDice(payload);
      this.server.to(payload.roomId).emit('diceRolled', result);
      const gameState = await this.gameService.getGameState(payload.roomId);
      this.server.to(payload.roomId).emit('gameState', gameState);
    } catch (error) {
      client.emit('error', { message: error.message, type: 'rollDiceError' });
    }
  }

  @SubscribeMessage('moveCoin')
  async handleMoveCoin(@MessageBody() payload: MoveCoinDto, @ConnectedSocket() client: Socket) {
    try {
      const result = await this.gameService.moveCoin(payload);
      this.server.to(payload.roomId).emit('coinMoved', result);
      const gameState = await this.gameService.getGameState(payload.roomId);
      this.server.to(payload.roomId).emit('gameState', gameState);
      if (result.gameOver) {
        this.server.to(payload.roomId).emit('gameOver', result);
      }
    } catch (error) {
      client.emit('error', { message: error.message, type: 'moveCoinError' });
    }
  }

  @SubscribeMessage('startGame')
  async handleStartGame(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    try {
      const gameState = await this.gameService.startGame(data.roomId);
      this.server.to(data.roomId).emit('gameState', {
        ...gameState,
        gameStarted: true,
      });
    } catch (error) {
      client.emit('error', { message: error.message, type: 'startGameError' });
    }
  }

  @SubscribeMessage('getGameRooms')
  async handleGetGameRooms(@ConnectedSocket() client: Socket) {
    try {
      const rooms = await this.gameService.getActiveGameRooms();
      client.emit('gameRoomsList', { rooms });
    } catch (error) {
      client.emit('error', { message: 'Failed to fetch game rooms' });
    }
  }

  @SubscribeMessage('getGameState')
  async handleGetGameState(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    try {
      const gameState = await this.gameService.getGameState(data.roomId);
      client.emit('gameState', gameState);
    } catch (error) {
      client.emit('error', { message: 'Failed to fetch game state' });
    }
  }

  @SubscribeMessage('getMyGameRooms')
  async handleGetMyGameRooms(@MessageBody() data: { playerId: string }, @ConnectedSocket() client: Socket) {
    try {
      const { hosted, joined } = await this.gameService.getMyGameRooms(data.playerId);
      client.emit('myGameRoomsList', { hosted, joined });
    } catch (error) {
      client.emit('error', { message: error.message || 'Failed to fetch my game rooms' });
    }
  }
  
}



// import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket } from '@nestjs/websockets';
// import { Server, Socket } from 'socket.io';
// import { GameService } from './game.service';
// import { RedisService } from '../redis/redis.service';
// import { CreateGameDto, JoinGameDto, MoveCoinDto, RollDiceDto } from './dto/game.dto';
// import { GameRoom } from './schemas/game-room.schema';

// @WebSocketGateway({ cors: true })
// export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
//   @WebSocketServer() server: Server;

//   constructor(
//     private readonly gameService: GameService,
//     private readonly redisService: RedisService,
//   ) {}

//   async handleConnection(client: Socket) {
//     console.log(`Client connected: ${client.id}`);
//   }

//   async handleDisconnect(client: Socket) {
//     console.log(`Client disconnected: ${client.id}`);
//     await this.gameService.handleDisconnect(client);
//   }

//   @SubscribeMessage('createGame')
//   async handleCreateGame(client: Socket, payload: CreateGameDto) {
//     try {
//       const game = await this.gameService.createGame(payload);
//       client.join(game.roomId);
      
//       // Format the response to include scheduledTimeCombined
//       const response = {
//         ...game.toObject(),
//         roomId: game.roomId,
//         scheduledTimeCombined: game.scheduledTimeCombined 
//           ? game.scheduledTimeCombined.toISOString() 
//           : null,
//       };
      
//       // Emit to the room
//       this.server.to(game.roomId).emit('gameCreated', response);
      
//       // Also emit to the client who created the game
//       client.emit('gameCreated', response);
      
//       // Refresh the game rooms list for all clients
//       const rooms = await this.gameService.getActiveGameRooms();
//       this.server.emit('gameRoomsList', { rooms });
      
//     } catch (error) {
//       console.error('Error creating game:', error);
//       client.emit('error', { message: error.message || 'Failed to create game' });
//     }
//   }

//   @SubscribeMessage('joinGame')
// async handleJoinGame(
//   @MessageBody() data: { roomId: string; playerId: string; playerName: string; password?: string },
//   @ConnectedSocket() client: Socket,
// ) {
//   try {
//     const { roomId, playerId, playerName, password } = data;
    
//     // Validate input
//     if (!roomId || !playerId) {
//       throw new Error('Room ID and Player ID are required');
//     }

//     const room = await this.gameService.getGameRoomById(roomId);
//     if (!room) {
//       throw new Error('Room not found');
//     }

//     // Add player to room if not already present
//     if (!room.playerIds.includes(playerId)) {
//       room.playerIds.push(playerId);
//       room.currentPlayers = room.playerIds.length;
//       await room.save();
//     }

//     client.join(roomId);
    
//     client.emit('playerJoined', { 
//       roomId, 
//       playerId,
//       playerName, 
//       success: true
//     });
    
//     // Notify other players
//     client.to(roomId).emit('playerConnected', { 
//       playerId,
//       playerName,
//       roomId,
//       currentPlayers: room.currentPlayers
//     });

//     // Send initial game state
//     const gameState = await this.gameService.getGameState(roomId);
//     client.emit('gameState', {
//       ...gameState,
//       gameType: room.gameType,
//       roomName: room.name,
//     });
    
//   } catch (error) {
//     client.emit('error', { 
//       message: error.message,
//       type: 'joinError'
//     });
//   }
// }

//   @SubscribeMessage('rollDice')
//   async handleRollDice(client: Socket, payload: RollDiceDto) {
//     const result = await this.gameService.rollDice(payload);
//     this.server.to(payload.roomId).emit('diceRolled', result);
//   }

//   @SubscribeMessage('moveCoin')
//   async handleMoveCoin(client: Socket, payload: MoveCoinDto) {
//     const result = await this.gameService.moveCoin(payload);
//     this.server.to(payload.roomId).emit('coinMoved', result);
    
//     if (result.gameOver) {
//       this.server.to(payload.roomId).emit('gameOver', result);
//     }
//   }


//   @SubscribeMessage('startGame')
// async handleStartGame(
//   @MessageBody() data: { roomId: string },
//   @ConnectedSocket() client: Socket,
// ) {
//   try {
//     const room = await this.gameService.startGame(data.roomId);
//     const gameState = await this.gameService.getGameState(data.roomId);
    
//     // Emit the full game state to all players in the room
//     this.server.to(data.roomId).emit('gameState', {
//       ...gameState,
//       gameType: room!.gameType,
//       roomName: room!.name,
//       roomId: room!.roomId,
//       gameStarted: true, // Ensure this is set
//     });
    
//     console.log(`Game started in room ${data.roomId}`);
//   } catch (error) {
//     console.error('Error starting game:', error);
//     client.emit('error', { 
//       message: error.message,
//       type: 'startGameError'
//     });
//   }
// }

//   @SubscribeMessage('getGameRooms')
//   async handleGetGameRooms(@ConnectedSocket() client: Socket) {
//     try {
//       const rooms = await this.gameService.getActiveGameRooms();
//       const formattedRooms = rooms.map(room => ({
//         ...room,
//         startTime: room.scheduledTimeCombined
//       }));
      
//       client.emit('gameRoomsList', { rooms: formattedRooms });
//     } catch (error) {
//       console.error('Error fetching game rooms:', error);
//       client.emit('error', { message: 'Failed to fetch game rooms' });
//     }
//   }

//   @SubscribeMessage('getMyGameRooms')
//   async handleGetMyGameRooms(@MessageBody() data: { playerId: string }, @ConnectedSocket() client: Socket) {
//     const { playerId } = data;

//     const allRooms = await this.gameService.getAllGameRooms();
//     const hosted = allRooms.filter(r => r.host === playerId);
//     const joined = allRooms.filter(r => r.playerIds?.includes(playerId));

//     client.emit('myGameRoomsList', { hosted, joined });
//   }
// }


