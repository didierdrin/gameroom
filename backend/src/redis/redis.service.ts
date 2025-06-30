// // src/redis/redis.service.ts

// src/redis/redis.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private client;

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const url = new URL(redisUrl);

    this.client = createClient({
      url: process.env.REDIS_URL, // Loaded from env
      socket: {
        host: url.hostname,
        tls: true, // required for rediss:// secure connection
      },
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
    await this.client.connect();
  }

  async set(key: string, value: any) {
    await this.client.set(key, JSON.stringify(value));
  }

  async get<T = any>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async del(key: string) {
    await this.client.del(key);
  }
}



// import { Injectable } from '@nestjs/common';
// import { createClient } from 'redis';

// @Injectable()
// export class RedisService {
//   private client = createClient();

//   async onModuleInit() {
//     await this.client.connect();
//   }

//   async set(key: string, value: any) {
//     await this.client.set(key, JSON.stringify(value));
//   }

//   async get<T = any>(key: string): Promise<T | null> {
//     const data = await this.client.get(key);
//     return data ? JSON.parse(data) : null;
//   }

//   async del(key: string) {
//     await this.client.del(key);
//   }
// }
