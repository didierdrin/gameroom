import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomIoAdapter } from './custom-adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // Enable logging
  });

  // Enhanced CORS configuration
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://alu-globe-gameroom-frontend.vercel.app',
      'https://alu-globe-gameroom.onrender.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // Apply the WebSocket adapter
  app.useWebSocketAdapter(new CustomIoAdapter(app));

  const port = process.env.PORT || 3000;
  
  // Listen on all interfaces
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Application is running on: http://0.0.0.0:${port}`);
  console.log(`🔌 WebSocket server is ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start the application:', error);
  process.exit(1);
});

// // src/main.ts
// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { IoAdapter } from '@nestjs/platform-socket.io';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   app.enableCors({
//     // origin: '*',
//     origin: [
//       'http://localhost:5173',          // Vite dev server
//       'https://alu-globe-gameroom-frontend.vercel.app', // Production frontend
//       'https://alu-globe-gameroom.onrender.com' // Render.com backend (for Socket.IO)
//     ],
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: true,
//   });

//   // Enable WebSocket support
//   app.useWebSocketAdapter(new IoAdapter(app));

//   const port = process.env.PORT || 3000;
//   await app.listen(port, '0.0.0.0');
//   console.log(`Application is running on port ${port}`);
// }
// bootstrap();

