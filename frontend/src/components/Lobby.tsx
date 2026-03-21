import React from 'react';

interface LobbyProps {
  nickname: string;
  setNickname: (value: string) => void;
  joinGameId: string;
  setJoinGameId: (value: string) => void;
  connected: boolean;
  onCreateGame: () => void;
  onJoinGame: () => void;
  onQuickJoin: () => void;
}

const Lobby: React.FC<LobbyProps> = ({
  nickname,
  setNickname,
  joinGameId,
  setJoinGameId,
  connected,
  onCreateGame,
  onJoinGame,
  onQuickJoin,
}) => {
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
            className="input input-small"
          />
          <button
            className="btn btn-secondary"
            onClick={onJoinGame}
            disabled={!nickname.trim() || !joinGameId.trim() || !connected}
          >
            Войти
          </button>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
