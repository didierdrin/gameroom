import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomIoAdapter } from './custom-adapter';
import * as http from 'http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // Enable logging
  });

  // Enhanced CORS configuration
  app.enableCors({
    origin: [
      'http://localhost:3000',
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

  // Keep-alive function to prevent Render.com from sleeping
  const keepAlive = () => {
    // Ping the server every 5 minutes to keep it active
    setInterval(() => {
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'GET'
      };

      const req = http.request(options, (res) => {
        console.log(`Keep-alive ping successful: ${res.statusCode}`);
      });

      req.on('error', (err) => {
        console.log('Keep-alive ping failed:', err.message);
      });

      req.end();
    }, 5 * 60 * 1000); // Every 5 minutes

    console.log('Keep-alive function started - pinging every 5 minutes');
  };

  // Start keep-alive function
  keepAlive();
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start the application:', error);
  process.exit(1);
});
