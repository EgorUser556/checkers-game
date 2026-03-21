import React from 'react';
import type { GameState } from '../types/game';

interface GameInfoProps {
  state: GameState;
}

const GameInfo: React.FC<GameInfoProps> = ({ state }) => {
  const isGameOver =
    state.status === 'WHITE_WON' ||
    state.status === 'BLACK_WON' ||
    state.status === 'DRAW';

  const isMyTurn =
    state.status === 'IN_PROGRESS' && state.playerColor === state.currentTurn;

  return (
    <div className="game-info">
      <div className="players">
        <div className={`player-info ${state.currentTurn === 'WHITE' ? 'active-player' : ''}`}>
          <div className="player-piece piece-white-small" />
          <span>{state.whitePlayer || '...'}</span>
          {state.playerColor === 'WHITE' && <span className="you-badge">(вы)</span>}
        </div>
        <div className="vs">vs</div>
        <div className={`player-info ${state.currentTurn === 'BLACK' ? 'active-player' : ''}`}>
          <div className="player-piece piece-black-small" />
          <span>{state.blackPlayer || '...'}</span>
          {state.playerColor === 'BLACK' && <span className="you-badge">(вы)</span>}
        </div>
      </div>

      <div className={`status-bar ${isGameOver ? 'status-gameover' : isMyTurn ? 'status-your-turn' : ''}`}>
        {state.message}
      </div>

      {state.gameId && (
        <div className="game-id">
          ID игры: <code>{state.gameId}</code>
        </div>
      )}
    </div>
  );
};

export default GameInfo;
