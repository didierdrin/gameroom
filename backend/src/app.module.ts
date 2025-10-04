// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameModule } from './game/game.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ChessModule } from './chess/chess.module';
import { TriviaController } from './trivia/trivia.controller';
import { TriviaModule } from './trivia/trivia.module';

@Module({
  imports: [
    MongooseModule.forRoot("mongodb+srv://nsedidier:zxqWjmMu7RYg7u0B@cluster0.eopcqfs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"),
    GameModule,
    UserModule,
    AuthModule,
    TriviaModule,
  ],
  controllers: [],
  providers: [], 
})
export class AppModule {}
