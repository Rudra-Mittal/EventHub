import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL; ;

export const socket = io(SOCKET_URL);

export const joinEventRoom = (eventId: string) => {
  socket.emit('joinEvent', eventId);
};

export const leaveEventRoom = (eventId: string) => {
  socket.emit('leaveEvent', eventId);
};