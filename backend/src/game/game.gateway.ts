// Updated game.gateway.ts (integrated with original structure, using GameService; assume GameService is updated to handle triviaSettings and inject TriviaService)
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { CreateGameDto, JoinGameDto, MoveCoinDto, RollDiceDto } from './dto/game.dto';
import { UserService } from '../user/user.service';
import { ChessService } from 'src/chess/chess.service';
import { TriviaService } from './trivia/trivia.service'; // Add import

@WebSocketGateway({ 
  cors: { 
    origin: [
      'http://localhost:3000',
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
  constructor(
    private readonly gameService: GameService,
    private readonly userService: UserService,
    private readonly chessService: ChessService,
    private readonly triviaService: TriviaService, // Inject TriviaService
  ) {}

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
      const game = await this.gameService.createGame(payload); // GameService handles triviaSettings
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
      console.log('Joining game as player:', data);
      const result = await this.gameService.joinGame({ ...data, joinAsPlayer: true });
      client.join(data.roomId);
      client.emit('playerJoined', { 
        roomId: data.roomId, 
        playerId: data.playerId, 
        playerName: data.playerName, 
        success: true,
        role: 'player'
      });
      
      if (result.isNewJoin) {
        client.to(data.roomId).emit('playerConnected', { 
          playerId: data.playerId, 
          playerName: data.playerName, 
          roomId: data.roomId, 
          currentPlayers: result.game.currentPlayers 
        });
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

  // Add new spectator join handler
  @SubscribeMessage('joinAsSpectator')
  async handleJoinAsSpectator(@MessageBody() data: JoinGameDto, @ConnectedSocket() client: Socket) {
    try {
      console.log('Joining game as spectator:', data);
      const result = await this.gameService.joinAsSpectator(data);
      client.join(data.roomId);
      client.emit('spectatorJoined', { 
        roomId: data.roomId, 
        playerId: data.playerId, 
        playerName: data.playerName, 
        success: true,
        role: 'spectator'
      });
      
      // Notify other users about new spectator
      client.to(data.roomId).emit('spectatorConnected', { 
        playerId: data.playerId, 
        playerName: data.playerName, 
        roomId: data.roomId 
      });
      
      // Send current game state to spectator
      const gameState = await this.gameService.getGameState(data.roomId);
      client.emit('gameState', {
        ...gameState,
        gameType: result.game.gameType,
        roomName: result.game.name,
        isSpectator: true
      });
      
    } catch (error) {
      console.error('Join as spectator error:', error.message);
      client.emit('error', { message: error.message, type: 'joinError' });
    }
  }

  @SubscribeMessage('rollDice')
  async handleRollDice(@MessageBody() payload: RollDiceDto, @ConnectedSocket() client: Socket) {
    try {
      console.log('Rolling dice:', payload);
      const result = await this.gameService.rollDice(payload);
      
      // Emit dice result immediately
      this.server.to(payload.roomId).emit('diceRolled', result);
      
      // Get and emit updated game state
      const gameState = await this.gameService.getGameState(payload.roomId);
      this.server.to(payload.roomId).emit('gameState', gameState);
      
      console.log('Dice rolled result:', {
        roomId: payload.roomId,
        playerId: payload.playerId,
        diceValue: result.diceValue,
        noValidMove: result.noValidMove
      });
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
      
      // Emit coin move result
      this.server.to(payload.roomId).emit('coinMoved', result);
      
      // Get and emit updated game state
      const gameState = await this.gameService.getGameState(payload.roomId);
      this.server.to(payload.roomId).emit('gameState', gameState);
      
      // If game is over, emit game over event
      if (result.gameOver) {
        this.server.to(payload.roomId).emit('gameOver', {
          winner: result.winner,
          roomId: payload.roomId,
          finalState: gameState
        });
        console.log('Game over:', {
          roomId: payload.roomId,
          winner: result.winner
        });
      }
      
      console.log('Coin moved result:', {
        roomId: payload.roomId,
        playerId: payload.playerId,
        coinId: payload.coinId,
        currentTurn: result.currentTurn,
        gameOver: result.gameOver
      });
    } catch (error) {
      console.error('Move coin error:', error.message);
      client.emit('error', { message: error.message, type: 'moveCoinError' });
    }
  }

  @SubscribeMessage('startGame')
  async handleStartGame(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    try {
      console.log('Starting game:', data);
      const gameState = await this.gameService.startGame(data.roomId, this.triviaService); // Pass triviaService to GameService
      console.log('Game started, emitting state:', {
        roomId: data.roomId,
        gameType: gameState.gameType,
        currentTurn: gameState.currentTurn,
        gameStarted: gameState.gameStarted
      });
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
      console.log('Game state fetched:', {
        roomId: data.roomId,
        gameType: gameState.gameType,
        currentTurn: gameState.currentTurn,
        gameStarted: gameState.gameStarted,
        gameOver: gameState.gameOver
      });
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


  @SubscribeMessage('triviaAnswer')
  async handleTriviaAnswer(@MessageBody() data: { roomId: string; playerId: string; qId: string; answer: string | null; correct?: string; isCorrect?: boolean }, @ConnectedSocket() client: Socket) {
    try {
      console.log('Trivia answer:', data);
      const result = await this.gameService.submitTriviaAnswer(data);
      this.server.to(data.roomId).emit('triviaAnswer', result);
      const gameState = await this.gameService.getGameState(data.roomId);
      this.server.to(data.roomId).emit('gameState', gameState);
      if (gameState.gameOver) {
        this.server.to(data.roomId).emit('gameOver', { winner: gameState.winner });
      }
    } catch (error) {
      console.error('Trivia answer error:', error.message);
      client.emit('error', { message: error.message, type: 'triviaAnswerError' });
    }
  }

  @SubscribeMessage('triviaComplete')
  async handleTriviaComplete(@MessageBody() data: { roomId: string; playerId: string; score: number; total: number }, @ConnectedSocket() client: Socket) {
    try {
      console.log('Trivia complete:', data);
      const result = await this.gameService.completeTriviaGame(data);
      this.server.to(data.roomId).emit('triviaComplete', result);
      const gameState = await this.gameService.getGameState(data.roomId);
      this.server.to(data.roomId).emit('gameState', gameState);
      if (gameState.gameOver) {
        this.server.to(data.roomId).emit('gameOver', { winner: gameState.winner });
      }
    } catch (error) {
      console.error('Trivia complete error:', error.message);
      client.emit('error', { message: error.message, type: 'triviaCompleteError' });
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


@SubscribeMessage('webrtc-offer')
handleOffer(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
  try {
    console.log(`WebRTC offer from ${client.id} in room ${data.roomId}`);
    // Broadcast to all clients in the room except sender
    client.to(data.roomId).emit('webrtc-offer', { 
      sdp: data.sdp, 
      from: client.id,
      roomId: data.roomId
    });
  } catch (error) {
    console.error('Error handling WebRTC offer:', error);
    client.emit('webrtc-error', { message: 'Failed to process offer' });
  }
}

@SubscribeMessage('webrtc-answer')
handleAnswer(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
  try {
    console.log(`WebRTC answer from ${client.id} in room ${data.roomId}`);
    client.to(data.roomId).emit('webrtc-answer', { 
      sdp: data.sdp, 
      from: client.id,
      roomId: data.roomId
    });
  } catch (error) {
    console.error('Error handling WebRTC answer:', error);
    client.emit('webrtc-error', { message: 'Failed to process answer' });
  }
}

@SubscribeMessage('webrtc-candidate')
handleCandidate(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
  try {
    console.log(`WebRTC candidate from ${client.id} in room ${data.roomId}`);
    client.to(data.roomId).emit('webrtc-candidate', { 
      candidate: data.candidate, 
      from: client.id,
      roomId: data.roomId
    });
  } catch (error) {
    console.error('Error handling WebRTC candidate:', error);
    client.emit('webrtc-error', { message: 'Failed to process candidate' });
  }
}

// Add error handling for WebRTC
@SubscribeMessage('webrtc-error')
handleWebRTCError(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
  console.error(`WebRTC error from ${client.id}:`, data);
  // Notify other clients in the room about the error
  client.to(data.roomId).emit('webrtc-error', {
    from: client.id,
    message: data.message,
    roomId: data.roomId
  });
}

@SubscribeMessage('endGame')
async handleEndGame(@MessageBody() data: { roomId: string; hostId: string }, @ConnectedSocket() client: Socket) {
  try {
    console.log('Ending game:', data);
    await this.gameService.endGame(data.roomId, data.hostId);
    
    // Notify all players in the room
    this.server.to(data.roomId).emit('gameEnded', { 
      roomId: data.roomId,
      message: 'The host has ended the game'
    });
    
    // Update the game rooms list
    const rooms = await this.gameService.getActiveGameRooms();
    this.server.emit('gameRoomsList', { rooms });
  } catch (error) {
    console.error('End game error:', error.message);
    client.emit('error', { message: error.message, type: 'endGameError' });
  }
}

@SubscribeMessage('restartGame')
async handleRestartGame(@MessageBody() data: { roomId: string; hostId: string }, @ConnectedSocket() client: Socket) {
  try {
    console.log('Restarting game:', data);
    const gameState = await this.gameService.restartGame(data.roomId, data.hostId);
    
    // Notify all players in the room
    this.server.to(data.roomId).emit('gameRestarted', { 
      roomId: data.roomId,
      message: 'The host has started a new round'
    });
    
    // Send fresh game state
    this.server.to(data.roomId).emit('gameState', gameState);
  } catch (error) {
    console.error('Restart game error:', error.message);
    client.emit('error', { message: error.message, type: 'restartGameError' });
  }
}

@SubscribeMessage('getRoomInfo')
async handleGetRoomInfo(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
  try {
    const room = await this.gameService.getGameRoomById(data.roomId);
    if (!room) {
      client.emit('error', { message: 'Room not found', type: 'roomInfoError' });
      return;
    }

    // Get host username
    let hostName = room.host;
    try {
      const hostUser = await this.userService.findById(room.host);
      if (hostUser && hostUser.username) {
        hostName = hostUser.username;
      }
    } catch (error) {
      console.log(`Could not fetch host username for ${room.host}`);
    }

    const roomInfo = {
      id: room.roomId,
      roomId: room.roomId,
      name: room.name,
      host: room.host,
      hostName: hostName,
      gameType: room.gameType,
      maxPlayers: room.maxPlayers,
      currentPlayers: room.currentPlayers,
      isPrivate: room.isPrivate,
      status: room.status,
      playerIds: room.playerIds,
      spectatorIds: room.spectatorIds,
      createdAt: room.createdAt
    };

    console.log("Sending room info:", roomInfo);
    client.emit('roomInfo', roomInfo);
  } catch (error) {
    console.error('Get room info error:', error.message);
    client.emit('error', { message: error.message, type: 'roomInfoError' });
  }
}

}



