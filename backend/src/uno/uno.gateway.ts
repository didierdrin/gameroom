import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UnoService, UnoState } from './uno.service';

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
export class UnoGateway {
  @WebSocketServer() server: Server;

  constructor(private readonly unoService: UnoService) { }


  @SubscribeMessage('unoJoinGame')
  async handleJoinGame(@MessageBody() data: { roomId: string; playerId: string; playerName: string }, @ConnectedSocket() client: Socket) {
    try {
      console.log('UNO Join Game Request:', {
        roomId: data.roomId,
        playerId: data.playerId,
        playerName: data.playerName,
        clientId: client.id,
        timestamp: new Date().toISOString()
      });

      const gameState = await this.unoService.addPlayer(data.roomId, data.playerId, data.playerName);

      // Check if player was actually added (not duplicate)
      const playerExists = gameState.players.find(p => p.id === data.playerId);
      if (playerExists) {
        console.log(`Player ${data.playerId} added to UNO game in room ${data.roomId}`);
      } else {
        console.log(`Player ${data.playerId} already exists in UNO game`);
      }

      client.join(data.roomId);
      this.server.to(data.roomId).emit('unoGameState', gameState);
    } catch (error) {
      console.error('UNO Join Game Error:', error);
      client.emit('unoError', { message: error.message });
    }
  }

  // In uno.gateway.ts - Add this method for state validation
  private async validateAndFixGameState(roomId: string): Promise<UnoState> {
    try {
      let gameState = await this.unoService.getGameState(roomId);

      // Validate critical arrays exist
      if (!gameState.players || !Array.isArray(gameState.players)) {
        console.warn('Players array invalid, resetting');
        gameState.players = [];
      }

      if (!gameState.deck || !Array.isArray(gameState.deck)) {
        console.warn('Deck invalid, recreating');
        gameState.deck = this.unoService['createDeck'](); // Access private method
      }

      if (!gameState.discardPile || !Array.isArray(gameState.discardPile)) {
        console.warn('Discard pile invalid, resetting');
        gameState.discardPile = [];
      }

      await this.unoService.updateGameState(roomId, gameState);
      return gameState;
    } catch (error) {
      console.error('State validation failed:', error);
      return this.unoService.recoverGameState(roomId);
    }
  }

  // Update the startGame handler to use validation
  @SubscribeMessage('unoStartGame')
  async handleStartGame(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    try {
      console.log('Starting UNO game for room:', data.roomId);

      // First, validate and fix the game state
      await this.validateAndFixGameState(data.roomId);

      // Then start the game
      const gameState = await this.unoService.startGame(data.roomId);
      this.server.to(data.roomId).emit('unoGameState', gameState);
    } catch (error) {
      console.error('Error starting UNO game:', error);
      client.emit('unoError', { message: error.message });

      // Try to send the current state even if start failed
      try {
        const currentState = await this.unoService.getGameState(data.roomId);
        client.emit('unoGameState', currentState);
      } catch (recoveryError) {
        console.error('Could not recover game state:', recoveryError);
      }
    }
  }

  @SubscribeMessage('unoPlayCard')
  async handlePlayCard(@MessageBody() data: { roomId: string; playerId: string; cardId: string; chosenColor?: string }, @ConnectedSocket() client: Socket) {
    try {
      const gameState = await this.unoService.playCard(data.roomId, data.playerId, data.cardId, data.chosenColor);
      this.server.to(data.roomId).emit('unoGameState', gameState);

      if (gameState.gameOver) {
        this.server.to(data.roomId).emit('unoGameOver', { winner: gameState.winner, scores: gameState.players.map(p => ({ id: p.id, score: p.score })) });
      }
    } catch (error) {
      client.emit('unoError', { message: error.message });
    }
  }

  @SubscribeMessage('unoDrawCard')
  async handleDrawCard(@MessageBody() data: { roomId: string; playerId: string }, @ConnectedSocket() client: Socket) {
    try {
      const gameState = await this.unoService.drawCard(data.roomId, data.playerId);
      this.server.to(data.roomId).emit('unoGameState', gameState);
    } catch (error) {
      console.error('Draw card error:', error);

      // Try to recover game state
      try {
        const recoveredState = await this.unoService.recoverGameState(data.roomId);
        this.server.to(data.roomId).emit('unoGameState', recoveredState);
      } catch (recoveryError) {
        client.emit('unoError', { message: 'Game state corrupted. Please restart the game.' });
      }
    }
  }

  @SubscribeMessage('unoSayUno')
  async handleSayUno(@MessageBody() data: { roomId: string; playerId: string }, @ConnectedSocket() client: Socket) {
    try {
      const gameState = await this.unoService.sayUno(data.roomId, data.playerId);
      this.server.to(data.roomId).emit('unoGameState', gameState);
    } catch (error) {
      client.emit('unoError', { message: error.message });
    }
  }

  @SubscribeMessage('unoChooseColor')
  async handleChooseColor(@MessageBody() data: { roomId: string; playerId: string; color: string }, @ConnectedSocket() client: Socket) {
    try {
      const gameState = await this.unoService.chooseColor(data.roomId, data.playerId, data.color);
      this.server.to(data.roomId).emit('unoGameState', gameState);
    } catch (error) {
      client.emit('unoError', { message: error.message });
    }
  }

  @SubscribeMessage('unoGetState')
  async handleGetState(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    try {
      const gameState = await this.unoService.getGameState(data.roomId);
      client.emit('unoGameState', gameState);
    } catch (error) {
      client.emit('unoError', { message: error.message });
    }
  }

  @SubscribeMessage('unoRestartGame')
  async handleRestartGame(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    try {
      const gameState = await this.unoService.restartGame(data.roomId);
      this.server.to(data.roomId).emit('unoGameState', gameState);
    } catch (error) {
      client.emit('unoError', { message: error.message });
    }
  }
}