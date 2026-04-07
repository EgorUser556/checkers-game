import React, { useEffect } from 'react';
import type { LobbyGame } from '../types/game';

interface LobbyProps {
  nickname: string;
  setNickname: (value: string) => void;
  joinGameId: string;
  setJoinGameId: (value: string) => void;
  connected: boolean;
  lobbyGames: LobbyGame[];
  lobbyError: string | null;
  onCreateGame: () => void;
  onJoinGame: () => void;
  onQuickJoin: () => void;
  onRefreshGames: () => void;
  onJoinByGameId: (gameId: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({
  nickname,
  setNickname,
  joinGameId,
  setJoinGameId,
  connected,
  lobbyGames,
  lobbyError,
  onCreateGame,
  onJoinGame,
  onQuickJoin,
  onRefreshGames,
  onJoinByGameId,
}) => {
  // Запрашиваем список при подключении
  useEffect(() => {
    if (connected) onRefreshGames();
  }, [connected]);

  return (
    <div className="lobby">
      <h1 className="lobby-title">♟ Русские шашки</h1>
      <p className="lobby-subtitle">Онлайн-игра для двух игроков</p>

      <div className="connection-status">
        <span className={`status-dot ${connected ? 'status-online' : 'status-offline'}`} />
        {connected ? 'Подключено к серверу' : 'Нет подключения'}
      </div>

      <div className="lobby-form">
        <input
          type="text"
          placeholder="Ваш никнейм"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          className="input"
          maxLength={20}
        />

        <button
          className="btn btn-primary"
          onClick={onQuickJoin}
          disabled={!nickname.trim() || !connected}
        >
          Быстрый поиск
        </button>

        <div className="separator">или</div>

        <button
          className="btn btn-secondary"
          onClick={onCreateGame}
          disabled={!nickname.trim() || !connected}
        >
          Создать игру
        </button>

        <div className="join-section">
          <input
            type="text"
            placeholder="ID игры"
            value={joinGameId}
            onChange={e => setJoinGameId(e.target.value)}
            className={`input input-small ${lobbyError ? 'input-error' : ''}`}
          />
          <button
            className="btn btn-secondary"
            onClick={onJoinGame}
            disabled={!nickname.trim() || !joinGameId.trim() || !connected}
          >
            Войти
          </button>
        </div>
        {lobbyError && (
          <div className="lobby-error">{lobbyError}</div>
        )}
      </div>

      {/* Список открытых игр */}
      <div className="lobby-games">
        <div className="lobby-games-header">
          <span className="lobby-games-title">Открытые игры</span>
          <button
            className="btn-refresh"
            onClick={onRefreshGames}
            disabled={!connected}
            title="Обновить список"
          >
            ↻
          </button>
        </div>

        {lobbyGames.length === 0 ? (
          <div className="lobby-games-empty">Нет ожидающих игр</div>
        ) : (
          <div className="lobby-games-list">
            {lobbyGames.map(game => (
              <div key={game.id} className="lobby-game-row">
                <div className="lobby-game-info">
                  <span className="lobby-game-creator">{game.creator}</span>
                  <span className="lobby-game-id">#{game.id}</span>
                </div>
                <button
                  className="btn btn-join"
                  onClick={() => onJoinByGameId(game.id)}
                  disabled={!nickname.trim() || !connected}
                >
                  Войти
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;
