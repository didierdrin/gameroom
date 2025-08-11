// custom-adapter.ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { ServerOptions } from 'socket.io';

export class CustomIoAdapter extends IoAdapter {
  constructor(app: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: [
          'http://localhost:5173',
          'https://alu-globe-gameroom-frontend.vercel.app',
          'https://alu-globe-gameroom.onrender.com'
        ],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket'],
      allowEIO3: true,
    });
    return server;
  }
}
