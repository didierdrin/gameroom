// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameModule } from './game/game.module';
import { UserModule } from './user/user.module';
import { TriviaController } from './trivia/trivia.controller';

@Module({
  imports: [
    MongooseModule.forRoot("mongodb+srv://nsedidier:zxqWjmMu7RYg7u0B@cluster0.eopcqfs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"), // e.g. mongodb://localhost:27017/ludo
    GameModule,
    UserModule,
  ],
  controllers: [TriviaController],
})
export class AppModule {}
