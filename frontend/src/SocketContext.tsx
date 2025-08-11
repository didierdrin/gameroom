
// SocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

export type SocketType = ReturnType<typeof io>;

interface ExtendedConnectOpts extends Partial<SocketIOClient.ConnectOpts> {
  pingTimeout?: number;
  pingInterval?: number;
}
interface SocketContextType {
  socket: SocketType | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);


  
  useEffect(() => {
    const newSocket = io('https://alu-globe-gameroom.onrender.com', {
      transports: ['websocket'],
      pingTimeout: 60000,
      pingInterval: 25000,
    } as ExtendedConnectOpts);
 
    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason:any) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error: any) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber:any) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    newSocket.on('reconnect_error', (error:any) => {
      console.error('Socket reconnection error:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);


  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
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

// Custom hook that returns socket only when connected (throws error if not connected)
export const useConnectedSocket = (): SocketType => {
  const context = useContext(SocketContext);
  if (!context.socket || !context.isConnected) {
    throw new Error('Socket is not connected');
  }
  return context.socket;
};




  // useEffect(() => {
  //   const newSocket = io('https://alu-globe-gameroom.onrender.com', {
  //     transports: ['websocket'],
  //     reconnection: true,
  //   });

  //   newSocket.on('connect', () => {
  //     console.log('Socket connected');
  //     setIsConnected(true);
  //   });

  //   newSocket.on('disconnect', () => {
  //     console.log('Socket disconnected');
  //     setIsConnected(false);
  //   });

  //   newSocket.on('connect_error', (error:any) => {
  //     console.error('Socket connection error:', error);
  //     setIsConnected(false);
  //   });

  //   setSocket(newSocket);

  //   return () => {
  //     newSocket.disconnect();
  //   };
  // }, []);



     // const newSocket = io('https://alu-globe-gameroom.onrender.com', {
    //   transports: ['websocket'],
    //   reconnection: true,
    //   reconnectionAttempts: 5,
    //   reconnectionDelay: 1000,
    //   reconnectionDelayMax: 5000,
    //   timeout: 20000,
    //   forceNew: true,
    //   upgrade: true,
    //   rememberUpgrade: false,
    //   pingTimeout: 60000,
    //   pingInterval: 25000,
    // });
