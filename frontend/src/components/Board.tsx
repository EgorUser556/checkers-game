import React from 'react';
import type { BoardState, Position, ValidMove } from '../types/game';
import Cell from './Cell';

interface BoardProps {
  board: BoardState;
  selectedPiece: Position | null;
  validMoves: ValidMove[];
  lastCaptured: Position[];
  onCellClick: (row: number, col: number) => void;
  flipped: boolean; // true = чёрный игрок (его шашки сверху, ряд 7 наверху)
}

const Board: React.FC<BoardProps> = ({
  board,
  selectedPiece,
  validMoves,
  lastCaptured,
  onCellClick,
  flipped,
}) => {
  // flipped=true: показываем строки 7→0 (чёрные шашки сверху у чёрного игрока)
  // flipped=false: строки 0→7 (белые шашки снизу у белого игрока)
  const rowOrder = flipped
    ? [7, 6, 5, 4, 3, 2, 1, 0]
    : [0, 1, 2, 3, 4, 5, 6, 7];
  const colOrder = flipped
    ? [7, 6, 5, 4, 3, 2, 1, 0]
    : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="board">
      {rowOrder.map(row => (
        <div key={row} className="board-row">
          <span className="row-label">{row + 1}</span>
          {colOrder.map(col => {
            const isSelected =
              selectedPiece?.row === row && selectedPiece?.col === col;
            const isValidMove = validMoves.some(
              m => m.landing.row === row && m.landing.col === col
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
