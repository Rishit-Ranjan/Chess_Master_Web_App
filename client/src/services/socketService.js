import { io } from 'socket.io-client';

let socket;

export const connectSocket = () => {
    if (!socket) {
        // Use environment variable or default to localhost:3001
        const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
        socket = io(URL);
    }
    return socket;
};

export const onSocket = (event, callback) => {
    if (!socket) return;
    socket.on(event, callback);
};

export const emitSocket = (event, data) => {
    if (!socket) return;
    socket.emit(event, data);
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const getSocketId = () => {
    return socket?.id;
};
