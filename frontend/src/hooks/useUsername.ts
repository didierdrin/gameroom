// frontend/src/hooks/useUsername.ts
import { useState, useEffect } from 'react';
import { usernameResolver } from '../utils/usernameResolver';

export const useUsername = (userId: string | null | undefined) => {
  const [username, setUsername] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setUsername('');
      setIsLoading(false);
      setError(null);
      return;
    }

    const resolveUsername = async () => {
      // Check if current user
      const currentUserId = localStorage.getItem('userId');
      if (userId === currentUserId) {
        const currentUsername = localStorage.getItem('username');
        setUsername(currentUsername ? `${currentUsername} (You)` : 'You');
        return;
      }

      // Check if AI user
      if (typeof userId === 'string' && userId.startsWith('ai-')) {
        const aiName = `AI ${userId.split('-')[1]}`;
        setUsername(aiName);
        return;
      }

      // Try to get cached username first
      const cachedUsername = usernameResolver.getCachedUsername(userId);
      if (cachedUsername) {
        setUsername(cachedUsername);
        return;
      }

      // If no cached username, fetch it
      setIsLoading(true);
      setError(null);
      
      try {
        const resolvedUsername = await usernameResolver.resolveUsername(userId);
        setUsername(resolvedUsername);
      } catch (err) {
        console.warn('Failed to resolve username:', err);
        setError('Failed to load username');
        // Use fallback display
        setUsername(userId.length > 20 
          ? `${userId.substring(0, 8)}...${userId.substring(userId.length - 8)}`
          : userId
        );
      } finally {
        setIsLoading(false);
      }
    };

    resolveUsername();
  }, [userId]);

  const refreshUsername = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const resolvedUsername = await usernameResolver.resolveUsername(userId);
      setUsername(resolvedUsername);
    } catch (err) {
      setError('Failed to refresh username');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    username,
    isLoading,
    error,
    refreshUsername
  };
};
