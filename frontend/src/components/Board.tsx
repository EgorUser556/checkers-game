import React from 'react';
import type { BoardState, Position, ValidMove, LastMove } from '../types/game';
import Cell from './Cell';

interface BoardProps {
  board: BoardState;
  selectedPiece: Position | null;
  validMoves: ValidMove[];
  lastCaptured: Position[];
  lastMove: LastMove | null;
  onCellClick: (row: number, col: number) => void;
  flipped: boolean;
}

const Board: React.FC<BoardProps> = ({
  board,
  selectedPiece,
  validMoves,
  lastCaptured,
  lastMove,
  onCellClick,
  flipped,
}) => {
  const rowOrder = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  const colOrder = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  return (
    <div className="board">
      {rowOrder.map(row => (
        <div key={row} className="board-row">
          <span className="row-label">{row + 1}</span>
          {colOrder.map(col => {
            const isSelected   = selectedPiece?.row === row && selectedPiece?.col === col;
            const isValidMove  = validMoves.some(m => m.landing.row === row && m.landing.col === col);
            const isCaptured   = lastCaptured.some(c => c.row === row && c.col === col);
            const isLastFrom   = lastMove?.from.row === row && lastMove?.from.col === col;
            const isLastTo     = lastMove?.to.row   === row && lastMove?.to.col   === col;

            return (
              <Cell
                key={`${row}-${col}`}
                row={row}
                col={col}
                value={board[row][col]}
                isSelected={isSelected}
                isValidMove={isValidMove}
                isCaptured={isCaptured}
                isLastFrom={isLastFrom}
                isLastTo={isLastTo}
                onClick={() => onCellClick(row, col)}
              />
            );
          })}
        </div>
      ))}
      <div className="col-labels">
        <span className="row-label" />
        {colOrder.map(col => (
          <span key={col} className="col-label">
            {String.fromCharCode(97 + col)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Board;
