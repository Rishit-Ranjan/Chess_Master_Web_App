import React from 'react';
import { pieceToSvg } from './Piece';

const PlayerInfo = ({ player, color, isTurn, capturedPieces = [] }) => {
    const colorName = color === 'w' ? 'White' : 'Black';
    // Use a gradient border for the active turn
    const activeClass = isTurn
        ? 'ring-2 ring-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] bg-gray-800/80'
        : 'border border-gray-700 bg-gray-900/50 opacity-80';

    return (
        <div className={`p-4 rounded-xl backdrop-blur-md transition-all duration-300 ${activeClass}`}>
            <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex-shrink-0 overflow-hidden border-2 ${isTurn ? 'border-indigo-400' : 'border-gray-600'} shadow-lg`}>
                    {player.avatar ? (
                        <img src={player.avatar} alt={`${player.name}'s avatar`} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                            <span className="text-2xl">👤</span>
                        </div>
                    )}
                </div>
                <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold truncate text-white tracking-wide">{player.name}</h3>
                        {isTurn && <span className="text-xs font-bold text-indigo-400 animate-pulse">PLAYING</span>}
                    </div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{colorName}</p>
                </div>
            </div>

            {/* Captured Pieces */}
            {capturedPieces.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1 bg-black/20 p-2 rounded-lg min-h-[32px]">
                    {capturedPieces.map((pieceKey, index) => (
                        <div key={index} className="w-6 h-6">
                            <img src={pieceToSvg[pieceKey]} alt={pieceKey} className="w-full h-full object-contain opacity-90" />
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-700/50">
                <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase">Wins</div>
                    <div className="font-bold text-green-400">{player.score?.wins ?? 0}</div>
                </div>
                <div className="text-center border-l border-gray-700/50">
                    <div className="text-xs text-gray-500 uppercase">Losses</div>
                    <div className="font-bold text-red-400">{player.score?.losses ?? 0}</div>
                </div>
                <div className="text-center border-l border-gray-700/50">
                    <div className="text-xs text-gray-500 uppercase">Draws</div>
                    <div className="font-bold text-gray-400">{player.score?.draws ?? 0}</div>
                </div>
            </div>
        </div>
    );
};

export default PlayerInfo;
