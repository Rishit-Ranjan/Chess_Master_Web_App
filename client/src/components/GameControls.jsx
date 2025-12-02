import React from 'react';

const GameControls = ({ onNewRound, onChangeSettings, onUndoMove, onResign, isUndoPossible, isGameOver, onToggleTheme }) => {
    const btnBase = "w-full py-2.5 px-4 rounded-lg font-bold text-sm transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={onUndoMove}
                    disabled={!isUndoPossible || isGameOver} // Ensure this is a boolean
                    className={`${btnBase} bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600`}
                >
                    Undo
                </button>
                <button
                    onClick={onResign}
                    disabled={isGameOver}
                    className={`${btnBase} bg-gradient-to-r from-red-900 to-red-700 hover:from-red-800 hover:to-red-600 text-red-100 border border-red-800`}
                >
                    Resign
                </button>
            </div>

            <button
                onClick={onNewRound}
                className={`${btnBase} bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/20`}
            >
                New Round
            </button>

            <button
                onClick={onChangeSettings}
                className={`${btnBase} bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-900/20`}
            >
                Settings
            </button>
            <button
                onClick={onToggleTheme}
                className={`${btnBase} bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600`}
            >
                Toggle Theme
            </button>
        </div>
    );
};

export default GameControls;
