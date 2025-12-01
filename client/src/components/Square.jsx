import React from 'react';
import Piece from './Piece';
const Square = ({ isLight, piece, onClick, isSelected, isPossibleMove, isLastMove, isCheckmateKing, isCheckmateAttacker }) => {
    const bgClass = isLight ? 'bg-board-light' : 'bg-board-dark';
    let highlightClass = '';
    if (isCheckmateKing) {
        highlightClass = 'bg-red-600 bg-opacity-70';
    }
    else if (isCheckmateAttacker) {
        highlightClass = 'bg-orange-500 bg-opacity-70';
    }
    else if (isSelected) {
        highlightClass = 'bg-selected';
    }
    else if (isLastMove) {
        highlightClass = 'bg-yellow-500 bg-opacity-50';
    }
    return (<div onClick={onClick} className={`${bgClass} w-full h-full flex justify-center items-center cursor-pointer relative transition-colors duration-200`}>
             <div className={`absolute inset-0 ${highlightClass}`}></div>
            {piece && <Piece piece={piece}/>}
            {isPossibleMove && (<div className="absolute w-1/3 h-1/3 rounded-full bg-possible-move"></div>)}
        </div>);
};
export default Square;
