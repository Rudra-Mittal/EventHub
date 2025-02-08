"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("./config/database"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const eventRoutes_1 = __importDefault(require("./routes/eventRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: [process.env.FRONTEND_URL || "", 'http://localhost:5173'],
        methods: ['GET', 'POST']
    }
});
// Make io accessible to route handlers
app.set('io', io);
// Connect to MongoDB
(0, database_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/users', userRoutes_1.default);
app.use('/api/events', eventRoutes_1.default);
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
