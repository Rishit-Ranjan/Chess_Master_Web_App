import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
const { hash, compare } = bcrypt;
import dbPool from './db.js';
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
    const { name, password } = req.body;

    if (!name || !password) {
        return res.status(400).json({ message: 'Name and password are required.' });
    }

    try {
        const hashedPassword = await hash(password, 10);
        const [result] = await dbPool.execute(
            'INSERT INTO users (name, password_hash) VALUES (?, ?)',
            [name, hashedPassword]
        );
        res.status(201).json({ id: result.insertId, name });
    } catch (error) {
        console.error('Registration error:', error);
        // Check for duplicate entry
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Name already exists.' });
        }
        res.status(500).json({ message: 'Error registering new user.' });
    }
});

// Login an existing user
app.post('/api/users/login', async (req, res) => {
    const { name, password } = req.body;

    if (!name || !password) {
        return res.status(400).json({ message: 'Name and password are required.' });
    }

    try {
        // Find user by name
        const [users] = await dbPool.query('SELECT * FROM users WHERE name = ?', [name]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' }); // User not found
        }

        const user = users[0];

        // Compare password with the stored hash
        const isMatch = await compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' }); // Wrong password
        }

        // On success, return the user's profile (without the password hash)
        const userProfile = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            ranking: user.ranking,
            score: { wins: user.wins, losses: user.losses, draws: user.draws }
        };
        res.json(userProfile);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in.' });
    }
});

// Get user rankings (top 100 by score)
app.get('/api/users/ranking', async (req, res) => {
    try {
        const [users] = await dbPool.query(
            'SELECT id, name, avatar, ranking, wins, losses, draws FROM users ORDER BY wins DESC LIMIT 100'
        );
        res.json(users);
    } catch (error) {
        console.error('Error fetching rankings:', error);
        res.status(500).json({ message: 'Error fetching user rankings.' });
    }
});

// Get a single user's profile
app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [users] = await dbPool.query('SELECT id, name, avatar, ranking, wins, losses, draws FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        // Reformat score to match client structure
        const user = users[0];
        const userProfile = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            ranking: user.ranking,
            score: { wins: user.wins, losses: user.losses, draws: user.draws }
        };
        res.json(userProfile);
    } catch (error) {
        console.error(`Error fetching user ${id}:`, error);
        res.status(500).json({ message: 'Error fetching user profile.' });
    }
});

// Update a user's profile (name, avatar)
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, avatar } = req.body;

    if (!name && !avatar) {
        return res.status(400).json({ message: 'No update data provided (name or avatar).' });
    }

    // Build the query dynamically to update only the provided fields
    const fieldsToUpdate = [];
    const values = [];

    if (name) {
        fieldsToUpdate.push('name = ?');
        values.push(name);
    }
    if (avatar) {
        fieldsToUpdate.push('avatar = ?');
        values.push(avatar);
    }

    values.push(id); // Add the user ID for the WHERE clause

    const sql = `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

    try {
        await dbPool.execute(sql, values);
        res.json({ message: 'Profile updated successfully.' });
    } catch (error) {
        console.error(`Error updating user ${id}:`, error);
        res.status(500).json({ message: 'Error updating user profile.' });
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
    // Calculate ELO rating difference
    const calculateRatingDiff = (rating1, rating2) => {
        return Math.abs(rating1 - rating2);
    };

    socket.on('findMatch', async (player) => {
        console.log(`Player ${player.name} (ELO: ${player.ranking || 1200}) is looking for a match.`);
        
        // Use ELO rating (default 1200 if not set)
        const playerRating = player.ranking || 1200;
        
        // Try to find a suitable opponent with similar ELO (within 100 points)
        let opponentIndex = -1;
        let bestMatch = null;
        let minDiff = 100; // Maximum acceptable ELO difference

        for (let i = 0; i < matchmakingQueue.length; i++) {
            const queuedPlayer = matchmakingQueue[i].player;
            const queuedRating = queuedPlayer.ranking || 1200;
            const diff = calculateRatingDiff(playerRating, queuedRating);
            
            if (diff <= minDiff) {
                opponentIndex = i;
                minDiff = diff;
                break; // Take the first reasonable match
            }
        }

        if (opponentIndex !== -1) {
            // Match found!
            const opponent = matchmakingQueue.splice(opponentIndex, 1)[0];
            console.log(`Match found between ${player.name} (${playerRating}) and ${opponent.player.name} (${opponent.player.ranking || 1200}) - ELO diff: ${minDiff}`);

            const gameId = `game_${Math.random().toString(36).substr(2, 9)}`;
            const game = new Chess();

            // Randomly assign colors
            const players = Math.random() < 0.5
                ? { w: { id: socket.id, ...player, ranking: playerRating }, b: { id: opponent.socket.id, ...opponent.player } }
                : { w: { id: opponent.socket.id, ...opponent.player }, b: { id: socket.id, ...player, ranking: playerRating } };

            activeGames[gameId] = { game, players };

            // Store initial ratings for ELO calculation later
            activeGames[gameId].ratings = {
                w: players.w.ranking || 1200,
                b: players.b.ranking || 1200
            };

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
            matchmakingQueue.push({ socket, player, rating: playerRating });
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
            const loser = resigningPlayerColor;
            const reason = `${gameRoom.players[resigningPlayerColor].name} resigned.`;

            // Update scores in the database
            const winnerId = gameRoom.players[winner]?.dbId; // Assuming you store dbId on player object
            const loserId = gameRoom.players[loser]?.dbId;

            if (winnerId && loserId) {
                Promise.all([
                    dbPool.execute('UPDATE users SET wins = wins + 1 WHERE id = ?', [winnerId]),
                    dbPool.execute('UPDATE users SET losses = losses + 1 WHERE id = ?', [loserId]),
                    // Also update the game status in the 'games' table
                    // dbPool.execute('UPDATE games SET status = ?, winner_id = ? WHERE id = ?', ['completed', winnerId, gameId])
                ]).catch(err => {
                    console.error("Error updating scores on resignation:", err);
                });
            }

            // Notify both players in the room about the resignation
            io.to(gameId).emit('gameOver', { winner, reason });
            
            // It's better to clean up after a small delay to ensure messages are sent
            setTimeout(() => delete activeGames[gameId], 5000);
        }
    });

    // Player offers a draw
    socket.on('offerDraw', ({ gameId }) => {
        const gameRoom = activeGames[gameId];
        if (!gameRoom) return;
        
        const offeringPlayerColor = Object.keys(gameRoom.players).find(
            color => gameRoom.players[color] && gameRoom.players[color].id === socket.id
        );
        
        if (offeringPlayerColor) {
            // Notify the opponent about the draw offer
            socket.to(gameId).emit('drawOffered', { from: offeringPlayerColor });
            console.log(`Draw offer from ${gameRoom.players[offeringPlayerColor].name} in game ${gameId}`);
        }
    });

    // Player accepts a draw offer
    socket.on('acceptDraw', ({ gameId }) => {
        const gameRoom = activeGames[gameId];
        if (!gameRoom) return;
        
        // Notify both players that the draw was accepted
        io.to(gameId).emit('gameOver', { winner: 'draw', reason: 'Draw Accepted' });
        
        console.log(`Draw accepted in game ${gameId}`);
        
        // Clean up the game from memory
        setTimeout(() => delete activeGames[gameId], 5000);
    });

    // Listen for game over event from client to update scores
    socket.on('gameOver', async ({ gameId, winner, loser, outcome }) => {
        const gameRoom = activeGames[gameId];
        if (!gameRoom) return;

        const winnerId = gameRoom.players[winner]?.dbId;
        const loserId = gameRoom.players[loser]?.dbId;

        try {
            if (outcome === 'win' && winnerId && loserId) {
                console.log(`Updating scores for game ${gameId}: Winner ${winnerId}, Loser ${loserId}`);
                await Promise.all([
                    dbPool.execute('UPDATE users SET wins = wins + 1 WHERE id = ?', [winnerId]),
                    dbPool.execute('UPDATE users SET losses = losses + 1 WHERE id = ?', [loserId]),
                ]);
            } else if (outcome === 'draw' && winnerId && loserId) {
                console.log(`Updating scores for game ${gameId}: Draw between ${winnerId} and ${loserId}`);
                await Promise.all([
                    dbPool.execute('UPDATE users SET draws = draws + 1 WHERE id = ?', [winnerId]),
                    dbPool.execute('UPDATE users SET draws = draws + 1 WHERE id = ?', [loserId]),
                ]);
            }
            // Optionally update the 'games' table status
            // await dbPool.execute('UPDATE games SET status = ?, winner_id = ? WHERE id = ?', ['completed', winnerId, gameId]);

        } catch (error) {
            console.error('Error updating scores on game over:', error);
        }

        // Clean up the game from memory
        setTimeout(() => delete activeGames[gameId], 5000);
    });

socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Remove player from matchmaking queue if they disconnect
        const index = matchmakingQueue.findIndex(p => p.socket.id === socket.id);
        if (index !== -1) {
            matchmakingQueue.splice(index, 1);
            console.log(`Player ${socket.id} removed from queue due to disconnection.`);
        }
        
        // Handle disconnection during an active game - declare opponent the winner
        for (const [gameId, gameRoom] of Object.entries(activeGames)) {
            const disconnectedColor = Object.keys(gameRoom.players).find(
                color => gameRoom.players[color] && gameRoom.players[color].id === socket.id
            );
            
            if (disconnectedColor) {
                const winner = disconnectedColor === 'w' ? 'b' : 'w';
                const loser = disconnectedColor;
                const reason = `${gameRoom.players[disconnectedColor].name} disconnected.`;

                const winnerId = gameRoom.players[winner]?.dbId;
                const loserId = gameRoom.players[loser]?.dbId;

                // Update scores in the database
                if (winnerId && loserId) {
                    Promise.all([
                        dbPool.execute('UPDATE users SET wins = wins + 1 WHERE id = ?', [winnerId]),
                        dbPool.execute('UPDATE users SET losses = losses + 1 WHERE id = ?', [loserId]),
                    ]).catch(err => {
                        console.error("Error updating scores on disconnection:", err);
                    });
                }

                // Notify the remaining player about win by disconnection
                io.to(gameId).emit('gameOver', { winner, reason });
                
                // Clean up the game
                setTimeout(() => delete activeGames[gameId], 5000);
                break;
            }
        }
    });
});

// --- Server Start ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});