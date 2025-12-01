import React from 'react';
const GameControls = ({ onNewRound, onChangeSettings, onUndoMove, onResign, isUndoPossible, isGameOver }) => {
    return (<div className="p-4 bg-gray-800 rounded-lg space-y-3">
             <button onClick={onUndoMove} disabled={!isUndoPossible || isGameOver} className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors">
                Undo Move
            </button>
            <button onClick={onResign} disabled={isGameOver} className="w-full bg-red-700 hover:bg-red-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors">
                Resign
            </button>
            <button onClick={onNewRound} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors">
                New Round
            </button>
             <button onClick={onChangeSettings} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors">
                Change Settings
            </button>
        </div>);
};
export default GameControls;
