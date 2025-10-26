// SocketContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

export type SocketType = ReturnType<typeof io>;

interface SocketContextType {
  socket: SocketType | null;
  isConnected: boolean;
  connectionError: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectionError: null,
});

// Singleton socket instance to prevent duplicate connections
let sharedSocket: SocketType | null = null;
let connectionAttempts = 0;
const MAX_RETRIES = 5;

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const createConnection = () => {
    if (!mountedRef.current) return;

    // Clean up existing connection
    if (sharedSocket) {
      sharedSocket.removeAllListeners();
      sharedSocket.disconnect();
      sharedSocket = null;
    }

    console.log(`Attempting to connect to WebSocket... (attempt ${connectionAttempts + 1})`);
    
    sharedSocket = io('https://gameroom-t0mx.onrender.com', {
      transports: ['websocket', 'polling'], // Allow fallback to polling
      timeout: 20000, // 20 second timeout
      reconnection: true,
      reconnectionAttempts: MAX_RETRIES,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      // maxReconnectionAttempts: MAX_RETRIES,
      forceNew: true, // Force a new connection
      autoConnect: true,
    });

    // Connection successful
    sharedSocket.on('connect', () => {
      if (!mountedRef.current) return;
      console.log('Socket connected successfully', sharedSocket?.id);
      setIsConnected(true);
      setConnectionError(null);
      connectionAttempts = 0; // Reset attempts on successful connection
    });

    // Connection failed
    sharedSocket.on('connect_error', (error: any) => {
      if (!mountedRef.current) return;
      console.error('Socket connection error:', error);
      setIsConnected(false);
      setConnectionError(error.message || 'Connection failed');
      
      connectionAttempts++;
      if (connectionAttempts < MAX_RETRIES) {
        const delay = Math.min(2000 * Math.pow(2, connectionAttempts), 30000); // Exponential backoff
        console.log(`Retrying connection in ${delay}ms...`);
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            createConnection();
          }
        }, delay);
      } else {
        setConnectionError('Max connection attempts reached. Please refresh the page.');
      }
    });

    // Disconnection
    sharedSocket.on('disconnect', (reason: any) => {
      if (!mountedRef.current) return;
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      
      // Only attempt reconnection for certain disconnect reasons
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        // Server initiated disconnect or client initiated - don't reconnect automatically
        setConnectionError('Disconnected from server');
      } else {
        // Network issues, etc. - attempt reconnection
        setConnectionError('Connection lost, attempting to reconnect...');
      }
    });

    // Reconnection events
    sharedSocket.on('reconnect', (attemptNumber: any) => {
      if (!mountedRef.current) return;
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
      connectionAttempts = 0;
    });

    sharedSocket.on('reconnect_error', (error: any) => {
      if (!mountedRef.current) return;
      console.error('Socket reconnection error:', error);
      setConnectionError('Reconnection failed');
    });

    sharedSocket.on('reconnect_failed', () => {
      if (!mountedRef.current) return;
      console.error('Socket reconnection failed after all attempts');
      setConnectionError('Failed to reconnect. Please refresh the page.');
    });

    setSocket(sharedSocket);
  };

  useEffect(() => {
    mountedRef.current = true;
    
    // Only create connection if we don't have one
    if (!sharedSocket || sharedSocket.disconnected) {
      createConnection();
    } else {
      // Use existing connection
      setSocket(sharedSocket);
      setIsConnected(sharedSocket.connected);
    }

    return () => {
      mountedRef.current = false;
      
      // Clear any pending reconnection timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Clean up listeners but keep connection alive for other components
      if (sharedSocket) {
        sharedSocket.off('connect');
        sharedSocket.off('disconnect');
        sharedSocket.off('connect_error');
        sharedSocket.off('reconnect');
        sharedSocket.off('reconnect_error');
        sharedSocket.off('reconnect_failed');
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectionError }}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook that returns the socket (can be null)
export const useSocket = (): SocketType | null => {
  const context = useContext(SocketContext);
  return context.socket;
};

// Custom hook that returns socket connection status
export const useSocketConnection = (): boolean => {
  const context = useContext(SocketContext);
  return context.isConnected;
};

// Custom hook that returns connection error
export const useSocketError = (): string | null => {
  const context = useContext(SocketContext);
  return context.connectionError;
};

// Custom hook that returns socket only when connected (throws error if not connected)
export const useConnectedSocket = (): SocketType => {
  const context = useContext(SocketContext);
  if (!context.socket || !context.isConnected) {
    throw new Error('Socket is not connected');
  }
  return context.socket;
};

