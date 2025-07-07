// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const userId = localStorage.getItem('userId');
      const username = localStorage.getItem('username');
      
      if (userId && username) {
        setUser({ id: userId, username });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    checkAuth();
    // Add event listener to sync auth state across tabs
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const login = (userId: string, username: string) => {
    localStorage.setItem('userId', userId);
    localStorage.setItem('username', username);
    setUser({ id: userId, username });
  };

  const logout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    setUser(null);
  };

  return { user, isLoading, login, logout };
};

// // src/hooks/useAuth.ts
// import { useState, useEffect } from 'react';

// export const useAuth = () => {
//   const [user, setUser] = useState<{ id: string; username: string } | null>(null);

//   useEffect(() => {
//     // Check localStorage for user data
//     const userId = localStorage.getItem('userId');
//     const username = localStorage.getItem('username');
    
//     if (userId && username) {
//       setUser({ id: userId, username });
//     }
//   }, []);

//   return { user };
// };