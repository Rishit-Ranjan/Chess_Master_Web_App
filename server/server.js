import express, { json } from 'express';
import cors from 'cors';
import { hash } from 'bcryptjs';
import { execute, query } from './db';
import { resolve } from 'path';
import { createServer } from 'http';
import { Server } from "socket.io";
import { Chess } from 'chess.js';
require('dotenv').config({ path: resolve(__dirname, '../.env') });

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity. For production, restrict this to your frontend's URL.
        methods: ["GET", "POST"]
    }
});

app.use(cors()); // Allow cross-origin requests
app.use(json()); // for parsing application/json

// --- API Endpoints ---

// Register a new user
app.post('/api/users/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    try {
        const hashedPassword = await hash(password, 10);
        const [result] = await execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        res.status(201).json({ id: result.insertId, username, email });
    } catch (error) {
        console.error('Registration error:', error);
        // Check for duplicate entry
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Username or email already exists.' });
        }
        res.status(500).json({ message: 'Error registering new user.' });
    }
});

// Get user rankings (top 100 by score)
app.get('/api/users/ranking', async (req, res) => {
    try {
        const [users] = await query(
            'SELECT id, username, score FROM users ORDER BY score DESC LIMIT 100'
        );
        res.json(users);
    } catch (error) {
        console.error('Error fetching rankings:', error);
        res.status(500).json({ message: 'Error fetching user rankings.' });
    }
});

// --- Socket.IO Real-time Logic ---

const activeGames = {}; // In-memory store for active games

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Player creates a new game
    socket.on('createGame', (player) => {
        const gameId = `game_${Math.random().toString(36).substr(2, 9)}`;
        const game = new Chess();
        activeGames[gameId] = {
            game,
            players: { w: null, b: null },
            creator: socket.id,
        };
        console.log(`Game created with ID: ${gameId} by ${socket.id}`);
        socket.emit('gameCreated', { gameId });
    });

    // Player joins an existing game
    socket.on('joinGame', ({ gameId, player }) => {
        if (!activeGames[gameId]) {
            return socket.emit('error', 'Game not found.');
        }
        const gameRoom = activeGames[gameId];

        // Assign player to a color
        let color;
        if (gameRoom.players.w === null) {
            color = 'w';
            gameRoom.players.w = { id: socket.id, ...player };
        } else if (gameRoom.players.b === null) {
            color = 'b';
            gameRoom.players.b = { id: socket.id, ...player };
        } else {
            return socket.emit('error', 'Game is full.');
        }

        socket.join(gameId);
        socket.emit('joinedGame', { gameId, color, fen: gameRoom.game.fen() });

        // If both players have joined, start the game
        if (gameRoom.players.w && gameRoom.players.b) {
            io.to(gameId).emit('gameStart', { fen: gameRoom.game.fen(), players: gameRoom.players });
        }
    });

    // Player makes a move
    socket.on('makeMove', ({ gameId, move }) => {
        const gameRoom = activeGames[gameId];
        if (!gameRoom) return socket.emit('error', 'Game not found.');

        const result = gameRoom.game.move(move);
        if (result) {
            // Broadcast the move to the other player in the room
            socket.to(gameId).emit('moveMade', { move, fen: gameRoom.game.fen() });
        } else {
            socket.emit('error', 'Invalid move.');
        }
    });

    // Player resigns from the game
    socket.on('resign', ({ gameId }) => {
        const gameRoom = activeGames[gameId];
        if (!gameRoom) return;

        const resigningPlayerColor = Object.keys(gameRoom.players).find(
            color => gameRoom.players[color] && gameRoom.players[color].id === socket.id
        );

        if (resigningPlayerColor) {
            const winner = resigningPlayerColor === 'w' ? 'b' : 'w';
            const reason = `${gameRoom.players[resigningPlayerColor].name} resigned.`;
            // Notify both players in the room about the resignation
            io.to(gameId).emit('gameOver', { winner, reason });
            delete activeGames[gameId]; // Clean up the game
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Here you could add logic to handle player disconnection during a game
    });
});

// --- Server Start ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});