import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}


// // src/user/user.module.ts
// import { Module } from '@nestjs/common';
// import { UserController } from './user.controller';
// import { UserService } from './user.service';
// // import { GameGateway } from './game.gateway';
// import { MongooseModule } from '@nestjs/mongoose';
// import { User, UserSchema } from './schemas/user.schema';
// import { RedisModule } from '../redis/redis.module';

// @Module({
//     imports: [
//       MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
//     ],
//     controllers: [UserController],
//     providers: [UserService],
//     exports: [UserService],
//   })
//   export class UserModule {}
  