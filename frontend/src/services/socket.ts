// src/services/socket.ts
import io from 'socket.io-client';

export const socket = io('https://alu-globe-gameroom.onrender.com', {
  transports: ['websocket'],
  autoConnect: false,
});
