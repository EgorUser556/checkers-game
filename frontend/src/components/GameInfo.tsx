import React, { useRef, useEffect, useState } from 'react';
import type { GameState } from '../types/game';

interface GameInfoProps {
  state: GameState;
  onResign: () => void;
}

const GameInfo: React.FC<GameInfoProps> = ({ state, onResign }) => {
  const [confirmResign, setConfirmResign] = useState(false);

  const isGameOver =
    state.status === 'WHITE_WON' ||
    state.status === 'BLACK_WON' ||
    state.status === 'DRAW';

  const isMyTurn =
    state.status === 'IN_PROGRESS' && state.playerColor === state.currentTurn;

  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [state.moveHistory]);

  // Сбрасываем confirm если игра завершилась
  useEffect(() => {
    if (isGameOver) setConfirmResign(false);
  }, [isGameOver]);

  const capturedByWhite = 12 - state.blackPieces;
  const capturedByBlack = 12 - state.whitePieces;

  return (
    <div className="game-info">
      {/* Игроки */}
      <div className="players">
        <div className={`player-info ${state.currentTurn === 'WHITE' ? 'active-player' : ''}`}>
          <div className="player-piece piece-white-small" />
          <div className="player-name-block">
            <span>{state.whitePlayer || '...'}</span>
            {state.playerColor === 'WHITE' && <span className="you-badge">(вы)</span>}
          </div>
          <div className="piece-count">
            <span className="piece-count-num">{state.whitePieces}</span>
            {capturedByBlack > 0 && (
              <span className="captured-count">−{capturedByBlack}</span>
            )}
          </div>
        </div>

        <div className="vs">vs</div>

        <div className={`player-info ${state.currentTurn === 'BLACK' ? 'active-player' : ''}`}>
          <div className="player-piece piece-black-small" />
          <div className="player-name-block">
            <span>{state.blackPlayer || '...'}</span>
            {state.playerColor === 'BLACK' && <span className="you-badge">(вы)</span>}
          </div>
          <div className="piece-count">
            <span className="piece-count-num">{state.blackPieces}</span>
            {capturedByWhite > 0 && (
              <span className="captured-count">−{capturedByWhite}</span>
            )}
          </div>
        </div>
      </div>

      {/* Статус */}
      <div className={`status-bar ${isGameOver ? 'status-gameover' : isMyTurn ? 'status-your-turn' : ''}`}>
        {state.message}
      </div>

      {/* История ходов */}
      {state.moveHistory.length > 0 && (
        <div className="move-history" ref={historyRef}>
          {state.moveHistory.map((move, i) => (
            <span key={i} className={`history-move ${i % 2 === 0 ? 'move-white' : 'move-black'}`}>
              {Math.floor(i / 2) + 1}{i % 2 === 0 ? '.' : ''} {move}
            </span>
          ))}
        </div>
      )}

      {/* Футер */}
      <div className="game-footer">
        {state.gameId && (
          <div className="game-id">
            ID: <code>{state.gameId}</code>
          </div>
        )}

        {state.status === 'IN_PROGRESS' && (
          confirmResign ? (
            <div className="resign-confirm">
              <span className="resign-confirm-text">Уверен?</span>
              <button
                className="btn btn-resign-yes"
                onClick={() => { setConfirmResign(false); onResign(); }}
              >
                Да
              </button>
              <button
                className="btn btn-resign-no"
                onClick={() => setConfirmResign(false)}
              >
                Нет
              </button>
            </div>
          ) : (
            <button
              className="btn btn-resign"
              onClick={() => setConfirmResign(true)}
              title="Сдаться"
            >
              🏳 Сдаться
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default GameInfo;
