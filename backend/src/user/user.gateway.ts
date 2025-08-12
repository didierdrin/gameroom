// src/user/user.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { UserService } from './user.service';
  
  @WebSocketGateway({
    cors: {
      origin: "*",
      credentials: true
    },
    namespace: '/user'
  })
  export class UserGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    private connectedUsers = new Map<string, { socket: Socket; userId: string }>();
  
    constructor(private userService: UserService) {}
  
    async handleConnection(client: Socket) {
      console.log(`User client connected: ${client.id}`);
    }
  
    async handleDisconnect(client: Socket) {
      console.log(`User client disconnected: ${client.id}`);
      // Remove from connected users
      for (const [key, value] of this.connectedUsers.entries()) {
        if (value.socket.id === client.id) {
          this.connectedUsers.delete(key);
          break;
        }
      }
    }
  
    @SubscribeMessage('user:register')
    async handleUserRegister(
      @MessageBody() data: { userId: string },
      @ConnectedSocket() client: Socket,
    ) {
      try {
        this.connectedUsers.set(client.id, {
          socket: client,
          userId: data.userId
        });
  
        const user = await this.userService.findById(data.userId);
        if (user) {
          client.emit('user:registered', { success: true, user });
        } else {
          client.emit('user:registered', { success: false, error: 'User not found' });
        }
      } catch (error) {
        client.emit('user:registered', { success: false, error: error.message });
      }
    }
  
    @SubscribeMessage('user:getStats')
    async handleGetUserStats(
      @MessageBody() data: { userId: string },
      @ConnectedSocket() client: Socket,
    ) {
      try {
        const stats = await this.userService.getUserStats(data.userId);
        client.emit('user:stats', { success: true, stats });
      } catch (error) {
        client.emit('user:stats', { success: false, error: error.message });
      }
    }
  
    @SubscribeMessage('user:getLeaderboard')
    async handleGetLeaderboard(
      @MessageBody() data: { gameType?: string; limit?: number },
      @ConnectedSocket() client: Socket,
    ) {
      try {
        const leaderboard = await this.userService.getLeaderboard(
          data.limit || 10,
          data.gameType
        );
        client.emit('user:leaderboard', { success: true, leaderboard });
      } catch (error) {
        client.emit('user:leaderboard', { success: false, error: error.message });
      }
    }
  
    // Method to notify all clients about leaderboard updates
    async notifyLeaderboardUpdate(gameType?: string) {
      try {
        const leaderboard = await this.userService.getLeaderboard(10, gameType);
        this.server.emit('user:leaderboardUpdate', { 
          success: true, 
          leaderboard,
          gameType 
        });
      } catch (error) {
        console.error('Error notifying leaderboard update:', error);
      }
    }
  
    // Method to notify specific user about stat updates
    notifyUserStatsUpdate(userId: string, stats: any) {
      for (const [key, value] of this.connectedUsers.entries()) {
        if (value.userId === userId) {
          value.socket.emit('user:statsUpdate', { success: true, stats });
          break;
        }
      }
    }
  }