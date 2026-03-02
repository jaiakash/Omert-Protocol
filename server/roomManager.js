/**
 * Omertà Protocol - Room Manager
 * A helper to keep track of active games and rooms.
 */

const { GameState } = require('./gameLogic');

class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomId -> GameState instance
    }

    createRoom() {
        const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        this.rooms.set(roomId, new GameState(roomId));
        return roomId;
    }

    joinRoom(roomId, player) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };

        const added = room.addPlayer(player.id, player.name, player.socketId);
        if (!added) return { error: 'Room is full or already started' };

        return { success: true };
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    removeRoom(roomId) {
        this.rooms.delete(roomId);
    }
}

module.exports = new RoomManager();
