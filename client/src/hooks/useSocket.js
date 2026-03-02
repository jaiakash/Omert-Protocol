import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

export const useSocket = (roomId, playerName, onRoomCreated) => {
    const [roomState, setRoomState] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        socketRef.current = io(SOCKET_URL);

        socketRef.current.on('connect', () => {
            setIsConnected(true);
        });

        socketRef.current.on('room_created', ({ roomId }) => {
            if (onRoomCreated) onRoomCreated(roomId);
        });

        socketRef.current.on('room_update', (state) => {
            setRoomState(state);
        });

        socketRef.current.on('game_started', (state) => {
            setRoomState(state);
        });

        socketRef.current.on('phase_change', (state) => {
            setRoomState(state);
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, []);

    // Sync effect: Join room when roomId or playerName becomes available
    useEffect(() => {
        if (socketRef.current && isConnected && roomId && playerName) {
            socketRef.current.emit('join_room', { roomId, playerName });
        }
    }, [roomId, playerName, isConnected]);

    const createRoom = () => {
        socketRef.current.emit('create_room');
    };

    const startGame = (rid) => {
        socketRef.current.emit('start_game', { roomId: rid });
    };

    const nextPhase = (rid) => {
        socketRef.current.emit('request_next_phase', { roomId: rid });
    };

    const sendAction = (rid, type, target) => {
        socketRef.current.emit('game_action', { roomId: rid, actionType: type, targetId: target });
    };

    const sendMessage = (rid, text, type = 'public') => {
        socketRef.current.emit('send_message', { roomId: rid, text, type });
    };

    return { socket: socketRef.current, roomState, isConnected, createRoom, startGame, nextPhase, sendAction, sendMessage };
};
