// frontend/src/hooks/useAvatar.ts
import { useEffect, useState } from 'react';

interface AvatarCacheEntry {
  url: string;
  timestamp: number;
}

const AVATAR_CACHE_KEY = 'avatarCache';
const AVATAR_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function loadCache(): Record<string, AvatarCacheEntry> {
  try {
    const raw = localStorage.getItem(AVATAR_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, AvatarCacheEntry>;
    const now = Date.now();
    const fresh: Record<string, AvatarCacheEntry> = {};
    Object.entries(parsed).forEach(([userId, entry]) => {
      if (now - entry.timestamp < AVATAR_CACHE_TTL_MS) {
        fresh[userId] = entry;
      }
    });
    if (Object.keys(fresh).length !== Object.keys(parsed).length) {
      localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(fresh));
    }
    return fresh;
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, AvatarCacheEntry>) {
  try {
    localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(cache));
  } catch {
    console.warn('Failed to save avatar cache to localStorage');
  }
}

export const useAvatar = (userId: string | null | undefined, seedFallback?: string) => {
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setAvatarUrl('');
      setIsLoading(false);
      setError(null);
      return;
    }

    let didCancel = false;
    const cache = loadCache();
    const cached = cache[userId];

    if (cached) {
      console.log(`Using cached avatar for user ${userId}:`, cached.url);
      setAvatarUrl(cached.url);
      setIsLoading(false);
      return;
    }

    const fetchAvatar = async () => {
      setIsLoading(true);
      setError(null);
      console.log(`Fetching avatar for user ${userId}...`);

      try {
        const resp = await fetch(`https://alu-globe-gameroom.onrender.com/user/${userId}/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }

        const json = await resp.json();
        console.log(`Profile response for user ${userId}:`, json);

        // Handle both response formats: { data: { avatar } } or { avatar }
        const url: string | undefined = json?.data?.avatar || json?.avatar;

        if (url && !didCancel) {
          console.log(`Found avatar URL for user ${userId}:`, url);
          setAvatarUrl(url);
          const updated = { ...cache, [userId]: { url, timestamp: Date.now() } };
          saveCache(updated);
          return;
        }

        throw new Error('No avatar found in profile response');
      } catch (e: any) {
        if (didCancel) return;

        console.warn(`Failed to fetch avatar for user ${userId}:`, e?.message);
        setError(e?.message || 'Failed to load avatar');

        // Fallback: stable dicebear using provided seed or userId
        const seed = (seedFallback || userId).toString();
        const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
        console.log(`Using fallback avatar for user ${userId}:`, fallbackUrl);
        setAvatarUrl(fallbackUrl);

        // Cache the fallback URL with a shorter TTL (1 minute) so we retry sooner
        const updated = { ...cache, [userId]: { url: fallbackUrl, timestamp: Date.now() - (AVATAR_CACHE_TTL_MS - 60000) } };
        saveCache(updated);
      } finally {
        if (!didCancel) setIsLoading(false);
      }
    };

    fetchAvatar();
    return () => {
      didCancel = true;
    };
  }, [userId, seedFallback]);

  return { avatarUrl, isLoading, error };
};
