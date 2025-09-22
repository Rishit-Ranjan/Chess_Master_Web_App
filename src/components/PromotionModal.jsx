import React from 'react';
import Piece from './Piece';
const PromotionModal = ({ color, onSelect }) => {
    const promotionPieces = [
        { code: 'q', name: 'Queen' },
        { code: 'r', name: 'Rook' },
        { code: 'b', name: 'Bishop' },
        { code: 'n', name: 'Knight' },
    ];
    return (<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" aria-modal="true" role="dialog">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl p-6 text-center">
                <h2 className="text-2xl font-bold mb-4">Promote Pawn</h2>
                <div className="flex justify-center items-center space-x-2 sm:space-x-4">
                    {promotionPieces.map(p => (<button key={p.code} onClick={() => onSelect(p.code)} className="bg-gray-700 hover:bg-gray-600 rounded-lg p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label={`Promote to ${p.name}`}>
                            <div className="w-12 h-12 sm:w-16 sm:h-16">
                                <Piece piece={{ type: p.code, color: color }}/>
                            </div>
                        </button>))}
                </div>
            </div>
        </div>);
};
export default PromotionModal;
