import React from 'react';

const GameStatus = ({ turn, isCheck, isGameOver, players }) => {
    const turnText = players
        ? `${players[turn].name}'s Turn`
        : (turn === 'w' ? "White's Turn" : "Black's Turn");

    return (
        <div className="text-center mb-2">
            <h2 className={`text-2xl font-extrabold tracking-tight ${isGameOver
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-600'
                    : 'text-gray-800 dark:text-white'
                }`}>
                {!isGameOver ? turnText : "Game Over"}
            </h2>

            {isCheck && !isGameOver && (
                <div className="mt-2 inline-block px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full">
                    <p className="text-red-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                        ⚠️ Check
                    </p>
                </div>
            )}

            {!isGameOver && !isCheck && (
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">
                    {turn === 'w' ? 'White to move' : 'Black to move'}
                </p>
            )}
        </div>
    );
};

export default GameStatus;
