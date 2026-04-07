import React from 'react';
import type { BoardState, Position } from '../types/game';
import Cell from './Cell';

interface BoardProps {
  board: BoardState;
  selectedPiece: Position | null;
  validMoves: Position[];
  lastCaptured: Position[];
  onCellClick: (row: number, col: number) => void;
  flipped: boolean;
}

const Board: React.FC<BoardProps> = ({
  board,
  selectedPiece,
  validMoves,
  lastCaptured,
  onCellClick,
  flipped,
}) => {
  const rows = flipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
  const cols = flipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];

  return (
    <div className="board">
      {rows.map(row => (
        <div key={row} className="board-row">
          <span className="row-label">{row + 1}</span>
          {cols.map(col => {
            const isSelected =
              selectedPiece?.row === row && selectedPiece?.col === col;
            const isValidMove = validMoves.some(
              m => m.row === row && m.col === col
            );
            const isCaptured = lastCaptured.some(
              c => c.row === row && c.col === col
            );

            return (
              <Cell
                key={`${row}-${col}`}
                row={row}
                col={col}
                value={board[row][col]}
                isSelected={isSelected}
                isValidMove={isValidMove}
                isCaptured={isCaptured}
                onClick={() => onCellClick(row, col)}
              />
            );
          })}
        </div>
      ))}
      <div className="col-labels">
        <span className="row-label" />
        {cols.map(col => (
          <span key={col} className="col-label">
            {String.fromCharCode(97 + col)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Board;
