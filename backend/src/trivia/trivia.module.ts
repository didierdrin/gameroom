import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TriviaController } from './trivia.controller';
import { TriviaService } from './trivia.service';
import { EnhancedTriviaService } from './enhanced-trivia.service';
import { TriviaQuestion, TriviaQuestionSchema } from './schemas/trivia-question.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TriviaQuestion.name, schema: TriviaQuestionSchema }
    ])
  ],
  controllers: [TriviaController],
  providers: [TriviaService, EnhancedTriviaService],
  exports: [TriviaService, EnhancedTriviaService, MongooseModule], // Export MongooseModule too
})
export class TriviaModule {}

// import { Module } from '@nestjs/common';
// import { TriviaController } from './trivia.controller';
// import { TriviaService } from './trivia.service';

// @Module({
//   controllers: [TriviaController],
//   providers: [TriviaService],  
//   exports: [TriviaService],    
// })
// export class TriviaModule {}