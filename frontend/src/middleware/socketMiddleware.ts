// src/middleware/socketMiddleware.ts
import { Middleware } from '@reduxjs/toolkit';
import { socket } from 'services/socket';
import { moveCoin } from 'containers/Ludo/state/actions';

export const socketMiddleware: Middleware = (store:any) => {
  socket.on('connect', () => {
    console.log('Connected to server');
  });

  socket.on('coin-moved', (payload) => {
    store.dispatch(moveCoin(payload.coinID, payload.position, payload.cellID));
  });

  socket.on('score-updated', (payload) => {
    // dispatch score update action here
  });

  return (next) => (action) => {
    switch (action.type) {
      case 'ludo/joinRoom':
        socket.emit('join-room', action.payload);
        break;
      case 'ludo/emitMoveCoin':
        socket.emit('move-coin', action.payload);
        break;
      case 'ludo/updateScore':
        socket.emit('update-score', action.payload);
        break;
    }
    return next(action);
  };
};
