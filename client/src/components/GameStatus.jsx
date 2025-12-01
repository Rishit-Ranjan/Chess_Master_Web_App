import React from 'react';
const GameStatus = ({ turn, isCheck, isGameOver, players }) => {
    const turnText = players ? `${players[turn].name}'s Turn` : (turn === 'w' ? "White's Turn" : "Black's Turn");
    return (<div className="text-center p-4 rounded-lg bg-gray-800 mb-2">
            <h2 className="text-xl font-bold">
                {!isGameOver ? turnText : "Game Over"}
            </h2>
            {isCheck && !isGameOver && (<p className="text-red-500 font-semibold animate-pulse mt-1">Check!</p>)}
        </div>);
};
export default GameStatus;
