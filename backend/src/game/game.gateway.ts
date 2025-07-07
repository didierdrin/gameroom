
// ========================================
// FIXED game.gateway.ts
// ========================================

import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { RedisService } from '../redis/redis.service';
import { CreateGameDto, JoinGameDto, MoveCoinDto, RollDiceDto } from './dto/game.dto';
import { GameRoom } from './schemas/game-room.schema';

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

  // FIXED: Join game handler with better error handling and logging
  @SubscribeMessage('joinGame')
  async handleJoinGame(
    @MessageBody() data: { roomId: string; playerId: string; password?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log('Join game request received:', data);
      
      const { roomId, playerId, password } = data;
      
      // Validate input
      if (!roomId || !playerId) {
        throw new Error('Room ID and Player ID are required');
      }

      // Get the game room
      const room = await this.gameService.getGameRoomById(roomId);
      if (!room) {
        console.error(`Room not found: ${roomId}`);
        throw new Error('Room not found');
      }

      console.log(`Found room: ${room.name}, current players: ${room.currentPlayers}/${room.maxPlayers}`);

      // Check if room is full
      if (room.currentPlayers >= room.maxPlayers) {
        throw new Error('Room is full');
      }

      // Check password for private rooms
      if (room.isPrivate && room.password !== password) {
        throw new Error('Incorrect password');
      }

      // Initialize playerIds array if it doesn't exist
      if (!room.playerIds) {
        room.playerIds = [];
      }

      // Add player to room if not already present
      if (!room.playerIds.includes(playerId)) {
        room.playerIds.push(playerId);
        room.currentPlayers = room.playerIds.length;
        await room.save();
        console.log(`Player ${playerId} added to room ${roomId}. Current players: ${room.currentPlayers}`);
      } else {
        console.log(`Player ${playerId} already in room ${roomId}`);
      }

      // Join the socket room
      client.join(roomId);
      
      // Emit success response
      client.emit('playerJoined', { 
        roomId, 
        playerId,
        success: true,
        message: 'Successfully joined the room'
      });
      
      // Notify other players in the room
      client.to(roomId).emit('playerConnected', { 
        playerId,
        roomId,
        currentPlayers: room.currentPlayers
      });

      // Refresh the game rooms list for all clients
      const rooms = await this.gameService.getActiveGameRooms();
      this.server.emit('gameRoomsList', { rooms });
      
      console.log(`Player ${playerId} successfully joined room ${roomId}`);
      
    } catch (error) {
      console.error('Join game error:', error);
      client.emit('error', { 
        message: error.message,
        roomId: data.roomId,
        type: 'joinError'
      });
    }
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
    const gameState = await this.gameService['getGameState'](data.roomId);
    this.server.to(data.roomId).emit('gameState', {
      ...gameState,
      gameType: room!.gameType,
    });
  }

  @SubscribeMessage('getGameRooms')
  async handleGetGameRooms(@ConnectedSocket() client: Socket) {
    try {
      const rooms = await this.gameService.getActiveGameRooms();
      const formattedRooms = rooms.map(room => ({
        ...room,
        startTime: room.scheduledTimeCombined
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

    const allRooms = await this.gameService.getAllGameRooms();
    const hosted = allRooms.filter(r => r.host === playerId);
    const joined = allRooms.filter(r => r.playerIds?.includes(playerId));

    client.emit('myGameRoomsList', { hosted, joined });
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
  
//   // @SubscribeMessage('createGame')
//   // async handleCreateGame(client: Socket, payload: CreateGameDto) {
//   //   const game = await this.gameService.createGame(payload);
//   //   client.join(game.roomId);
//   //   const response = {
//   //     ...game.toObject(),
//   //     roomId: game.roomId,
//   //     startTime: game.scheduledTimeCombined // or whatever field stores the scheduled time
//   //   };
//   //   this.server.to(game.roomId).emit('gameCreated', game);
//   // }

//   // Updated createGame handler in game.gateway.ts

// @SubscribeMessage('createGame')
// async handleCreateGame(client: Socket, payload: CreateGameDto) {
//   try {
//     const game = await this.gameService.createGame(payload);
//     client.join(game.roomId);
    
//     // Format the response to include scheduledTimeCombined
//     const response = {
//       ...game.toObject(),
//       roomId: game.roomId,
//       scheduledTimeCombined: game.scheduledTimeCombined 
//         ? game.scheduledTimeCombined.toISOString() 
//         : null,
//     };
    
//     // Emit to the room
//     this.server.to(game.roomId).emit('gameCreated', response);
    
//     // Also emit to the client who created the game
//     client.emit('gameCreated', response);
    
//     // Refresh the game rooms list for all clients
//     const rooms = await this.gameService.getActiveGameRooms();
//     this.server.emit('gameRoomsList', { rooms });
    
//   } catch (error) {
//     console.error('Error creating game:', error);
//     client.emit('error', { message: error.message || 'Failed to create game' });
//   }
// }

//   // @SubscribeMessage('joinGame')
//   // async handleJoinGame(client: Socket, payload: JoinGameDto) {
//   //   const { game, player } = await this.gameService.joinGame(payload);
//   //   client.join(game.roomId);
//   //   this.server.to(game.roomId).emit('playerJoined', { game, player });
//   // }

//   @SubscribeMessage('joinGame')
//   async handleJoinGame(
//     @MessageBody() data: { roomId: string; playerId: string; password?: string },
//     @ConnectedSocket() client: Socket,
//   ) {
//     try {
//       const { roomId, playerId, password } = data;
  
//       const room = await this.gameService.getGameRoomById(roomId);
//       if (!room) {
//         throw new Error('Room not found');
//       }
  
//       if (room.isPrivate && room.password !== password) {
//         throw new Error('Incorrect password');
//       }
  
//       if (!room.playerIds) {
//         room.playerIds = [];
//       }
  
//       if (!room.playerIds.includes(playerId)) {
//         room.playerIds.push(playerId);
//         room.currentPlayers = room.playerIds.length;
//         await room.save();
//       }
  
//       client.join(roomId);
//       client.emit('playerJoined', { roomId, playerId });
      
//       // Update other clients in the room
//       client.to(roomId).emit('playerConnected', { playerId });
      
//     } catch (error) {
//       client.emit('error', { 
//         message: error.message,
//         roomId: data.roomId,
//         type: 'joinError'
//       });
//       console.error('Join error:', error);
//     }
//   }


// //   @SubscribeMessage('joinGame')
// // async handleJoinGame(
// //   @MessageBody() data: { roomId: string; playerId: string; password?: string },
// //   @ConnectedSocket() client: Socket,
// // ) {
// //   const { roomId, playerId, password } = data;

// //   const room = await this.gameService.getGameRoomById(roomId);
// //   if (!room) {
// //     client.emit('error', 'Room not found');
// //     return;
// //   }

// //   if (room.isPrivate && room.password !== password) {
// //     client.emit('error', 'Incorrect password');
// //     return;
// //   }

// //   // Add playerId to currentPlayers array if not already present
// //   if (!room.playerIds) {
// //     room.playerIds = [];
// //   }

// //   if (!room.playerIds.includes(playerId)) {
// //     room.playerIds.push(playerId);
// //     room.currentPlayers = room.playerIds.length;
// //     await room.save();
// //   }

// //   client.join(roomId);
// //   client.emit('playerJoined', { roomId, playerId });
// // }


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
// async handleStartGame(@MessageBody() data: { roomId: string }) {
//   const room = await this.gameService.startGame(data.roomId);
//   const gameState = await this.gameService['getGameState'](data.roomId); // Call internal game state fetch
//   // this.server.to(data.roomId).emit('gameState', gameState);
//   this.server.to(data.roomId).emit('gameState', {
//     ...gameState,
//     gameType: room!.gameType, // ✅ this must be included
//   });
  
// }



// @SubscribeMessage('getGameRooms')
// async handleGetGameRooms(@ConnectedSocket() client: Socket) {
//   try {
//     const rooms = await this.gameService.getActiveGameRooms();
//     // client.emit('gameRoomsList', { rooms });
//     const formattedRooms = rooms.map(room => ({
//       ...room,
//       startTime: room.scheduledTimeCombined // or whatever field stores the scheduled time
//     }));
    
//     client.emit('gameRoomsList', { rooms: formattedRooms });
//   } catch (error) {
//     console.error('Error fetching game rooms:', error);
//     client.emit('error', { message: 'Failed to fetch game rooms' });
//   }
// }

// @SubscribeMessage('getMyGameRooms')
// async handleGetMyGameRooms(@MessageBody() data: { playerId: string }, @ConnectedSocket() client: Socket) {
//   const { playerId } = data;

//   const allRooms = await this.gameService.getAllGameRooms(); // or filter by status
//   const hosted = allRooms.filter(r => r.hostId === playerId);
//   const joined = allRooms.filter(r => r.currentPlayers?.some(p => p.playerId === playerId));

//   client.emit('myGameRoomsList', { hosted, joined });
// }




// }

