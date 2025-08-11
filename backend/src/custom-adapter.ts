// custom-adapter.ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { ServerOptions } from 'socket.io';

export class CustomIoAdapter extends IoAdapter {
  constructor(app: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    console.log('🔌 Creating WebSocket server...');
    
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: [
          'http://localhost:5173',
          'https://alu-globe-gameroom-frontend.vercel.app',
          'https://alu-globe-gameroom.onrender.com'
        ],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      // Connection timeout and ping settings
      pingTimeout: 60000, // 60 seconds
      pingInterval: 25000, // 25 seconds
      connectTimeout: 45000, // 45 seconds connection timeout
      
      // Transport configuration
      transports: ['websocket', 'polling'], // Allow both transports
      upgradeTimeout: 30000, // 30 seconds to upgrade to websocket
      
      // Additional options for better reliability
      allowEIO3: true, // Support older Socket.IO clients
      maxHttpBufferSize: 1e6, // 1MB buffer size
      
      // Heartbeat settings
      serveClient: false, // Don't serve Socket.IO client files
    });

    // Add connection event logging
    server.on('connection', (socket) => {
      console.log(`✅ Client connected: ${socket.id} from ${socket.handshake.address}`);
      
      socket.on('disconnect', (reason) => {
        console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`);
      });
    });

    server.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
    });

    console.log('✅ WebSocket server created successfully');
    return server;
  }
}