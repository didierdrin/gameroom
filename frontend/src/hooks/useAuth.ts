// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    
    if (userId && username) {
      setUser({ id: userId, username });
    }
    setIsLoading(false);
  }, []);

  return { user, isLoading };
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