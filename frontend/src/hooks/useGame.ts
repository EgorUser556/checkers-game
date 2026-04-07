import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  GameState, GameMessage, Position, BoardState,
  PlayerColor, GameStatus, CellValue, ValidMove,
} from '../types/game';
import { wsService } from '../services/websocket';

const INITIAL_BOARD: BoardState = Array.from({ length: 8 }, () => Array(8).fill(0));

const initialState: GameState = {
  gameId: null,
  board: INITIAL_BOARD,
  currentTurn: 'WHITE',
  status: 'WAITING_FOR_PLAYER',
  playerColor: null,
  whitePlayer: null,
  blackPlayer: null,
  selectedPiece: null,
  validMoves: [],
  message: 'Введите никнейм и найдите игру',
  whitePieces: 12,
  blackPieces: 12,
  moveHistory: [],
  lastCaptured: [],
};

// ─────────────────────────────────────────────────────────────
// Локальный расчёт допустимых ходов — зеркало Board.java
// Возвращает ValidMove[] с полным path каждого варианта.
// ─────────────────────────────────────────────────────────────

function isOwn(piece: CellValue, color: PlayerColor): boolean {
  return color === 'WHITE' ? (piece === 1 || piece === 3) : (piece === 2 || piece === 4);
}

function hasCapturesForColor(board: BoardState, color: PlayerColor): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p === 0 || !isOwn(p, color)) continue;
      const isKing = p === 3 || p === 4;
      if (findCapturesForPiece(board, { row: r, col: c }, color, isKing).length > 0) return true;
    }
  }
  return false;
}

/**
 * Рекурсивно строит все варианты серийного боя.
 * Каждый вариант — это ValidMove { landing, path }.
 * path содержит все точки приземления (как в Board.java).
 */
function findCapturesForPiece(
  board: BoardState,
  from: Position,
  color: PlayerColor,
  isKing: boolean,
): ValidMove[] {
  const results: ValidMove[] = [];
  recurse(board, from, from, color, isKing, new Set<string>(), [], results);
  return results;
}

function recurse(
  board: BoardState,
  _origin: Position,
  current: Position,
  color: PlayerColor,
  isKing: boolean,
  capturedKeys: Set<string>,
  path: Position[],        // путь приземлений пройденный до сюда
  results: ValidMove[],
): void {
  const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  let foundAny = false;

  if (isKing) {
    for (const [dr, dc] of dirs) {
      let r = current.row + dr;
      let c = current.col + dc;
      // Скользим до первой непустой клетки
      while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === 0) { r += dr; c += dc; }
      if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;
      const target = board[r][c];
      const key = `${r},${c}`;
      if (target === 0 || isOwn(target, color) || capturedKeys.has(key)) continue;

      // Приземляемся в каждую свободную клетку за врагом
      let lr = r + dr;
      let lc = c + dc;
      while (lr >= 0 && lr < 8 && lc >= 0 && lc < 8 && board[lr][lc] === 0) {
        foundAny = true;
        const newPath = [...path, { row: lr, col: lc }];
        const newCaptured = new Set(capturedKeys);
        newCaptured.add(key);

        const origCur  = board[current.row][current.col];
        const origTgt  = board[r][c];
        (board[current.row] as CellValue[])[current.col] = 0;
        (board[r]           as CellValue[])[c]           = 0;
        (board[lr]          as CellValue[])[lc]          = origCur;

        recurse(board, _origin, { row: lr, col: lc }, color, true, newCaptured, newPath, results);

        (board[current.row] as CellValue[])[current.col] = origCur;
        (board[r]           as CellValue[])[c]           = origTgt;
        (board[lr]          as CellValue[])[lc]          = 0;

        lr += dr; lc += dc;
      }
    }
  } else {
    for (const [dr, dc] of dirs) {
      const mr = current.row + dr;
      const mc = current.col + dc;
      const lr = current.row + 2 * dr;
      const lc = current.col + 2 * dc;
      if (lr < 0 || lr >= 8 || lc < 0 || lc >= 8) continue;
      const target = board[mr][mc];
      const key = `${mr},${mc}`;
      if (target === 0 || isOwn(target, color) || capturedKeys.has(key) || board[lr][lc] !== 0) continue;

      foundAny = true;
      const becomeKing = (color === 'WHITE' && lr === 7) || (color === 'BLACK' && lr === 0);
      const origCur  = board[current.row][current.col];
      const origTgt  = board[mr][mc];
      const movPiece: CellValue = becomeKing ? (color === 'WHITE' ? 3 : 4) : origCur;

      const newPath = [...path, { row: lr, col: lc }];
      const newCaptured = new Set(capturedKeys);
      newCaptured.add(key);

      (board[current.row] as CellValue[])[current.col] = 0;
      (board[mr]          as CellValue[])[mc]          = 0;
      (board[lr]          as CellValue[])[lc]          = movPiece;

      recurse(board, _origin, { row: lr, col: lc }, color, becomeKing || isKing, newCaptured, newPath, results);

      (board[current.row] as CellValue[])[current.col] = origCur;
      (board[mr]          as CellValue[])[mc]          = origTgt;
      (board[lr]          as CellValue[])[lc]          = 0;
    }
  }

  // Тупик — конец цепочки. Добавляем вариант только если хоть один бой был сделан.
  if (!foundAny && path.length > 0) {
    results.push({ landing: current, path });
  }
}

function getSimpleMoves(
  board: BoardState,
  from: Position,
  color: PlayerColor,
  isKing: boolean,
): ValidMove[] {
  const result: ValidMove[] = [];
  const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  if (isKing) {
    for (const [dr, dc] of dirs) {
      let r = from.row + dr;
      let c = from.col + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === 0) {
        const pos = { row: r, col: c };
        result.push({ landing: pos, path: [pos] });
        r += dr; c += dc;
      }
    }
  } else {
    const forward = color === 'WHITE' ? 1 : -1;
    for (const dc of [-1, 1]) {
      const r = from.row + forward;
      const c = from.col + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === 0) {
        const pos = { row: r, col: c };
        result.push({ landing: pos, path: [pos] });
      }
    }
  }
  return result;
}

function getValidMovesLocal(
  board: BoardState,
  from: Position,
  playerColor: PlayerColor,
): ValidMove[] {
  const piece = board[from.row][from.col];
  if (piece === 0 || !isOwn(piece, playerColor)) return [];

  const isKing = piece === 3 || piece === 4;
  // Делаем копию доски — чтобы рекурсия не портила оригинал
  const b = board.map(r => [...r]) as BoardState;

  // Возвращаем все ходы: и бои, и обычные — игрок выбирает сам
  return [
    ...findCapturesForPiece(b, from, playerColor, isKing),
    ...getSimpleMoves(b, from, playerColor, isKing),
  ];
}

// ─────────────────────────────────────────────────────────────
// Хук
// ─────────────────────────────────────────────────────────────

export function useGame() {
  const [state, setState] = useState<GameState>(initialState);
  const stateRef = useRef<GameState>(initialState);
  stateRef.current = state;

  const [nickname, setNickname] = useState('');
  const [joinGameId, setJoinGameId] = useState('');
  const [connected, setConnected] = useState(false);

  const handleMessage = useCallback((msg: GameMessage) => {
    switch (msg.type) {
      case 'GAME_CREATED':
        setState(prev => ({
          ...prev,
          gameId: msg.gameId || null,
          board: msg.board || prev.board,
          playerColor: (msg.playerColor as PlayerColor) || null,
          whitePlayer: msg.whitePlayer || null,
          status: (msg.status as GameStatus) || 'WAITING_FOR_PLAYER',
          whitePieces: msg.whitePieces ?? 12,
          blackPieces: msg.blackPieces ?? 12,
          message: msg.message || 'Ожидание второго игрока...',
        }));
        break;

      case 'GAME_JOINED':
      case 'GAME_STARTED':
        setState(prev => ({
          ...prev,
          gameId: msg.gameId || prev.gameId,
          board: msg.board || prev.board,
          currentTurn: (msg.currentTurn as PlayerColor) || 'WHITE',
          playerColor: msg.playerColor ? (msg.playerColor as PlayerColor) : prev.playerColor,
          whitePlayer: msg.whitePlayer || prev.whitePlayer,
          blackPlayer: msg.blackPlayer || prev.blackPlayer,
          status: (msg.status as GameStatus) || 'IN_PROGRESS',
          whitePieces: msg.whitePieces ?? prev.whitePieces,
          blackPieces: msg.blackPieces ?? prev.blackPieces,
          message: 'Игра началась!',
        }));
        break;

      case 'GAME_UPDATE': {
        const newStatus = (msg.status as GameStatus) || 'IN_PROGRESS';
        const newTurn   = (msg.currentTurn as PlayerColor) || 'WHITE';
        const captured: Position[] = msg.captured
          ? msg.captured.map(c => ({ row: c[0], col: c[1] }))
          : [];

        setState(prev => {
          const displayMessage = msg.message
            ? buildGameOverMessage(newStatus, prev.playerColor, msg.message)
            : getStatusMessage(newStatus, newTurn, prev.playerColor);
          return {
            ...prev,
            board: msg.board || prev.board,
            currentTurn: newTurn,
            status: newStatus,
            whitePlayer: msg.whitePlayer || prev.whitePlayer,
            blackPlayer: msg.blackPlayer || prev.blackPlayer,
            selectedPiece: null,
            validMoves: [],
            whitePieces: msg.whitePieces ?? prev.whitePieces,
            blackPieces: msg.blackPieces ?? prev.blackPieces,
            lastCaptured: captured,
            moveHistory: msg.moveNotation
              ? [...prev.moveHistory, msg.moveNotation]
              : prev.moveHistory,
            message: displayMessage,
          };
        });

        if (captured.length > 0) {
          setTimeout(() => setState(prev => ({ ...prev, lastCaptured: [] })), 600);
        }
        break;
      }

      case 'OPPONENT_DISCONNECTED':
        setState(prev => ({
          ...prev,
          status: (msg.status as GameStatus) || prev.status,
          selectedPiece: null,
          validMoves: [],
          message: 'Противник покинул игру',
        }));
        break;

      case 'ERROR':
        console.warn('[WS Error]', msg.message);
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    wsService.connect();
    const interval = setInterval(() => setConnected(wsService.isConnected), 1000);
    const unsubscribe = wsService.onMessage(handleMessage);
    return () => { clearInterval(interval); unsubscribe(); };
  }, [handleMessage]);

  const createGame = useCallback(() => {
    const nick = nickname.trim();
    if (!nick) return;
    wsService.send({ type: 'CREATE_GAME', nickname: nick });
  }, [nickname]);

  const joinGame = useCallback(() => {
    const nick = nickname.trim();
    if (!nick || !joinGameId.trim()) return;
    wsService.send({ type: 'JOIN_GAME', nickname: nick, gameId: joinGameId.trim() });
  }, [nickname, joinGameId]);

  const quickJoin = useCallback(() => {
    const nick = nickname.trim();
    if (!nick) return;
    wsService.send({ type: 'QUICK_JOIN', nickname: nick });
  }, [nickname]);

  const handleCellClick = useCallback((row: number, col: number) => {
    const s = stateRef.current;
    if (s.status !== 'IN_PROGRESS' || !s.gameId) return;

    // Ищем, есть ли среди validMoves вариант с landing в (row, col)
    const matchingMove = s.validMoves.find(m => m.landing.row === row && m.landing.col === col);

    if (matchingMove) {
      wsService.send({
        type: 'MAKE_MOVE',
        gameId: s.gameId,
        fromRow: s.selectedPiece!.row,
        fromCol: s.selectedPiece!.col,
        toRow: matchingMove.landing.row,
        toCol: matchingMove.landing.col,
        // Всегда шлём path — бэкенд сам разберётся (path.length=1 для простого)
        path: matchingMove.path.map(p => [p.row, p.col]),
      });
      return;
    }

    // Не наш ход — игнорируем
    if (s.playerColor !== s.currentTurn) return;

    const piece = s.board[row][col];
    if (!isOwn(piece, s.playerColor!)) return;

    // Повторный клик на ту же шашку — снимаем выделение
    if (s.selectedPiece?.row === row && s.selectedPiece?.col === col) {
      setState(prev => ({ ...prev, selectedPiece: null, validMoves: [] }));
      return;
    }

    // Считаем ходы локально — мгновенно
    const moves = getValidMovesLocal(s.board, { row, col }, s.playerColor!);
    setState(prev => ({ ...prev, selectedPiece: { row, col }, validMoves: moves }));
  }, []);

  const resign = useCallback(() => {
    const s = stateRef.current;
    if (!s.gameId || s.status !== 'IN_PROGRESS') return;
    wsService.send({ type: 'RESIGN', gameId: s.gameId });
  }, []);

  const resetGame = useCallback(() => {
    wsService.disconnect();
    setState(initialState);
    setTimeout(() => wsService.connect(), 500);
  }, []);

  return {
    state,
    nickname,
    setNickname,
    joinGameId,
    setJoinGameId,
    connected,
    createGame,
    joinGame,
    quickJoin,
    handleCellClick,
    resign,
    resetGame,
  };
}

function buildGameOverMessage(
  status: GameStatus,
  playerColor: PlayerColor | null,
  serverMessage: string,
): string {
  const winner =
    status === 'WHITE_WON'
      ? (playerColor === 'WHITE' ? '🏆 Вы победили!' : '🏳 Вы проиграли')
      : status === 'BLACK_WON'
        ? (playerColor === 'BLACK' ? '🏆 Вы победили!' : '🏳 Вы проиграли')
        : null;
  return winner ? `${serverMessage}. ${winner}` : serverMessage;
}

function getStatusMessage(
  status: GameStatus,
  currentTurn: PlayerColor,
  playerColor: PlayerColor | null,
): string {
  switch (status) {
    case 'WHITE_WON': return playerColor === 'WHITE' ? '🏆 Вы победили!' : '🏳 Вы проиграли';
    case 'BLACK_WON': return playerColor === 'BLACK' ? '🏆 Вы победили!' : '🏳 Вы проиграли';
    case 'DRAW':      return 'Ничья!';
    case 'IN_PROGRESS':
      return playerColor === currentTurn ? 'Ваш ход' : 'Ход противника...';
    default: return '';
  }
}
