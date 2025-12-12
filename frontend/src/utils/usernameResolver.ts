// frontend/src/utils/usernameResolver.ts
// Utility to resolve usernames for user IDs

interface UsernameCache {
  [userId: string]: {
    username: string;
    timestamp: number;
  };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'usernameCache';

class UsernameResolver {
  private cache: UsernameCache = {};
  private pendingRequests: { [userId: string]: Promise<string> | undefined } = {};

  constructor() {
    this.loadCache();
  }

  private loadCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        this.cache = JSON.parse(cached);
        // Clean expired entries
        const now = Date.now();
        Object.keys(this.cache).forEach(userId => {
          if (now - this.cache[userId].timestamp > CACHE_DURATION) {
            delete this.cache[userId];
          }
        });
        this.saveCache();
      }
    } catch (error) {
      console.warn('Failed to load username cache:', error);
      this.cache = {};
    }
  }

  private saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save username cache:', error);
    }
  }

  private async fetchUsernameFromBackend(userId: string): Promise<string> {
    try {
      const response = await fetch(`https://alu-globe-gameroom.onrender.com/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        // Fix: Change from data.username to data.data?.username
        if (data.success && data.data?.username) {
          return data.data.username;
        }
      }
      throw new Error('Failed to fetch username');
    } catch (error) {
      console.warn(`Failed to fetch username for ${userId}:`, error);
      throw error;
    }
  }

  async resolveUsername(userId: string): Promise<string> {
    // Check if we have a valid cached username
    if (this.cache[userId] && Date.now() - this.cache[userId].timestamp < CACHE_DURATION) {
      return this.cache[userId].username;
    }

    // Check if there's already a pending request for this user
    if (this.pendingRequests[userId] !== undefined) {
      return this.pendingRequests[userId]!;
    }

    // Create a new request
    const request = this.fetchUsernameFromBackend(userId)
      .then(username => {
        // Cache the result
        this.cache[userId] = {
          username,
          timestamp: Date.now()
        };
        this.saveCache();

        // Clean up pending request
        delete this.pendingRequests[userId];

        return username;
      })
      .catch(error => {
        // Clean up pending request
        delete this.pendingRequests[userId];

        // Return a fallback display
        return this.getFallbackDisplay(userId);
      });

    this.pendingRequests[userId] = request;
    return request;
  }

  private getFallbackDisplay(userId: string): string {
    // Return a shortened version of the user ID as fallback
    if (userId.length > 20) {
      return `${userId.substring(0, 8)}...${userId.substring(userId.length - 8)}`;
    }
    return userId;
  }

  // Method to pre-populate cache with known usernames
  setCachedUsername(userId: string, username: string) {
    this.cache[userId] = {
      username,
      timestamp: Date.now()
    };
    this.saveCache();
  }

  // Method to bulk populate cache from localStorage patterns
  bulkPopulateFromLocalStorage() {
    try {
      // Pattern 1: Direct username keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('username_')) {
          const userId = key.replace('username_', '');
          const username = localStorage.getItem(key);
          if (username && userId.length === 24) { // MongoDB ObjectId length
            this.setCachedUsername(userId, username);
          }
        }
      }

      // Pattern 2: Players cache
      try {
        const playersCache = localStorage.getItem('playersCache');
        if (playersCache) {
          const parsed = JSON.parse(playersCache);
          Object.entries(parsed).forEach(([userId, data]: [string, any]) => {
            if (data?.username && userId.length === 24) {
              this.setCachedUsername(userId, data.username);
            }
          });
        }
      } catch (error) {
        console.log('Error parsing playersCache:', error);
      }

      // Pattern 3: Usernames object
      try {
        const usernames = localStorage.getItem('usernames');
        if (usernames) {
          const parsed = JSON.parse(usernames);
          Object.entries(parsed).forEach(([userId, username]: [string, any]) => {
            if (username && userId.length === 24) {
              this.setCachedUsername(userId, username);
            }
          });
        }
      } catch (error) {
        console.log('Error parsing usernames object:', error);
      }

      // Pattern 4: User cache
      try {
        const userCache = localStorage.getItem('userCache');
        if (userCache) {
          const parsed = JSON.parse(userCache);
          Object.entries(parsed).forEach(([userId, data]: [string, any]) => {
            if (data?.username && userId.length === 24) {
              this.setCachedUsername(userId, data.username);
            }
          });
        }
      } catch (error) {
        console.log('Error parsing userCache:', error);
      }

      console.log(`Bulk populated ${Object.keys(this.cache).length} usernames from localStorage`);
    } catch (error) {
      console.warn('Error during bulk population:', error);
    }
  }

  // Method to clear expired cache entries
  clearExpiredCache() {
    const now = Date.now();
    let cleared = 0;

    Object.keys(this.cache).forEach(userId => {
      if (now - this.cache[userId].timestamp > CACHE_DURATION) {
        delete this.cache[userId];
        cleared++;
      }
    });

    if (cleared > 0) {
      this.saveCache();
      console.log(`Cleared ${cleared} expired username cache entries`);
    }
  }

  // Method to get cached username without fetching
  getCachedUsername(userId: string): string | null {
    if (this.cache[userId] && Date.now() - this.cache[userId].timestamp < CACHE_DURATION) {
      return this.cache[userId].username;
    }
    return null;
  }
}

// Create a singleton instance
export const usernameResolver = new UsernameResolver();

// Export the class for testing purposes
export { UsernameResolver };
