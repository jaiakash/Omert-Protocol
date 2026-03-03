import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const getSocketUrl = () => {
    if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
    if (typeof window !== 'undefined') {
        // If we're on Vite dev port, assume backend is on 3001
        if (window.location.port === '5173') return 'http://localhost:3001';
        return window.location.origin;
    }
    return 'http://localhost:3001';
};

const SOCKET_URL = getSocketUrl();

export const useSocket = (roomId, playerName, onRoomCreated) => {
    const [roomState, setRoomState] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);
    const onRoomCreatedRef = useRef(onRoomCreated);

    // Keep callback ref updated to avoid stale closures in socket listeners
    useEffect(() => {
        onRoomCreatedRef.current = onRoomCreated;
    }, [onRoomCreated]);

    useEffect(() => {
        socketRef.current = io(SOCKET_URL);

        socketRef.current.on('connect', () => {
            setIsConnected(true);
            console.log('✅ Connected to Game Server');
        });

        socketRef.current.on('room_created', ({ roomId }) => {
            console.log('📡 Room Created:', roomId);
            if (onRoomCreatedRef.current) onRoomCreatedRef.current(roomId);
        });

        socketRef.current.on('room_update', (state) => {
            setRoomState(state);
        });

        socketRef.current.on('connect_error', (err) => {
            console.error('❌ Socket Connection Error:', err.message);
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, []);

    // Sync effect: Join room when roomId or playerName becomes available
    useEffect(() => {
        if (socketRef.current && isConnected && roomId && playerName) {
            console.log(`🔗 Joining Room: ${roomId} as ${playerName}`);
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
