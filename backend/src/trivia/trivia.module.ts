import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TriviaController } from './trivia.controller';
import { TriviaService } from './trivia.service';
import { EnhancedTriviaService } from './enhanced-trivia.service';
import { TriviaQuestion, TriviaQuestionSchema } from './schemas/trivia-question.schema';
import { TriviaPopulatorService } from './trivia-populator.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TriviaQuestion.name, schema: TriviaQuestionSchema }
    ])
  ],
  controllers: [TriviaController],
  providers: [TriviaService, EnhancedTriviaService, TriviaPopulatorService],
  exports: [TriviaService, EnhancedTriviaService, TriviaPopulatorService, MongooseModule], 
})
export class TriviaModule {}
