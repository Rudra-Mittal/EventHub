import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import userRoutes from './routes/userRoutes';
import eventRoutes from './routes/eventRoutes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Make io accessible to route handlers
app.set('io', io);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);

// Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('joinEvent', (eventId) => {
    console.log(`Socket ${socket.id} joining event room: ${eventId}`);
    socket.join(eventId);
  });

  socket.on('leaveEvent', (eventId) => {
    console.log(`Socket ${socket.id} leaving event room: ${eventId}`);
    socket.leave(eventId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});