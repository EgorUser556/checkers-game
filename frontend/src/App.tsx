import React from 'react';
import { useGame } from './hooks/useGame';
import Board from './components/Board';
import GameInfo from './components/GameInfo';
import Lobby from './components/Lobby';
import './index.css';

const App: React.FC = () => {
  const {
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
    resetGame,
  } = useGame();

  const inGame = state.gameId !== null;
  const isGameOver =
    state.status === 'WHITE_WON' ||
    state.status === 'BLACK_WON' ||
    state.status === 'DRAW';

  if (!inGame) {
    return (
      <Lobby
        nickname={nickname}
        setNickname={setNickname}
        joinGameId={joinGameId}
        setJoinGameId={setJoinGameId}
        connected={connected}
        onCreateGame={createGame}
        onJoinGame={joinGame}
        onQuickJoin={quickJoin}
      />
    );
  }

  return (
    <div className="game-container">
      <GameInfo state={state} />

      <Board
        board={state.board}
        selectedPiece={state.selectedPiece}
        validMoves={state.validMoves}
        onCellClick={handleCellClick}
        flipped={state.playerColor === 'BLACK'}
      />

      {isGameOver && (
        <button className="btn btn-primary btn-new-game" onClick={resetGame}>
          Новая игра
        </button>
      )}
    </div>
  );
};

export default App;
