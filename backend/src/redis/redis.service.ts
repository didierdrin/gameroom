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

  /**
   * Get all keys that match a pattern
   * e.g. 'gameRoom:*' to list all game rooms
   */
  async getKeys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  /**
   * Get a key and parse it as JSON (optional helper)
   */
  async getJSON<T = any>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  // List operations for chat functionality
  /**
   * Push a value to the left (beginning) of a list
   */
  async lpush(key: string, value: string): Promise<number> {
    return await this.client.lPush(key, value);
  }

  /**
   * Trim a list to keep only elements within the specified range
   */
  async ltrim(key: string, start: number, stop: number): Promise<string> {
    return await this.client.lTrim(key, start, stop);
  }

  /**
   * Set an expiration time on a key (in seconds)
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    return await this.client.expire(key, seconds);
  }

  /**
   * Get elements from a list within the specified range
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.lRange(key, start, stop);
  }
}

// // src/redis/redis.service.ts
// import { Injectable, OnModuleInit } from '@nestjs/common';
// import { createClient } from 'redis';

// @Injectable()
// export class RedisService implements OnModuleInit {
//   private client;

//   async onModuleInit() {
//     const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
//     const url = new URL(redisUrl);

//     this.client = createClient({
//       url: process.env.REDIS_URL, // Loaded from env
//       socket: {
//         host: url.hostname,
//         tls: true, // required for rediss:// secure connection
//       },
//     });

//     this.client.on('error', (err) => console.error('Redis Client Error', err));
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

  
// /**
//  * Get all keys that match a pattern
//  * e.g. 'gameRoom:*' to list all game rooms
//  */
// async getKeys(pattern: string): Promise<string[]> {
//   return await this.client.keys(pattern);
// }

// /**
//  * Get a key and parse it as JSON (optional helper)
//  */
// async getJSON<T = any>(key: string): Promise<T | null> {
//   const raw = await this.client.get(key);
//   return raw ? JSON.parse(raw) : null;
// }

// }

