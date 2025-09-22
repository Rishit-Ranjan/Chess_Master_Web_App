import React from 'react';
const GameOverModal = ({ state, onNewGame, players }) => {
    let message = '';
    if (state.winner === 'draw') {
        message = 'The game is a draw.';
    }
    else {
        const winnerName = players ? players[state.winner].name : (state.winner === 'w' ? 'White' : 'Black');
        message = `${winnerName} wins!`;
    }
    return (<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl p-8 text-center max-w-sm mx-auto">
                <h2 className="text-3xl font-bold mb-4">Game Over</h2>
                <p className="text-lg mb-2">{message}</p>
                <p className="text-md text-gray-400 mb-6">({state.reason})</p>
                <button onClick={onNewGame} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors text-lg">
                    Play Again
                </button>
            </div>
        </div>);
};
export default GameOverModal;
