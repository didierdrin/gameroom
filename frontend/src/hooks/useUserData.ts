// frontend/src/hooks/useUserData.ts
import { useState, useEffect } from 'react';

interface UserData {
  username: string;
  avatar: string;
}

export const useUserData = (userId: string | null | undefined) => {
  const [userData, setUserData] = useState<UserData>({ username: '', avatar: '' });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setUserData({ username: '', avatar: '' });
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchUserData = async () => {
      // Check if current user
      const currentUserId = localStorage.getItem('userId');
      if (userId === currentUserId) {
        const currentUsername = localStorage.getItem('username');
        const currentAvatar = localStorage.getItem('avatar');
        setUserData({
          username: currentUsername ? `${currentUsername} (You)` : 'You',
          avatar: currentAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUsername || 'default'}`
        });
        return;
      }

      // Check if AI user
      if (typeof userId === 'string' && userId.startsWith('ai-')) {
        const aiName = `AI ${userId.split('-')[1]}`;
        setUserData({
          username: aiName,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${aiName}`
        });
        return;
      }

      // Try to get cached user data first
      const cachedData = getUserDataFromCache(userId);
      if (cachedData) {
        setUserData(cachedData);
        return;
      }

      // If no cached data, fetch it
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`https://gameroom-t0mx.onrender.com/user/${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const userData = {
              username: data.data.username || userId,
              avatar: data.data.avatar && data.data.avatar.trim() !== '' 
                ? data.data.avatar 
                : `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.data.username || userId}`
            };
            setUserData(userData);
            setUserDataInCache(userId, userData);
          } else {
            throw new Error('Invalid user data received');
          }
        } else {
          throw new Error('Failed to fetch user data');
        }
      } catch (err) {
        console.warn('Failed to fetch user data:', err);
        setError('Failed to load user data');
        // Use fallback display
        const fallbackData = {
          username: userId.length > 20 
            ? `${userId.substring(0, 8)}...${userId.substring(userId.length - 8)}`
            : userId,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
        };
        setUserData(fallbackData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const refreshUserData = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`https://gameroom-t0mx.onrender.com/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const userData = {
            username: data.data.username || userId,
            avatar: data.data.avatar && data.data.avatar.trim() !== '' 
              ? data.data.avatar 
              : `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.data.username || userId}`
          };
          setUserData(userData);
          setUserDataInCache(userId, userData);
        }
      }
    } catch (err) {
      setError('Failed to refresh user data');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    username: userData.username,
    avatar: userData.avatar,
    isLoading,
    error,
    refreshUserData
  };
};

// Cache management functions
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'userDataCache';

interface UserDataCache {
  [userId: string]: {
    data: UserData;
    timestamp: number;
  };
}

const getUserDataFromCache = (userId: string): UserData | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const cache: UserDataCache = JSON.parse(cached);
      if (cache[userId] && Date.now() - cache[userId].timestamp < CACHE_DURATION) {
        return cache[userId].data;
      }
    }
  } catch (error) {
    console.warn('Failed to load user data cache:', error);
  }
  return null;
};

const setUserDataInCache = (userId: string, data: UserData) => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const cache: UserDataCache = cached ? JSON.parse(cached) : {};
    cache[userId] = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Failed to save user data cache:', error);
  }
};
