import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { getLocalAiMove } from './services/localAiService';
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
    const attackers = [];
    const board = game.board();
    const targetRank = 8 - parseInt(targetSquare[1], 10);
    const targetFile = targetSquare.charCodeAt(0) - 'a'.charCodeAt(0);
    const isSquareOnBoard = (r, f) => r >= 0 && r < 8 && f >= 0 && f < 8;
    const toSquare = (r, f) => `${String.fromCharCode('a'.charCodeAt(0) + f)}${8 - r}`;
    // Check for sliding pieces (Rooks, Bishops, Queens)
    // FIX: Changed piece identifiers to match chess.js piece types ('r' for rook, 'b' for bishop) to fix a type mismatch error in the loop below.
    const directions = {
        r: [[-1, 0], [1, 0], [0, -1], [0, 1]],
        b: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
    };
    for (const pieceType of ['r', 'b']) {
        for (const [dr, df] of directions[pieceType]) {
            let r = targetRank + dr;
            let f = targetFile + df;
            while (isSquareOnBoard(r, f)) {
                const piece = board[r][f];
                if (piece) {
                    if (piece.color === attackingColor && (piece.type === pieceType || piece.type === 'q')) {
                        attackers.push(toSquare(r, f));
                    }
                    break;
                }
                r += dr;
                f += df;
            }
        }
    }
    // Check for Knights
    const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (const [dr, df] of knightMoves) {
        const r = targetRank + dr;
        const f = targetFile + df;
        if (isSquareOnBoard(r, f)) {
            const piece = board[r][f];
            if (piece && piece.color === attackingColor && piece.type === 'n') {
                attackers.push(toSquare(r, f));
            }
        }
    }
    // Check for Pawns
    const pawnAttackDir = attackingColor === 'w' ? 1 : -1;
    const pawnAttackOffsets = [[pawnAttackDir, -1], [pawnAttackDir, 1]];
    for (const [dr, df] of pawnAttackOffsets) {
        const r = targetRank + dr;
        const f = targetFile + df;
        if (isSquareOnBoard(r, f)) {
            const piece = board[r][f];
            if (piece && piece.color === attackingColor && piece.type === 'p') {
                attackers.push(toSquare(r, f));
            }
        }
    }
    // Check for King
    const kingMoves = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    for (const [dr, df] of kingMoves) {
        const r = targetRank + dr;
        const f = targetFile + df;
        if (isSquareOnBoard(r, f)) {
            const piece = board[r][f];
            if (piece && piece.color === attackingColor && piece.type === 'k') {
                attackers.push(toSquare(r, f));
            }
        }
    }
    return attackers;
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
    const [player1, setPlayer1] = useState(initialPlayer);
    const [player2, setPlayer2] = useState({ name: 'Player 2', avatar: P2_AVATAR_SVG, score: { wins: 0, losses: 0, draws: 0 } });
    const players = useMemo(() => ({
        w: playerColor === 'w' ? player1 : (gameMode === 'pva' ? player2 : player2),
        b: playerColor === 'b' ? player1 : (gameMode === 'pva' ? player2 : player2)
    }), [player1, player2, playerColor, gameMode]);
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
                    makeMove({ from: selectedSquare, to: square });
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
            makeMove({ ...promotionData, promotion: piece });
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
    };
    const handleGameStart = useCallback((mode, p1Name, p2NameStr, humanColor, diff) => {
        setGameMode(mode);
        setPlayerColor(humanColor);
        setDifficulty(diff);
        setPlayer1(p => ({ ...p, name: p1Name }));
        if (mode === 'pva') {
            const aiName = 'Local AI';
            setPlayer2({
                name: aiName,
                avatar: AI_AVATAR_SVG,
                score: { wins: 0, losses: 0, draws: 0 }
            });
        }
        else { // pvp
            setPlayer2({
                name: p2NameStr,
                avatar: P2_AVATAR_SVG,
                score: { wins: 0, losses: 0, draws: 0 }
            });
        }
        setInGame(true);
        handleNewRound();
    }, []);
    const handlePlayerNameChange = useCallback((newName) => {
        setPlayer1(p => ({ ...p, name: newName }));
    }, []);
    const handleAvatarChange = useCallback((newAvatar) => {
        setPlayer1(p => ({ ...p, avatar: newAvatar }));
    }, []);
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
        if (gameMode === 'pva' && game.turn() !== playerColor && !gameOverState && inGame) {
            makeAiMove();
        }
    }, [game, gameMode, playerColor, gameOverState, makeAiMove, inGame]);
    // Effect to check game status after every move
    useEffect(() => {
        if (inGame) {
            updateGameStatus();
        }
    }, [moveHistory, inGame, updateGameStatus]);
    if (!inGame) {
        return (<div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
                <GameSetup onGameStart={handleGameStart} playerProfile={player1} onPlayerNameChange={handlePlayerNameChange} onAvatarChange={handleAvatarChange}/>
            </div>);
    }
    return (<div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-2 sm:p-4">
             {gameOverState && <GameOverModal state={gameOverState} onNewGame={handleNewRound} players={players}/>}
             {promotionData && <PromotionModal color={game.turn()} onSelect={handlePromotionSelect}/>}
            <main className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-4">
                <div className="lg:w-1/4 flex flex-col gap-4 order-2 lg:order-1">
                    <PlayerInfo player={players.b} color="b" isTurn={game.turn() === 'b'}/>
                    <div className="flex-grow flex flex-col gap-4 p-4 bg-gray-800 rounded-lg">
                        <GameStatus turn={game.turn()} isCheck={game.inCheck()} isGameOver={!!gameOverState} players={players}/>
                        <GameControls onNewRound={handleNewRound} onChangeSettings={handleChangeSettings} onUndoMove={handleUndoMove} onResign={handleResign} isUndoPossible={moveHistory.length > 0} isGameOver={!!gameOverState}/>
                    </div>
                     <PlayerInfo player={players.w} color="w" isTurn={game.turn() === 'w'}/>
                </div>

                <div className="flex-grow flex justify-center items-center order-1 lg:order-2 relative">
                    {isAiThinking && (<div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-20 rounded-lg">
                           <div className="text-2xl font-bold animate-pulse">{player2.name} is thinking...</div>
                        </div>)}
                    <Chessboard board={game.board()} onSquareClick={handleSquareClick} selectedSquare={selectedSquare} possibleMoves={possibleMoves.map(m => m.to)} playerColor={gameMode === 'pvp' ? game.turn() : playerColor} lastMove={lastMove} checkmateHighlight={checkmateHighlight}/>
                </div>

                <div className="lg:w-1/4 flex flex-col p-4 bg-gray-800 rounded-lg order-3">
                    <MoveHistory moves={moveHistory}/>
                </div>
            </main>
        </div>);
};
export default App;
