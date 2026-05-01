import { Chess } from 'chess.js';

const getPieceValue = (piece) => {
    if (!piece) return 0;
    switch (piece.type) {
        case 'p': return 1;
        case 'n': return 3;
        case 'b': return 3;
        case 'r': return 5;
        case 'q': return 9;
        default: return 0;
    }
};

// Helper: Check if a square is defended by the opponent
const isDefended = (game, square, byColor) => {
    const opponentColor = byColor === 'w' ? 'b' : 'w';
    const moves = game.moves({ verbose: true });
    // Find moves by opponent that attack this square
    return moves.some(m => m.color === opponentColor && m.to === square);
};

// Helper: Get all attacked squares by a color
const getAttackedSquares = (game, byColor) => {
    const moves = game.moves({ verbose: true });
    const attacked = new Set();
    for (const move of moves) {
        if (move.color === byColor) {
            attacked.add(move.to);
        }
    }
    return attacked;
};

/**
 * A local AI with varying difficulty.
 * Easy: Basic tactical awareness - captures hanging pieces, avoids bad trades
 * Medium: A balanced opponent that might make a good move or a random one.
 * Hard: A greedy opponent that prefers checkmates, then captures, then checks.
 */
const getLocalAiMove = (game, difficulty) => {
    const legalMoves = game.moves({ verbose: true });
    if (legalMoves.length === 0) {
        return null;
    }
    const aiColor = game.turn();
    
    // 1. Find any move that results in a checkmate (all difficulties)
    for (const move of legalMoves) {
        const gameCopy = new Chess(game.fen());
        gameCopy.move(move.san);
        if (gameCopy.isCheckmate()) {
            return move.san;
        }
    }
    
    if (difficulty === 'easy') {
        // Easy: Improved with basic tactical awareness
        const captureMoves = legalMoves.filter(m => m.flags.includes('c'));
        const opponentColor = aiColor === 'w' ? 'b' : 'w';
        
        // Try to capture hanging pieces (undefended pieces)
        for (const move of captureMoves) {
            const targetPiece = game.get(move.to);
            if (targetPiece && !isDefended(game, move.to, opponentColor)) {
                // Make sure we're not trading up (losing material)
                const captureValue = getPieceValue(targetPiece);
                const movingPiece = game.get(move.from);
                const moveValue = getPieceValue(movingPiece);
                if (captureValue >= moveValue) {
                    return move.san;
                }
            }
        }
        
        // Avoid moving into check
        const safeMoves = legalMoves.filter(move => {
            const gameCopy = new Chess(game.fen());
            gameCopy.move(move.san);
            return !gameCopy.inCheck();
        });
        
        if (safeMoves.length > 0) {
            // 30% chance to make a basic tactical move, 70% random
            const tacticalMoves = [...captureMoves];
            if (tacticalMoves.length > 0 && Math.random() < 0.3) {
                return tacticalMoves[Math.floor(Math.random() * tacticalMoves.length)].san;
            }
            return safeMoves[Math.floor(Math.random() * safeMoves.length)].san;
        }
        
        return legalMoves[Math.floor(Math.random() * legalMoves.length)].san;
    }
    
    const captureMoves = legalMoves.filter(m => m.flags.includes('c'));
    const checkMoves = legalMoves.filter(move => {
        const gameCopy = new Chess(game.fen());
        gameCopy.move(move.san);
        return gameCopy.inCheck();
    });
    
    if (difficulty === 'hard') {
        // Hard: Greedily prioritizes captures, then checks, then random moves.
        // Prioritize the highest value capture.
        if (captureMoves.length > 0) {
            let bestMove = null;
            let maxVal = -1;
            for (const move of captureMoves) {
                const val = getPieceValue(game.get(move.to));
                if (val > maxVal) {
                    maxVal = val;
                    bestMove = move;
                }
            }
            return bestMove.san;
        }
        if (checkMoves.length > 0) {
            return checkMoves[Math.floor(Math.random() * checkMoves.length)].san;
        }
    }
    
    if (difficulty === 'medium') {
        // Medium: 50% chance to make a "good" move (capture/check), 50% random.
        const goodMoves = [...captureMoves, ...checkMoves];
        if (goodMoves.length > 0 && Math.random() > 0.5) {
            return goodMoves[Math.floor(Math.random() * goodMoves.length)].san;
        }
    }
    
    // Fallback for Medium, or if Hard finds no better options
    const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    return randomMove.san;
};
export { getLocalAiMove };
