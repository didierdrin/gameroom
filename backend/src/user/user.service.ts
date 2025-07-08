// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(userData: { username: string }): Promise<User> {
    const user = new this.userModel(userData);
    return user.save();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).select('_id username').exec();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }
}


// import { Injectable } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { User, UserDocument } from './schemas/user.schema';
// import { Model } from 'mongoose';

// @Injectable()
// export class UserService {
//   constructor(
//     @InjectModel(User.name) private userModel: Model<UserDocument>,
//   ) {}

//   async findById(id: string) {
//     return this.userModel.findById(id).select('username');
//   }
// }
