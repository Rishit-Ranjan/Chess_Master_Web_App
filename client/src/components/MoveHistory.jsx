import React, { useRef, useEffect } from 'react';

const MoveHistory = ({ moves }) => {
    const movesEndRef = useRef(null);

    const scrollToBottom = () => {
        movesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [moves]);

    return (
        <div className="mt-4 flex-grow flex flex-col bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-700/50 overflow-hidden shadow-lg h-full">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider p-4 border-b border-gray-700/50 bg-gray-800/30">
                Move History
            </h3>

            <div className="flex-grow overflow-y-auto p-2 custom-scrollbar">
                {moves.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm italic">
                        <span>No moves yet</span>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-800/50 sticky top-0">
                            <tr>
                                <th className="px-3 py-2 rounded-l-md">#</th>
                                <th className="px-3 py-2">White</th>
                                <th className="px-3 py-2 rounded-r-md">Black</th>
                            </tr>
                        </thead>
                        <tbody>
                            {moves.map((move, index) => {
                                if (index % 2 !== 0) return null; // Only render rows for white moves (and pair with black)
                                const moveNum = Math.floor(index / 2) + 1;
                                const whiteMove = move;
                                const blackMove = moves[index + 1] || '';

                                return (
                                    <tr key={moveNum} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                                        <td className="px-3 py-2 text-gray-500 font-mono text-xs">{moveNum}.</td>
                                        <td className="px-3 py-2 font-medium text-gray-200">{whiteMove}</td>
                                        <td className="px-3 py-2 font-medium text-gray-200">{blackMove}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                <div ref={movesEndRef} />
            </div>
        </div>
    );
};

export default MoveHistory;
