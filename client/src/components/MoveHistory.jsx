import React, { useRef, useEffect } from 'react';
const MoveHistory = ({ moves }) => {
    const movesEndRef = useRef(null);
    const scrollToBottom = () => {
        movesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [moves]);
    return (<div className="mt-4 flex-grow flex flex-col">
            <h3 className="text-lg font-semibold mb-2 text-gray-300 border-b border-gray-600 pb-2">Move History</h3>
            <div className="bg-gray-800 rounded p-2 h-48 lg:h-auto flex-grow overflow-y-auto">
                {moves.length === 0 ? (<p className="text-gray-500 text-sm">No moves yet.</p>) : (<ol className="list-none text-gray-200">
                        {moves.map((move, index) => (index % 2 === 0 && (<li key={index} className="grid grid-cols-3 gap-2 py-1 px-2 rounded hover:bg-gray-700">
                                    <span className="text-gray-400">{Math.floor(index / 2) + 1}.</span>
                                    <span className="font-semibold">{move}</span>
                                    <span className="font-semibold">{moves[index + 1] || ''}</span>
                                </li>)))}
                    </ol>)}
                <div ref={movesEndRef}/>
            </div>
        </div>);
};
export default MoveHistory;
