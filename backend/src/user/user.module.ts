// src/user/user.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserGateway } from './user.gateway';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UserController],
  providers: [UserService, UserGateway],
  exports: [UserService, UserGateway],
})
export class UserModule {}


// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { User, UserSchema } from './schemas/user.schema';
// import { UserController } from './user.controller';
// import { UserService } from './user.service';

// @Module({
//   imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
//   controllers: [UserController],
//   providers: [UserService],
//   exports: [UserService],
// })
// export class UserModule {}

