import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UnoService } from './uno.service';

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

  constructor(private readonly unoService: UnoService) {}

  @SubscribeMessage('unoJoinGame')
  async handleJoinGame(@MessageBody() data: { roomId: string; playerId: string; playerName: string }, @ConnectedSocket() client: Socket) {
    try {
      const gameState = await this.unoService.addPlayer(data.roomId, data.playerId, data.playerName);
      client.join(data.roomId);
      this.server.to(data.roomId).emit('unoGameState', gameState);
    } catch (error) {
      client.emit('unoError', { message: error.message });
    }
  }

  @SubscribeMessage('unoStartGame')
  async handleStartGame(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    try {
      const gameState = await this.unoService.startGame(data.roomId);
      this.server.to(data.roomId).emit('unoGameState', gameState);
    } catch (error) {
      client.emit('unoError', { message: error.message });
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
      client.emit('unoError', { message: error.message });
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