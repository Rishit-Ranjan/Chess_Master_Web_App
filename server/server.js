import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
const { hash } = bcrypt;
import db from './db.js';
const { execute, query } = db;
import { resolve, dirname } from 'path';
import { createServer } from 'http';
import { Server } from "socket.io";
import { Chess } from 'chess.js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity. For production, restrict this to your frontend's URL.
        methods: ["GET", "POST"]
    }
});

app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // for parsing application/json

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
const matchmakingQueue = []; // In-memory queue for players seeking a match

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // --- Private Games (via Game ID) ---
    // Player creates a new game
    socket.on('createGame', (player) => {
        const gameId = `game_${Math.random().toString(36).substr(2, 9)}`;
        const game = new Chess();

        // Randomly assign creator to white or black
        const creatorColor = Math.random() < 0.5 ? 'w' : 'b';
        const players = {
            w: creatorColor === 'w' ? { id: socket.id, ...player } : null,
            b: creatorColor === 'b' ? { id: socket.id, ...player } : null
        };

        activeGames[gameId] = {
            game,
            players,
            creator: socket.id,
        };

        socket.join(gameId);
        console.log(`Game created with ID: ${gameId} by ${socket.id} (Color: ${creatorColor})`);
        socket.emit('gameCreated', { gameId, color: creatorColor });
    });

    // Player joins an existing game
    socket.on('joinGame', ({ gameId, player }) => {
        const gameRoom = activeGames[gameId];
        if (!gameRoom) {
            return socket.emit('error', 'Game not found.');
        }

        // Check if game is already full
        if (gameRoom.players.w && gameRoom.players.b) {
            return socket.emit('error', 'Game is full.');
        }

        // Assign player to the empty color
        let color;
        if (!gameRoom.players.w) {
            color = 'w';
            gameRoom.players.w = { id: socket.id, ...player };
        } else {
            color = 'b';
            gameRoom.players.b = { id: socket.id, ...player };
        }

        socket.join(gameId);
        console.log(`Player ${socket.id} joined game ${gameId} as ${color}`);

        // Notify the joiner
        socket.emit('joinedGame', { gameId, color, fen: gameRoom.game.fen() });

        // Start the game immediately since we now have both players
        io.to(gameId).emit('gameStart', { fen: gameRoom.game.fen(), players: gameRoom.players });
    });

    // --- Ranked Matchmaking ---
    socket.on('findMatch', (player) => {
        console.log(`Player ${player.name} (score: ${player.score.wins}) is looking for a match.`);
        // For simplicity, we'll use wins as the score. In a real app, this would be a more complex ELO rating.
        const playerScore = player.score?.wins ?? 0;

        // Find a suitable opponent
        const opponentIndex = matchmakingQueue.findIndex(
            p => Math.abs(p.player.score.wins - playerScore) <= 200 // Match within 200 points
        );

        if (opponentIndex !== -1) {
            // Match found!
            const opponent = matchmakingQueue.splice(opponentIndex, 1)[0];
            console.log(`Match found between ${player.name} and ${opponent.player.name}`);

            const gameId = `game_${Math.random().toString(36).substr(2, 9)}`;
            const game = new Chess();

            // Randomly assign colors
            const players = Math.random() < 0.5
                ? { w: { id: socket.id, ...player }, b: { id: opponent.socket.id, ...opponent.player } }
                : { w: { id: opponent.socket.id, ...opponent.player }, b: { id: socket.id, ...player } };

            activeGames[gameId] = { game, players };

            // Join both players to the new game room
            socket.join(gameId);
            opponent.socket.join(gameId);

            // Notify both players that a match was found
            io.to(gameId).emit('matchFound', {
                gameId,
                fen: game.fen(),
                players
            });

        } else {
            // No suitable opponent found, add player to the queue
            console.log(`${player.name} added to matchmaking queue.`);
            matchmakingQueue.push({ socket, player });
            socket.emit('searchingForMatch');
        }
    });

    socket.on('cancelFindMatch', () => {
        const index = matchmakingQueue.findIndex(p => p.socket.id === socket.id);
        if (index !== -1) {
            matchmakingQueue.splice(index, 1);
            console.log(`Player ${socket.id} removed from matchmaking queue.`);
            socket.emit('matchmakingCancelled');
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
        // Remove player from matchmaking queue if they disconnect
        const index = matchmakingQueue.findIndex(p => p.socket.id === socket.id);
        if (index !== -1) {
            matchmakingQueue.splice(index, 1);
            console.log(`Player ${socket.id} removed from queue due to disconnection.`);
        }
        // TODO: Handle disconnection during an active game (e.g., declare opponent the winner)
    });
});

// --- Server Start ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});