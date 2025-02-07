import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

export const socket = io(SOCKET_URL);

export const joinEventRoom = (eventId: string) => {
  socket.emit('joinEvent', eventId);
};

export const leaveEventRoom = (eventId: string) => {
  socket.emit('leaveEvent', eventId);
};