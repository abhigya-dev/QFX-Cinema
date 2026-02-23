import { Server } from 'socket.io';

let io;

export const initIO = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL,
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on('joinShow', (showId) => {
            socket.join(showId);
            console.log(`User ${socket.id} joined show room: ${showId}`);
        });

        socket.on('leaveShow', (showId) => {
            socket.leave(showId);
            console.log(`User ${socket.id} left show room: ${showId}`);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};
