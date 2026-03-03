/**
 * Omertà Protocol - Main API/Socket Server
 * Entry point for real-time multiplayer coordination.
 */

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const RoomManager = require('./roomManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // For development
        methods: ['GET', 'POST'],
    },
});

const fs = require('fs');

// Serve Static Frontend (in Production)
const clientPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientPath)) {
    console.log(`📡 Serving static files from: ${clientPath}`);
    app.use(express.static(clientPath));

    // Fallback to index.html for SPA routing
    app.get('*', (req, res) => {
        const indexPath = path.join(clientPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).send('Frontend build not found. Run "npm run build" in the client directory.');
        }
    });
} else {
    console.log('⚠️ Static frontend build not found. API only mode active.');
    app.get('/', (req, res) => {
        res.send('Omertà Protocol Server is running. (Frontend not found - use dev server on port 5173)');
    });
}

const PORT = process.env.PORT || 3001;

// Helper to broadcast unique filtered states to each player
const broadcastState = (roomId) => {
    const room = RoomManager.getRoom(roomId);
    if (!room) return;

    room.players.forEach(player => {
        const filteredState = room.getFilteredState(player.id);
        io.to(player.socketId).emit('room_update', filteredState);
    });
};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('create_room', () => {
        const roomId = RoomManager.createRoom();
        socket.join(roomId);
        socket.emit('room_created', { roomId });
    });

    socket.on('join_room', ({ roomId, playerName }) => {
        const player = { id: socket.id, name: playerName, socketId: socket.id };
        const initialJoin = RoomManager.joinRoom(roomId, player);

        if (initialJoin.error) {
            socket.emit('error', initialJoin.error);
        } else {
            socket.join(roomId);
            broadcastState(roomId);
            console.log(`${playerName} joined room ${roomId}`);
        }
    });

    socket.on('start_game', ({ roomId }) => {
        const gameState = RoomManager.getRoom(roomId);
        if (gameState) {
            gameState.nextPhase();
            broadcastState(roomId);
        }
    });

    socket.on('game_action', ({ roomId, actionType, targetId }) => {
        const room = RoomManager.getRoom(roomId);
        if (room) {
            room.handleAction(socket.id, actionType, targetId);
            // For voting, we can broadcast early to show current vote count
            if (room.phase === 'Day (Voting)') {
                broadcastState(roomId);
            }
        }
    });

    socket.on('send_message', ({ roomId, text, type = 'public' }) => {
        const room = RoomManager.getRoom(roomId);
        if (room) {
            const sender = room.players.find(p => p.id === socket.id);
            if (sender && sender.isAlive) {
                room.messages.push({
                    sender: sender.name,
                    text,
                    type,
                    senderId: socket.id
                });
                broadcastState(roomId);
            }
        }
    });

    socket.on('request_next_phase', ({ roomId }) => {
        const room = RoomManager.getRoom(roomId);
        if (room) {
            room.nextPhase();
            broadcastState(roomId);
        }
    });
});


server.listen(PORT, () => {
    console.log(`🚀 Omertà Protocol server running on port ${PORT}`);
});
