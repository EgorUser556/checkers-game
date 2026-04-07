import React from 'react';
import type { CellValue } from '../types/game';

interface CellProps {
  row: number;
  col: number;
  value: CellValue;
  isSelected: boolean;
  isValidMove: boolean;
  isCaptured: boolean;
  isLastFrom: boolean;
  isLastTo: boolean;
  onClick: () => void;
}

const Cell: React.FC<CellProps> = ({
  row,
  col,
  value,
  isSelected,
  isValidMove,
  isCaptured,
  isLastFrom,
  isLastTo,
  onClick,
}) => {
  const isDark = (row + col) % 2 === 1;

  const cellClass = [
    'cell',
    isDark ? 'cell-dark' : 'cell-light',
    isSelected  ? 'cell-selected'   : '',
    isValidMove ? 'cell-valid-move' : '',
    isLastFrom  ? 'cell-last-from'  : '',
    isLastTo    ? 'cell-last-to'    : '',
  ].filter(Boolean).join(' ');

  const renderPiece = () => {
    if (value === 0) return null;

    const isWhite = value === 1 || value === 3;
    const isKing  = value === 3 || value === 4;

    const pieceClass = [
      'piece',
      isWhite ? 'piece-white' : 'piece-black',
      isCaptured ? 'piece-captured' : '',
      isLastTo   ? 'piece-moved'    : '',
    ].filter(Boolean).join(' ');

    return (
      <div className={pieceClass}>
        <div className="piece-shine" />
        {isKing && <span className="king-mark">♛</span>}
      </div>
    );
  };

  return (
    <div className={cellClass} onClick={onClick}>
      {renderPiece()}
      {isValidMove && value === 0 && <div className="move-indicator" />}
    </div>
  );
};

export default Cell;
