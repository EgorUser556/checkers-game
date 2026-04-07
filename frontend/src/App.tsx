import React, { useState } from 'react';
import { useGame } from './hooks/useGame';
import Board from './components/Board';
import GameInfo from './components/GameInfo';
import GameOverModal from './components/GameOverModal';
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
    resign,
    resetGame,
  } = useGame();

  // Сообщение от сервера (resign/disconnect) — передаём в модал
  const [gameOverMessage, setGameOverMessage] = useState<string | undefined>(undefined);

  const prevStatus = React.useRef(state.status);
  React.useEffect(() => {
    if (
      prevStatus.current === 'IN_PROGRESS' &&
      (state.status === 'WHITE_WON' || state.status === 'BLACK_WON' || state.status === 'DRAW')
    ) {
      // Если в message есть "покинул" или "сдался" — показываем как причину
      const msg = state.message;
      const isCustom = msg.includes('покинул') || msg.includes('сдался');
      setGameOverMessage(isCustom ? msg.split('.')[0] : undefined);
    }
    prevStatus.current = state.status;
  }, [state.status, state.message]);

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
      <GameInfo state={state} onResign={resign} />

      <Board
        board={state.board}
        selectedPiece={state.selectedPiece}
        validMoves={state.validMoves}
        lastCaptured={state.lastCaptured}
        onCellClick={handleCellClick}
        flipped={state.playerColor === 'BLACK'}
      />

      {isGameOver && (
        <GameOverModal
          status={state.status}
          playerColor={state.playerColor}
          whitePlayer={state.whitePlayer}
          blackPlayer={state.blackPlayer}
          serverMessage={gameOverMessage}
          onNewGame={() => {
            setGameOverMessage(undefined);
            resetGame();
          }}
          onMenu={() => {
            setGameOverMessage(undefined);
            resetGame();
          }}
        />
      )}
    </div>
  );
};

export default App;
