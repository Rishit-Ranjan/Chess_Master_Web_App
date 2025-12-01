import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { getLocalAiMove } from './services/localAiService';
//import { connectSocket, onSocket, emitSocket, disconnectSocket } from './services/socketService';
import Chessboard from './components/Chessboard';
import MoveHistory from './components/MoveHistory';
import GameControls from './components/GameControls';
import GameStatus from './components/GameStatus';
import GameOverModal from './components/GameOverModal';
import { GameSetup } from './components/GameSetup';
import PlayerInfo from './components/PlayerInfo';
import PromotionModal from './components/PromotionModal';
const PLAYER_PROFILE_KEY = 'gemini-chess-player-profile';
const initialPlayer = {
    name: 'Player 1',
    avatar: undefined,
    score: { wins: 0, losses: 0, draws: 0 },
};
// Default avatars for AI and Player 2
const AI_AVATAR_SVG = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect x="4" y="12" width="16" height="8" rx="2"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M12 12v4"/></svg>')}`;
const P2_AVATAR_SVG = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>')}`;
const findAttackingSquares = (game, targetSquare, attackingColor) => {
    // Refactor: Use chess.js's built-in functionality to simplify this.
    // The .isAttacked() method is not directly available, so we check moves.
    const attackers = [];
    const originalTurn = game.turn();
    // Temporarily switch turns to check for attacks from the "attackingColor"
    game.load(game.fen().replace(originalTurn === 'w' ? ' w ' : ' b ', attackingColor === 'w' ? ' w ' : ' b '));

    const moves = game.moves({ verbose: true });
    for (const move of moves) {
        if (move.to === targetSquare) {
            attackers.push(move.from);
        }
    }

    // Restore the original turn
    game.load(game.fen().replace(attackingColor === 'w' ? ' w ' : ' b ', originalTurn === 'w' ? ' w ' : ' b '));
    return [...new Set(attackers)]; // Use Set to remove duplicates
};
const getCheckmateHighlightData = (game) => {
    if (!game.isCheckmate())
        return null;
    const matedColor = game.turn();
    const attackingColor = matedColor === 'w' ? 'b' : 'w';
    let kingSquare = null;
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const piece = game.board()[r][f];
            if (piece && piece.type === 'k' && piece.color === matedColor) {
                kingSquare = `${String.fromCharCode('a'.charCodeAt(0) + f)}${8 - r}`;
                break;
            }
        }
        if (kingSquare)
            break;
    }
    if (!kingSquare)
        return null;
    const attackers = findAttackingSquares(game, kingSquare, attackingColor);
    return { king: kingSquare, attackers };
};
// FIX: Completed the App component, which was previously truncated. This involved:
// 1. Finishing the `updateGameStatus` function to correctly identify all draw conditions.
// 2. Adding game logic handlers for player moves, AI turns, promotions, and game controls (new round, resign, undo).
// 3. Implementing the main JSX return value, which renders the game setup screen or the main chessboard view.
// 4. Adding `export default App;` to resolve the import error in `index.tsx`.
const App = () => {
    const [game, setGame] = useState(new Chess());
    const [gameMode, setGameMode] = useState('pva');
    const [difficulty, setDifficulty] = useState('medium');
    const [playerColor, setPlayerColor] = useState('w'); // Human player's color in PvA
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [possibleMoves, setPossibleMoves] = useState([]);
    const [moveHistory, setMoveHistory] = useState([]);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [gameOverState, setGameOverState] = useState(null);
    const [promotionData, setPromotionData] = useState(null);
    const [isResigned, setIsResigned] = useState(false);
    const [checkmateHighlight, setCheckmateHighlight] = useState(null);
    const [lastMove, setLastMove] = useState(null);
    const [inGame, setInGame] = useState(false);
    // Player profiles
    const [isSearching, setIsSearching] = useState(false);
    const [player1, setPlayer1] = useState(initialPlayer);
    const [player2, setPlayer2] = useState({ name: 'Player 2', avatar: P2_AVATAR_SVG, score: { wins: 0, losses: 0, draws: 0 } });
    const players = useMemo(() => {
        // For online games, player data comes from the server
        if (gameMode === 'pvo') {
            return { w: player1, b: player2 };
        }
        return {
            w: playerColor === 'w' ? player1 : player2,
            b: playerColor === 'b' ? player1 : player2
        };
    }, [player1, player2, playerColor, gameMode]);
    const savePlayerProfile = useCallback((profile) => {
        try {
            localStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(profile));
        }
        catch (error) {
            console.error("Failed to save player profile:", error);
        }
    }, []);
    const updateGameStatus = useCallback(() => {
        if (isResigned)
            return;
        let reason = '';
        let winner = null;
        if (game.isCheckmate()) {
            reason = 'Checkmate';
            winner = game.turn() === 'w' ? 'b' : 'w';
        }
        else if (game.isStalemate()) {
            reason = 'Stalemate';
            winner = 'draw';
        }
        else if (game.isThreefoldRepetition()) {
            reason = 'Threefold Repetition';
            winner = 'draw';
        }
        else if (game.isInsufficientMaterial()) {
            reason = 'Insufficient Material';
            winner = 'draw';
        }
        else if (game.isDraw()) {
            reason = '50-move rule';
            winner = 'draw';
        }
        if (winner !== null) {
            setGameOverState({ reason, winner });
            setCheckmateHighlight(getCheckmateHighlightData(game));
            // Update scores
            const updatePlayerScore = (player, result) => ({
                ...player,
                score: {
                    ...player.score,
                    wins: player.score.wins + (result === 'win' ? 1 : 0),
                    losses: player.score.losses + (result === 'loss' ? 1 : 0),
                    draws: player.score.draws + (result === 'draw' ? 1 : 0),
                }
            });
            const p1Result = winner === 'draw' ? 'draw' : (players[winner] === player1 ? 'win' : 'loss');
            if (p1Result === 'win') {
                setPlayer1(p => updatePlayerScore(p, 'win'));
                setPlayer2(p => updatePlayerScore(p, 'loss'));
            }
            else if (p1Result === 'loss') {
                setPlayer1(p => updatePlayerScore(p, 'loss'));
                setPlayer2(p => updatePlayerScore(p, 'win'));
            }
            else { // draw
                setPlayer1(p => updatePlayerScore(p, 'draw'));
                setPlayer2(p => updatePlayerScore(p, 'draw'));
            }
        }
    }, [game, isResigned, player1, players]);
    const makeMove = useCallback((move) => {
        try {
            // Create a new game instance from PGN to preserve history for undo
            const newGame = new Chess();
            newGame.loadPgn(game.pgn());
            const result = newGame.move(move);
            if (result) {
                setGame(newGame);
                setMoveHistory(newGame.history());
                setLastMove({ from: result.from, to: result.to });
                setSelectedSquare(null);
                setPossibleMoves([]);
                return true;
            }
        }
        catch (e) {
            console.warn("Invalid move:", move, e);
        }
        return false;
    }, [game]);
    const makeAiMove = useCallback(async () => {
        if (gameOverState)
            return;
        setIsAiThinking(true);
        try {
            // Use a slight delay for local AI to feel more natural
            await new Promise(resolve => setTimeout(resolve, 500));
            const move = getLocalAiMove(game, difficulty);
            if (move) {
                makeMove(move);
            }
            else {
                console.error("AI failed to provide a move.");
            }
        }
        catch (error) {
            console.error("Error during AI move:", error);
            alert("The AI failed to make a move. Please try again.");
        }
        finally {
            setIsAiThinking(false);
        }
    }, [game, difficulty, gameOverState, makeMove]);
    const handleSquareClick = (square) => {
        if (gameOverState || isAiThinking)
            return;
        // Check if it's the human player's turn
        if (gameMode === 'pvo' && game.turn() !== playerColor) {
            console.log("Not your turn!");
            return;
        }
        if (gameMode === 'pva' && game.turn() !== playerColor)
            return;
        if (selectedSquare) {
            // Check if the clicked square is a possible move
            const move = possibleMoves.find(m => m.to === square);
            if (move) {
                // Check for promotion
                if (move.flags.includes('p') && ((move.color === 'w' && square[1] === '8') || (move.color === 'b' && square[1] === '1'))) {
                    setPromotionData({ from: move.from, to: move.to });
                }
                else {
                    const moveData = { from: selectedSquare, to: square };
                    if (gameMode === 'pvo') {
                        emitSocket('makeMove', { gameId: onlineGameId, move: moveData });
                    }
                    // The move is made locally for visual feedback, server confirms
                    makeMove(moveData);
                }
            }
            else {
                // If clicked square is not a possible move, select it if it's the player's piece
                const piece = game.get(square);
                if (piece && piece.color === game.turn()) {
                    setSelectedSquare(square);
                    setPossibleMoves(game.moves({ square: square, verbose: true }));
                }
                else {
                    setSelectedSquare(null);
                    setPossibleMoves([]);
                }
            }
        }
        else {
            // If no square is selected, select the clicked square if it contains a piece of the current turn's color
            const piece = game.get(square);
            if (piece && piece.color === game.turn()) {
                setSelectedSquare(square);
                setPossibleMoves(game.moves({ square: square, verbose: true }));
            }
        }
    };
    const handlePromotionSelect = (piece) => {
        if (promotionData) {
            const moveData = { ...promotionData, promotion: piece };
            if (gameMode === 'pvo') {
                emitSocket('makeMove', { gameId: onlineGameId, move: moveData });
            }
            // The move is made locally for visual feedback, server confirms
            makeMove(moveData);
            setPromotionData(null);
        }
    };
    const handleNewRound = () => {
        const newGame = new Chess();
        setGame(newGame);
        setMoveHistory([]);
        setSelectedSquare(null);
        setPossibleMoves([]);
        setGameOverState(null);
        setLastMove(null);
        setCheckmateHighlight(null);
        setIsResigned(false);
    };
    const handleUndoMove = () => {
        if (gameOverState || moveHistory.length === 0)
            return;
        const newGame = new Chess();
        const history = game.history({ verbose: true });
        // In PvP, undo one move (a half-turn). In PvA, undo a full turn (player's move + AI's response).
        const movesToUndo = (gameMode === 'pva') ? 2 : 1;
        // We can't undo more moves than have been made. This handles the opening move by the AI.
        const actualMovesToUndo = Math.min(movesToUndo, history.length);
        if (actualMovesToUndo === 0)
            return;
        const movesToKeep = history.slice(0, history.length - actualMovesToUndo);
        movesToKeep.forEach(move => newGame.move(move.san));
        setGame(newGame);
        setMoveHistory(newGame.history());
        const lastAction = newGame.history({ verbose: true }).slice(-1)[0];
        setLastMove(lastAction ? { from: lastAction.from, to: lastAction.to } : null);
        setGameOverState(null);
        setCheckmateHighlight(null);
        setSelectedSquare(null);
        setPossibleMoves([]);
    };
    const handleResign = () => {
        if (gameOverState)
            return;
        const winner = game.turn() === 'w' ? 'b' : 'w';
        const reason = `${players[game.turn()].name} resigned.`;
        setGameOverState({ reason, winner });
        setIsResigned(true);
    };
    const handleChangeSettings = () => {
        setInGame(false);
        handleNewRound(); // Reset game state when going back to settings
        // If we were searching for a match, cancel it
        if (isSearching) {
            emitSocket('cancelFindMatch');
            setIsSearching(false);
        }
    };

    const handlePlayerNameChange = useCallback((newName) => {
        setPlayer1(p => ({ ...p, name: newName }));
    }, []);
    const handleAvatarChange = useCallback((newAvatar) => {
        setPlayer1(p => ({ ...p, avatar: newAvatar }));
    }, []);

    // --- Online Game State ---
    const [onlineGameId, setOnlineGameId] = useState(null);
    const [createdGameId, setCreatedGameId] = useState(null); // For PVF creator

    // Effect to load player profile on mount
    useEffect(() => {
        try {
            const savedProfile = localStorage.getItem(PLAYER_PROFILE_KEY);
            if (savedProfile) {
                const parsed = JSON.parse(savedProfile);
                if (parsed.name && parsed.score && parsed.avatar) {
                    setPlayer1({ ...initialPlayer, ...parsed });
                }
            }
        }
        catch (error) {
            console.error("Failed to load player profile:", error);
        }
    }, []);
    // Effect to save profile whenever it changes
    useEffect(() => {
        savePlayerProfile(player1);
    }, [player1, savePlayerProfile]);
    // Effect to trigger AI move
    useEffect(() => {
        if (inGame && gameMode === 'pva' && game.turn() !== playerColor && !gameOverState) {
            makeAiMove();
        }
    }, [game, gameMode, playerColor, gameOverState, makeAiMove, inGame]);

    // Effect for Socket.IO connection and listeners
    useEffect(() => {
        if (inGame && (gameMode === 'pvo' || gameMode === 'pvf')) {
            // This effect now only runs when we are IN an online game, not during setup/search
            const setupSocketListeners = () => {
                onSocket('gameStart', ({ fen, players: serverPlayers }) => {
                    const newGame = new Chess(fen);
                    setGame(newGame);
                    // Set player info based on what the server assigned
                    // Use a callback for setPlayerColor to get the latest value
                    setPlayerColor(prevColor => {
                        setPlayer1(serverPlayers[prevColor]);
                        setPlayer2(serverPlayers[prevColor === 'w' ? 'b' : 'w']);
                        return prevColor;
                    });
                });

                onSocket('matchFound', ({ gameId, fen, players: serverPlayers }) => {
                    setIsSearching(false);
                    setOnlineGameId(gameId);
                    const newGame = new Chess(fen);
                    setGame(newGame);
                    setInGame(true);
                    setPlayerColor(prevColor => {
                        setPlayer1(serverPlayers[prevColor]);
                        setPlayer2(serverPlayers[prevColor === 'w' ? 'b' : 'w']);
                        return prevColor;
                    });
                });

                onSocket('moveMade', ({ move, fen }) => {
                    // A move was made by the opponent, update our game state
                    const newGame = new Chess(fen);
                    setGame(newGame);
                    setMoveHistory(newGame.history());
                    setLastMove({ from: move.from, to: move.to });
                });

                onSocket('error', (message) => {
                    alert(`Error: ${message}`);
                    // If game not found or full, go back to setup
                    if (message === 'Game not found.' || message === 'Game is full.') {
                        setInGame(false);
                        setCreatedGameId(null);
                    }
                });
            };

            connectSocket();
            setupSocketListeners();

            return () => disconnectSocket(); // Cleanup on component unmount or when dependencies change
        }
    }, [inGame, gameMode]);

    // Effect for matchmaking/game creation listeners, runs outside of the game itself
    useEffect(() => {
        if ((gameMode === 'pvo' || gameMode === 'pvf') && !inGame) {
            const setupMatchmakingListeners = () => {
                onSocket('searchingForMatch', () => {
                    setIsSearching(true);
                });

                onSocket('matchFound', ({ gameId, fen, players: serverPlayers }) => {
                    setIsSearching(false);
                    setOnlineGameId(gameId);
                    const newGame = new Chess(fen);
                    setGame(newGame);
                    setInGame(true); // This will trigger the game screen to show
                    // Figure out our color
                    const myColor = Object.keys(serverPlayers).find(c => serverPlayers[c].name === player1.name) || 'w';
                    setPlayerColor(myColor);
                    setPlayer1(serverPlayers[myColor]);
                    setPlayer2(serverPlayers[myColor === 'w' ? 'b' : 'w']);
                });

                // PVF Listeners
                onSocket('gameCreated', ({ gameId }) => {
                    setCreatedGameId(gameId);
                    setOnlineGameId(gameId);
                });

                onSocket('joinedGame', ({ gameId, color, fen }) => {
                    setOnlineGameId(gameId);
                    setPlayerColor(color);
                    const newGame = new Chess(fen);
                    setGame(newGame);
                    setInGame(true);
                    setCreatedGameId(null); // Clear waiting screen if we were creator (though creator gets gameStart usually)
                });

                // For the creator, gameStart will trigger the transition
                onSocket('gameStart', ({ fen, players: serverPlayers }) => {
                    setCreatedGameId(null); // Stop showing waiting screen
                    setInGame(true);
                    const newGame = new Chess(fen);
                    setGame(newGame);
                    // Figure out our color
                    const myColor = Object.keys(serverPlayers).find(c => serverPlayers[c].name === player1.name) || 'w';
                    setPlayerColor(myColor);
                    setPlayer1(serverPlayers[myColor]);
                    setPlayer2(serverPlayers[myColor === 'w' ? 'b' : 'w']);
                });
            };
            connectSocket();
            setupMatchmakingListeners();
        }
    }, [gameMode, inGame, player1.name]);

    // Effect to check game status after every move
    useEffect(() => {
        // For online games, the server is the source of truth for game over,
        // but we can still check for local display purposes.
        if (inGame) {
            updateGameStatus();
        }
    }, [moveHistory, inGame, updateGameStatus]);

    const handleGameStart = useCallback((mode, p1Name, p2NameStr, humanColor, diff, pvfData) => {
        setGameMode(mode);
        setPlayerColor(humanColor);
        setDifficulty(diff);
        setPlayer1(p => ({ ...p, name: p1Name }));

        if (mode === 'pva') {
            const aiName = 'Local AI';
            setInGame(true);
            handleNewRound();
            setPlayer2({
                name: aiName,
                avatar: AI_AVATAR_SVG,
                score: { wins: 0, losses: 0, draws: 0 }
            });
        }
        else if (mode === 'pvo') {
            // For online, we don't start the game here. We start searching.
            emitSocket('findMatch', { name: p1Name, avatar: player1.avatar, score: player1.score });
            setPlayer2({
                name: p2NameStr,
                avatar: P2_AVATAR_SVG,
                score: { wins: 0, losses: 0, draws: 0 }
            });
        } else if (mode === 'pvf') {
            // Play with Friend
            if (pvfData.subMode === 'create') {
                emitSocket('createGame', { name: p1Name, avatar: player1.avatar, score: player1.score });
            } else {
                emitSocket('joinGame', { gameId: pvfData.joinGameId, player: { name: p1Name, avatar: player1.avatar, score: player1.score } });
            }
            setPlayer2({
                name: 'Opponent', // Will be updated when game starts
                avatar: P2_AVATAR_SVG,
                score: { wins: 0, losses: 0, draws: 0 }
            });
        }
    }, [handleNewRound, player1.avatar, player1.score]);

    if (isSearching) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
                <div className="text-2xl font-bold animate-pulse">Searching for opponent...</div>
                <button
                    onClick={handleChangeSettings}
                    className="mt-8 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                    Cancel
                </button>
            </div>
        );
    }

    if (createdGameId) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
                <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl text-center max-w-md w-full border border-gray-700">
                    <h2 className="text-3xl font-bold mb-2 text-indigo-400">Waiting for Friend</h2>
                    <p className="text-gray-400 mb-6">Share this code with your friend to play</p>

                    <div className="bg-gray-900 p-4 rounded-xl border border-gray-600 mb-6 flex items-center justify-between group relative">
                        <code className="text-3xl font-mono tracking-wider text-white w-full">{createdGameId}</code>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl cursor-pointer"
                            onClick={() => navigator.clipboard.writeText(createdGameId)}>
                            <span className="text-sm font-bold">Click to Copy</span>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>

                    <button
                        onClick={() => { setCreatedGameId(null); setGameMode('pva'); }} // Simple cancel for now
                        className="mt-8 text-gray-500 hover:text-white text-sm underline">
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    if (!inGame && !isSearching) {
        return (
            <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#0a0a0a] to-black text-white flex flex-col items-center justify-center p-4">
                <GameSetup onGameStart={handleGameStart} playerProfile={player1} onPlayerNameChange={handlePlayerNameChange} onAvatarChange={handleAvatarChange} />
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#0a0a0a] to-black text-white flex flex-col items-center justify-center p-2 sm:p-4 font-sans">
            {gameOverState && <GameOverModal state={gameOverState} onNewGame={handleNewRound} players={players} />}
            {promotionData && <PromotionModal color={game.turn()} onSelect={handlePromotionSelect} />}

            <main className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
                {/* Left Panel: Player Info & Controls */}
                <div className="lg:w-1/4 flex flex-col gap-4 order-2 lg:order-1">
                    <PlayerInfo player={players.b} color="b" isTurn={game.turn() === 'b'} />

                    <div className="flex-grow flex flex-col gap-4 p-5 bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl">
                        <GameStatus turn={game.turn()} isCheck={game.inCheck()} isGameOver={!!gameOverState} players={players} />
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-2"></div>
                        <GameControls onNewRound={handleNewRound} onChangeSettings={handleChangeSettings} onUndoMove={handleUndoMove} onResign={handleResign} isUndoPossible={moveHistory.length > 0} isGameOver={!!gameOverState} />
                    </div>

                    <PlayerInfo player={players.w} color="w" isTurn={game.turn() === 'w'} />
                </div>

                {/* Center: Chessboard */}
                <div className="flex-grow flex justify-center items-center order-1 lg:order-2 relative">
                    {isAiThinking && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-lg">
                            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 animate-pulse">
                                {player2.name} is thinking...
                            </div>
                        </div>
                    )}
                    <div className="p-1 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 shadow-2xl">
                        <Chessboard board={game.board()} onSquareClick={handleSquareClick} selectedSquare={selectedSquare} possibleMoves={possibleMoves.map(m => m.to)} playerColor={gameMode === 'pvp' ? game.turn() : playerColor} lastMove={lastMove} checkmateHighlight={checkmateHighlight} />
                    </div>
                </div>

                {/* Right Panel: History */}
                <div className="lg:w-1/4 flex flex-col order-3 h-[600px] lg:h-auto">
                    <MoveHistory moves={moveHistory} />
                </div>
            </main>
        </div>
    );
};
export default App;
