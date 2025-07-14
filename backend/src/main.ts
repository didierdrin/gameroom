

// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // app.enableCors({
  //   origin: '*',
  //   credentials: true,
  // });

  app.enableCors({
    // origin: '*',
    origin: [
      'http://localhost:5173',          // Vite dev server
      'https://alu-globe-gameroom-frontend.vercel.app', // Production frontend
      'https://alu-globe-gameroom.onrender.com' // Render.com backend (for Socket.IO)
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Enable WebSocket support
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on port ${port}`);
}
bootstrap();



// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
  
//   // Enable CORS if needed
//   app.enableCors();
  
//   // Use PORT environment variable for Render
//   const port = process.env.PORT || 3000;
//   await app.listen(port, '0.0.0.0');
  
//   console.log(`Application is running on port ${port}`);
// }
// bootstrap();

// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { ValidationPipe } from '@nestjs/common';
// import { IoAdapter } from '@nestjs/platform-socket.io';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   app.useGlobalPipes(new ValidationPipe());
//   app.enableCors(); // Optional, adjust if needed
//   app.useWebSocketAdapter(new IoAdapter(app));
//   await app.listen(process.env.PORT ?? 3000);
// }
// bootstrap();

