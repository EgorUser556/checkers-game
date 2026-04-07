import React, { useEffect, useState } from 'react';
import type { GameStatus, PlayerColor } from '../types/game';

interface GameOverModalProps {
  status: GameStatus;
  playerColor: PlayerColor | null;
  whitePlayer: string | null;
  blackPlayer: string | null;
  serverMessage?: string; // resign / disconnect сообщение
  onNewGame: () => void;
  onMenu: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
  status,
  playerColor,
  whitePlayer,
  blackPlayer,
  serverMessage,
  onNewGame,
  onMenu,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Небольшая задержка чтобы анимация не обрезала финальный ход
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  const isWin =
    (status === 'WHITE_WON' && playerColor === 'WHITE') ||
    (status === 'BLACK_WON' && playerColor === 'BLACK');
  const isDraw = status === 'DRAW';

  const emoji = isDraw ? '🤝' : isWin ? '🏆' : '💀';
  const title = isDraw ? 'Ничья!' : isWin ? 'Вы победили!' : 'Вы проиграли';

  const winnerName =
    status === 'WHITE_WON' ? whitePlayer : status === 'BLACK_WON' ? blackPlayer : null;

  return (
    <div className={`modal-overlay ${visible ? 'modal-overlay--visible' : ''}`}>
      <div className={`modal ${visible ? 'modal--visible' : ''}`}>
        <div className="modal-emoji">{emoji}</div>
        <h2 className="modal-title">{title}</h2>

        {winnerName && !isDraw && (
          <p className="modal-subtitle">
            {isWin ? 'Отличная игра!' : `Победил ${winnerName}`}
          </p>
        )}

        {serverMessage && (
          <p className="modal-reason">{serverMessage}</p>
        )}

        <div className="modal-actions">
          <button className="btn btn-primary modal-btn" onClick={onNewGame}>
            Новая игра
          </button>
          <button className="btn btn-secondary modal-btn" onClick={onMenu}>
            В меню
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
