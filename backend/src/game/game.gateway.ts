
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { CreateGameDto, JoinGameDto, MoveCoinDto, RollDiceDto } from './dto/game.dto';

// @WebSocketGateway({ cors: { origin: 'https://alu-globe-gameroom.onrender.com', credentials: true } })
@WebSocketGateway({ 
  cors: { 
    origin: [
      'http://localhost:5173',
      'https://alu-globe-gameroom-frontend.vercel.app',
      'https://alu-globe-gameroom.onrender.com'
    ], 
    credentials: true 
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket']
})

export class GameGateway {
  @WebSocketServer() server: Server;
  private connectedSockets = new Map<string, Socket>();
  constructor(private readonly gameService: GameService) {}

  afterInit() {
    this.gameService.setServer(this.server);
  }

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    this.connectedSockets.set(client.id, client);
  }

 
  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Clean up all references
    this.connectedSockets.delete(client.id);
    await this.gameService.handleDisconnect(client);
    const rooms = await this.gameService.getActiveGameRooms();
    this.server.emit('gameRoomsList', { rooms });
  }

  @SubscribeMessage('createGame')
  async handleCreateGame(@MessageBody() payload: CreateGameDto, @ConnectedSocket() client: Socket) {
    try {
      console.log('Creating game:', payload);
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
      console.error('Create game error:', error.message);
      client.emit('error', { message: error.message || 'Failed to create game' });
    }
  }

  @SubscribeMessage('joinGame')
  async handleJoinGame(@MessageBody() data: JoinGameDto, @ConnectedSocket() client: Socket) {
    try {
      console.log('Joining game:', data);
      const result = await this.gameService.joinGame(data);
      client.join(data.roomId);
      client.emit('playerJoined', { roomId: data.roomId, playerId: data.playerId, playerName: data.playerName, success: true });
      if (result.isNewJoin) {
        client.to(data.roomId).emit('playerConnected', { playerId: data.playerId, playerName: data.playerName, roomId: data.roomId, currentPlayers: result.game.currentPlayers });
      }
      const gameState = await this.gameService.getGameState(data.roomId);
      this.server.to(data.roomId).emit('gameState', {
        ...gameState,
        gameType: result.game.gameType,
        roomName: result.game.name,
      });
      const rooms = await this.gameService.getActiveGameRooms();
      this.server.emit('gameRoomsList', { rooms });
    } catch (error) {
      console.error('Join game error:', error.message);
      client.emit('error', { message: error.message, type: 'joinError' });
    }
  }

  @SubscribeMessage('rollDice')
  async handleRollDice(@MessageBody() payload: RollDiceDto, @ConnectedSocket() client: Socket) {
    try {
      console.log('Rolling dice:', payload);
      const result = await this.gameService.rollDice(payload);
      this.server.to(payload.roomId).emit('diceRolled', result);
      const gameState = await this.gameService.getGameState(payload.roomId);
      this.server.to(payload.roomId).emit('gameState', gameState);
    } catch (error) {
      console.error('Roll dice error:', error.message);
      client.emit('error', { message: error.message, type: 'rollDiceError' });
    }
  }

  @SubscribeMessage('moveCoin')
  async handleMoveCoin(@MessageBody() payload: MoveCoinDto, @ConnectedSocket() client: Socket) {
    try {
      console.log('Moving coin:', payload);
      const result = await this.gameService.moveCoin(payload);
      this.server.to(payload.roomId).emit('coinMoved', result);
      const gameState = await this.gameService.getGameState(payload.roomId);
      this.server.to(payload.roomId).emit('gameState', gameState);
      if (result.gameOver) {
        this.server.to(payload.roomId).emit('gameOver', result);
      }
    } catch (error) {
      console.error('Move coin error:', error.message);
      client.emit('error', { message: error.message, type: 'moveCoinError' });
    }
  }

  @SubscribeMessage('startGame')
  async handleStartGame(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    try {
      console.log('Starting game:', data);
      const gameState = await this.gameService.startGame(data.roomId);
      this.server.to(data.roomId).emit('gameState', {
        ...gameState,
        gameStarted: true,
      });
      const rooms = await this.gameService.getActiveGameRooms();
      this.server.emit('gameRoomsList', { rooms });
    } catch (error) {
      console.error('Start game error:', error.message);
      client.emit('error', { message: error.message, type: 'startGameError' });
    }
  }

  @SubscribeMessage('getGameRooms')
  async handleGetGameRooms(@ConnectedSocket() client: Socket) {
    try {
      const rooms = await this.gameService.getActiveGameRooms();
      client.emit('gameRoomsList', { rooms });
    } catch (error) {
      console.error('Get game rooms error:', error.message);
      client.emit('error', { message: 'Failed to fetch game rooms' });
    }
  }

  @SubscribeMessage('getGameState')
  async handleGetGameState(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    try {
      console.log('Fetching game state for room:', data.roomId);
      const gameState = await this.gameService.getGameState(data.roomId);
      client.emit('gameState', gameState);
    } catch (error) {
      console.error('Get game state error:', error.message);
      client.emit('error', { message: 'Failed to fetch game state' });
    }
  }

  @SubscribeMessage('getMyGameRooms')
  async handleGetMyGameRooms(@MessageBody() data: { playerId: string }, @ConnectedSocket() client: Socket) {
    try {
      const { hosted, joined } = await this.gameService.getMyGameRooms(data.playerId);
      client.emit('myGameRoomsList', { hosted, joined });
    } catch (error) {
      console.error('Get my game rooms error:', error.message);
      client.emit('error', { message: error.message || 'Failed to fetch my game rooms' });
    }
  }

  @SubscribeMessage('makeChessMove')
  async handleChessMove(@MessageBody() data: { roomId: string; playerId: string; move: string }, @ConnectedSocket() client: Socket) {
    try {
      console.log('Chess move:', data);
      const result = await this.gameService.makeChessMove(data);
      this.server.to(data.roomId).emit('chessMove', result);
      const gameState = await this.gameService.getGameState(data.roomId);
      this.server.to(data.roomId).emit('gameState', gameState);
      if (gameState.gameOver) {
        this.server.to(data.roomId).emit('gameOver', { winner: gameState.winner });
      }
    } catch (error) {
      console.error('Chess move error:', error.message);
      client.emit('error', { message: error.message, type: 'chessMoveError' });
    }
  }

  @SubscribeMessage('submitKahootAnswer')
  async handleKahootAnswer(@MessageBody() data: { roomId: string; playerId: string; answerIndex: number }, @ConnectedSocket() client: Socket) {
    try {
      console.log('Kahoot answer:', data);
      const result = await this.gameService.submitKahootAnswer(data);
      this.server.to(data.roomId).emit('kahootAnswer', result);
      const gameState = await this.gameService.getGameState(data.roomId);
      this.server.to(data.roomId).emit('gameState', gameState);
      if (gameState.gameOver) {
        this.server.to(data.roomId).emit('gameOver', { winner: gameState.winner });
      }
    } catch (error) {
      console.error('Kahoot answer error:', error.message);
      client.emit('error', { message: error.message, type: 'kahootAnswerError' });
    }
  }

  // audio functionality
  @SubscribeMessage('joinAudio')
handleJoinAudio(
  @MessageBody() data: { roomId: string; userId: string },
  @ConnectedSocket() client: Socket
) {
  console.log(`User ${data.userId} joining audio room ${data.roomId}`);
  client.join(`audio_${data.roomId}`);
  client.join(`user_${data.userId}`); // Add user-specific room
  client.to(`audio_${data.roomId}`).emit('peerJoined', data.userId);
}

@SubscribeMessage('leaveAudio')
handleLeaveAudio(@MessageBody() data: { roomId: string, userId: string }, @ConnectedSocket() client: Socket) {
  console.log(`User ${data.userId} leaving audio room ${data.roomId}`);
  client.leave(`audio_${data.roomId}`);
  client.to(`audio_${data.roomId}`).emit('peerLeft', data.userId);
}

@SubscribeMessage('signal')
async handleSignal(
  @MessageBody() data: { 
    signal: any, 
    callerId: string, 
    roomId: string, 
    targetId: string,
    type: 'offer' | 'answer' | 'candidate'
  },
  @ConnectedSocket() client: Socket
) {
  console.log(`Signaling ${data.type} from ${data.callerId} to ${data.targetId}`);
  
  // Queue candidates if connection isn't ready
  if (data.type === 'candidate') {
    client.to(`user_${data.targetId}`).emit('queuedCandidate', {
      candidate: data.signal,
      senderId: data.callerId
    });
  } else {
    client.to(`user_${data.targetId}`).emit('signal', {
      type: data.type,
      signal: data.signal,
      senderId: data.callerId
    });
  }
}

@SubscribeMessage('returnSignal')
handleReturnSignal(
  @MessageBody() data: { signal: any; callerId: string; roomId: string },
  @ConnectedSocket() client: Socket
) {
  console.log(`Return signal from ${data.callerId} in room ${data.roomId}`);
  this.server.to(`user_${data.callerId}`).emit('returnedSignal', {
    signal: data.signal,
    id: data.callerId
  });
}


// Chat
@SubscribeMessage('chatMessage')
async handleChatMessage(
  @MessageBody() data: { roomId: string; playerId: string; message: string },
  @ConnectedSocket() client: Socket
) {
  try {
    console.log(`Chat message from ${data.playerId} in room ${data.roomId}: ${data.message}`);
    
    // Broadcast the message to all clients in the room
    this.server.to(data.roomId).emit('chatMessage', {
      playerId: data.playerId,
      message: data.message,
      timestamp: new Date().toISOString()
    });

    // Optionally: Store the message in Redis or database
    // await this.gameService.storeChatMessage(data.roomId, data.playerId, data.message);
    
  } catch (error) {
    console.error('Error handling chat message:', error);
    client.emit('chatError', { message: 'Failed to send chat message' });
  }
}


@SubscribeMessage('getChatHistory')
async handleGetChatHistory(
  @MessageBody() data: { roomId: string },
  @ConnectedSocket() client: Socket
) {
  try {
    const history = await this.gameService.getChatHistory(data.roomId);
    client.emit('chatHistory', history);
  } catch (error) {
    console.error('Error getting chat history:', error);
  }
}




// inside your gateway
@SubscribeMessage('webrtc-offer')
handleOffer(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
  client.to(data.roomId).emit('webrtc-offer', { sdp: data.sdp, from: client.id });
}

@SubscribeMessage('webrtc-answer')
handleAnswer(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
  client.to(data.roomId).emit('webrtc-answer', { sdp: data.sdp, from: client.id });
}

@SubscribeMessage('webrtc-candidate')
handleCandidate(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
  client.to(data.roomId).emit('webrtc-candidate', { candidate: data.candidate, from: client.id });
}


  
}






 // async handleDisconnect(client: Socket) {
  //   console.log(`Client disconnected: ${client.id}`);
  //   await this.gameService.handleDisconnect(client);
  //   const rooms = await this.gameService.getActiveGameRooms();
  //   this.server.emit('gameRoomsList', { rooms });
  // }

  // Add to your main gateway or service
// @Cron('*/5 * * * *') // Every 5 minutes
// logMemoryUsage() {
//   const used = process.memoryUsage();
//   this.logger.log(`Memory Usage: 
//     RSS: ${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB
//     Heap Used: ${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB
//     Heap Total: ${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB
//     Active Rooms: ${this.gameRooms.size}
//     Connected Sockets: ${this.connectedSockets.size}
//   `);
// }