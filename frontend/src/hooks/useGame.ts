import { useState, useEffect, useCallback } from 'react';
import type { GameState, GameMessage, Position, BoardState, PlayerColor, GameStatus } from '../types/game';
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

export function useGame() {
  const [state, setState] = useState<GameState>(initialState);
  const [nickname, setNickname] = useState('');
  const [joinGameId, setJoinGameId] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    wsService.connect();

    const interval = setInterval(() => {
      setConnected(wsService.isConnected);
    }, 1000);

    const unsubscribe = wsService.onMessage(handleMessage);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

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
        const newTurn = (msg.currentTurn as PlayerColor) || 'WHITE';

        const captured: Position[] = msg.captured
          ? msg.captured.map(c => ({ row: c[0], col: c[1] }))
          : [];

        setState(prev => {
          // Приоритет: явное msg.message (resign/disconnect) > стандартный статус
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
          setTimeout(() => {
            setState(prev => ({ ...prev, lastCaptured: [] }));
          }, 600);
        }
        break;
      }

      case 'VALID_MOVES':
        if (msg.validMoves) {
          setState(prev => ({
            ...prev,
            validMoves: msg.validMoves!.map(m => ({ row: m[0], col: m[1] })),
          }));
        }
        break;

      // OPPONENT_DISCONNECTED больше не используется (заменён на GAME_UPDATE),
      // но оставляем для совместимости со старыми клиентами
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
        // Не перезаписываем message если идёт игра — только логируем в консоль
        // (убирает всплывающее "не ваш ход" при двойном клике)
        console.warn('[WS Error]', msg.message);
        break;

      case 'GAMES_LIST':
        break;
    }
  }, []);

  const createGame = useCallback(() => {
    if (!nickname.trim()) return;
    wsService.send({ type: 'CREATE_GAME', nickname: nickname.trim() });
  }, [nickname]);

  const joinGame = useCallback(() => {
    if (!nickname.trim() || !joinGameId.trim()) return;
    wsService.send({ type: 'JOIN_GAME', nickname: nickname.trim(), gameId: joinGameId.trim() });
  }, [nickname, joinGameId]);

  const quickJoin = useCallback(() => {
    if (!nickname.trim()) return;
    wsService.send({ type: 'QUICK_JOIN', nickname: nickname.trim() });
  }, [nickname]);

  const selectPiece = useCallback((pos: Position) => {
    if (state.status !== 'IN_PROGRESS') return;
    if (state.playerColor !== state.currentTurn) return;

    const piece = state.board[pos.row][pos.col];
    const isMyPiece = state.playerColor === 'WHITE'
      ? (piece === 1 || piece === 3)
      : (piece === 2 || piece === 4);

    if (!isMyPiece) return;

    // БАГ-ФИХ: если кликаем на уже выбранную шашку — снимаем выделение
    // вместо повторной отправки GET_VALID_MOVES (что вызывало "не ваш ход")
    if (state.selectedPiece?.row === pos.row && state.selectedPiece?.col === pos.col) {
      setState(prev => ({ ...prev, selectedPiece: null, validMoves: [] }));
      return;
    }

    setState(prev => ({ ...prev, selectedPiece: pos, validMoves: [] }));

    wsService.send({
      type: 'GET_VALID_MOVES',
      gameId: state.gameId!,
      fromRow: pos.row,
      fromCol: pos.col,
    });
  }, [state.status, state.playerColor, state.currentTurn, state.board, state.gameId, state.selectedPiece]);

  const makeMove = useCallback((to: Position) => {
    if (!state.selectedPiece || !state.gameId) return;

    wsService.send({
      type: 'MAKE_MOVE',
      gameId: state.gameId,
      fromRow: state.selectedPiece.row,
      fromCol: state.selectedPiece.col,
      toRow: to.row,
      toCol: to.col,
    });
  }, [state.selectedPiece, state.gameId]);

  const handleCellClick = useCallback((row: number, col: number) => {
    const pos: Position = { row, col };

    if (state.validMoves.some(m => m.row === row && m.col === col)) {
      makeMove(pos);
      return;
    }

    selectPiece(pos);
  }, [state.validMoves, makeMove, selectPiece]);

  const resign = useCallback(() => {
    if (!state.gameId || state.status !== 'IN_PROGRESS') return;
    wsService.send({ type: 'RESIGN', gameId: state.gameId });
  }, [state.gameId, state.status]);

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

/**
 * Если пришло кастомное сообщение (resign/disconnect) — добавляем к нему
 * строку победителя, чтобы обе стороны видели итог.
 */
function buildGameOverMessage(
  status: GameStatus,
  playerColor: PlayerColor | null,
  serverMessage: string
): string {
  const winner = status === 'WHITE_WON'
    ? (playerColor === 'WHITE' ? '🏆 Вы победили!' : '🏳 Вы проиграли')
    : status === 'BLACK_WON'
      ? (playerColor === 'BLACK' ? '🏆 Вы победили!' : '🏳 Вы проиграли')
      : null;

  if (winner) return `${serverMessage}. ${winner}`;
  return serverMessage;
}

function getStatusMessage(
  status: GameStatus,
  currentTurn: PlayerColor,
  playerColor: PlayerColor | null
): string {
  switch (status) {
    case 'WHITE_WON':
      return playerColor === 'WHITE' ? '🏆 Вы победили!' : '🏳 Вы проиграли';
    case 'BLACK_WON':
      return playerColor === 'BLACK' ? '🏆 Вы победили!' : '🏳 Вы проиграли';
    case 'DRAW':
      return 'Ничья!';
    case 'IN_PROGRESS':
      return playerColor === currentTurn ? 'Ваш ход' : 'Ход противника...';
    default:
      return '';
  }
}
