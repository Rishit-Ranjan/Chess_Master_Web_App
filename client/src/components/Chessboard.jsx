import Square from './Square';
const Chessboard = ({ board, onSquareClick, selectedSquare, possibleMoves, playerColor, lastMove, checkmateHighlight }) => {
    const boardRepresentation = playerColor === 'w'
        ? board
        : [...board].reverse().map(row => [...row].reverse());
    const files = playerColor === 'w' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
    const ranks = playerColor === 'w' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];
    return (<div className="w-[90vw] h-[90vw] md:w-[480px] md:h-[480px] lg:w-[520px] lg:h-[520px] shadow-2xl grid grid-cols-8 grid-rows-8 relative">
            {boardRepresentation.map((row, rowIndex) => row.map((piece, colIndex) => {
            const square = `${files[colIndex]}${ranks[rowIndex]}`;
            const isLight = (rowIndex + colIndex) % 2 !== 0;
            const isCheckmateKing = checkmateHighlight?.king === square;
            const isCheckmateAttacker = checkmateHighlight?.attackers.includes(square) ?? false;
            return (<Square key={square} isLight={isLight} piece={piece} square={square} onClick={() => onSquareClick(square)} isSelected={square === selectedSquare} isPossibleMove={possibleMoves.includes(square)} isLastMove={lastMove?.from === square || lastMove?.to === square} isCheckmateKing={isCheckmateKing} isCheckmateAttacker={isCheckmateAttacker}/>);
        }))}
        </div>);
};
export default Chessboard;
