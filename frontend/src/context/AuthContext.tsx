import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface AuthUser {
  id: string;
  username: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void; // Add this method
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
  
    // Centralized auth state updater
    const updateAuthState = useCallback(() => {
      const userId = localStorage.getItem('userId');
      const username = localStorage.getItem('username');
      if (userId && username) {
        setUser({ id: userId, username });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }, []);
  
    useEffect(() => {
      updateAuthState();
      
      // Sync auth state across tabs
      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'userId' || e.key === 'username') {
          updateAuthState();
        }
      };
  
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }, [updateAuthState]);
  
    const login = useCallback((user: AuthUser) => {
      localStorage.setItem('userId', user.id);
      localStorage.setItem('username', user.username);
      setUser(user);
    }, []);
  
    const logout = useCallback(() => {
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      setUser(null);
    }, []);

    const updateUser = useCallback((updates: Partial<AuthUser>) => {
      if (user) {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        
        // Update localStorage
        if (updates.id) {
          localStorage.setItem('userId', updates.id);
        }
        if (updates.username) {
          localStorage.setItem('username', updates.username);
        }
      }
    }, [user]);
  
    return (
      <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading }}>
        {children}
      </AuthContext.Provider>
    );
  };


export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


