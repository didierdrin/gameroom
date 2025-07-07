// SocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

type SocketType = ReturnType<typeof io>;

const SocketContext = createContext<SocketType | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<SocketType | null>(null);

  useEffect(() => {
    const newSocket = io('https://alu-globe-gameroom.onrender.com', {
      transports: ['websocket'],
      reconnection: true,
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);