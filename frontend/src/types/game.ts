// 0 = пусто, 1 = белая шашка, 2 = чёрная шашка, 3 = белая дамка, 4 = чёрная дамка
export type CellValue = 0 | 1 | 2 | 3 | 4;
export type BoardState = CellValue[][];

export type PlayerColor = 'WHITE' | 'BLACK';
export type GameStatus = 'WAITING_FOR_PLAYER' | 'IN_PROGRESS' | 'WHITE_WON' | 'BLACK_WON' | 'DRAW';

export interface Position {
  row: number;
  col: number;
}

export interface ValidMove {
  landing: Position;
  path: Position[];
}

// Последний ход — для подсветки и анимации
export interface LastMove {
  from: Position;
  to: Position;
}

// Игра в списке лобби
export interface LobbyGame {
  id: string;
  creator: string;
}

export interface GameState {
  gameId: string | null;
  board: BoardState;
  currentTurn: PlayerColor;
  status: GameStatus;
  playerColor: PlayerColor | null;
  whitePlayer: string | null;
  blackPlayer: string | null;
  selectedPiece: Position | null;
  validMoves: ValidMove[];
  message: string;
  whitePieces: number;
  blackPieces: number;
  moveHistory: string[];
  lastCaptured: Position[];
  lastMove: LastMove | null;
  animatingFrom: Position | null; // шашка которая сейчас движется
}

export interface GameMessage {
  type: string;
  gameId?: string;
  nickname?: string;
  fromRow?: number;
  fromCol?: number;
  toRow?: number;
  toCol?: number;
  path?: number[][];
  board?: BoardState;
  currentTurn?: string;
  status?: string;
  playerColor?: string;
  message?: string;
  whitePlayer?: string;
  blackPlayer?: string;
  validMoves?: number[][];
  captured?: number[][];
  whitePieces?: number;
  blackPieces?: number;
  moveNotation?: string;
  // Для анимации хода
  fromMoveRow?: number;
  fromMoveCol?: number;
  toMoveRow?: number;
  toMoveCol?: number;
}
