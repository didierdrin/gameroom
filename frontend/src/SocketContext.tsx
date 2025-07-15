// // SocketContext.tsx
// import React, { createContext, useContext, useEffect, useState } from 'react';

// type SocketType = WebSocket | null;

// const SocketContext = createContext<SocketType>(null);

// export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [socket, setSocket] = useState<SocketType>(null);

//   useEffect(() => {
//     const ws = new WebSocket('wss://alu-globe-gameroom.onrender.com');

//     ws.onopen = () => {
//       console.log('WebSocket connected');
//     };

//     ws.onmessage = (event) => {
//       console.log('WebSocket message received:', event.data);
//       // Parse and handle incoming messages (e.g., JSON.parse(event.data))
//     };

//     ws.onerror = (error) => {
//       console.error('WebSocket error:', error);
//     };

//     ws.onclose = (event) => {
//       console.log('WebSocket closed:', event.reason);
//     };

//     setSocket(ws);

//     return () => {
//       ws.close();
//       console.log('WebSocket cleanup: disconnected');
//     };
//   }, []);

//   return (
//     <SocketContext.Provider value={socket}>
//       {children}
//     </SocketContext.Provider>
//   );
// };

// export const useSocket = () => useContext(SocketContext);

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