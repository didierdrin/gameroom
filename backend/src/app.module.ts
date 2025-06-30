// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    MongooseModule.forRoot("mongodb+srv://nsedidier:zxqWjmMu7RYg7u0B@cluster0.eopcqfs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"), // e.g. mongodb://localhost:27017/ludo
    // RedisModule.forRoot({
    //   config: {
    //     url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    //   },
    // }),
    RedisModule,
  ],
})
export class AppModule {}
