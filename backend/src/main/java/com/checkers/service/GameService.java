package com.checkers.service;

import com.checkers.model.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameService {

    private final Map<String, Game> games = new ConcurrentHashMap<>();
    private final Map<String, String> sessionToGame = new ConcurrentHashMap<>();

    public Game createGame(String sessionId, String nickname) {
        Game game = new Game();
        Player player = new Player(sessionId, nickname);
        game.setWhitePlayer(player);
        games.put(game.getId(), game);
        sessionToGame.put(sessionId, game.getId());
        return game;
    }

    public Game joinGame(String gameId, String sessionId, String nickname) {
        Game game = games.get(gameId);
        if (game == null || game.isFull()) return null;
        Player player = new Player(sessionId, nickname);
        game.setBlackPlayer(player);
        game.setStatus(GameStatus.IN_PROGRESS);
        sessionToGame.put(sessionId, game.getId());
        return game;
    }

    /**
     * Привязывает реальный WS-sessionId к игре созданной через HTTP.
     * Темпоральный "http-..." sessionId заменяется на реальный WS-sessionId.
     */
    public Game claimHttpGame(String gameId, String realSessionId) {
        Game game = games.get(gameId);
        if (game == null || game.getStatus() != GameStatus.WAITING_FOR_PLAYER) return null;
        Player white = game.getWhitePlayer();
        if (white == null || !white.getSessionId().startsWith("http-")) return null;
        // Удаляем старый http-sessionId из мапы и прописываем новый
        sessionToGame.remove(white.getSessionId());
        white.setSessionId(realSessionId);
        sessionToGame.put(realSessionId, gameId);
        return game;
    }

    public Game quickJoin(String sessionId, String nickname) {
        for (Game game : games.values()) {
            if (game.getStatus() == GameStatus.WAITING_FOR_PLAYER && !game.isFull()) {
                Player player = new Player(sessionId, nickname);
                game.setBlackPlayer(player);
                game.setStatus(GameStatus.IN_PROGRESS);
                sessionToGame.put(sessionId, game.getId());
                return game;
            }
        }
        return createGame(sessionId, nickname);
    }

    /**
     * Выполнить ход.
     *
     * Клиент всегда шлёт path:
     *  - простой ход / одиночный бой: path = [[toRow, toCol]]
     *  - серийный бой: path = [[r1,c1], [r2,c2], ...]
     *
     * Бэкенд ищет ход через getFinalPosition() для совпадения конечной точки,
     * а для серийного боя — через полное совпадение path.
     */
    public MoveResult makeMove(String gameId, String sessionId,
                               Position from, Position to, List<Position> path) {
        Game game = games.get(gameId);
        if (game == null || game.getStatus() != GameStatus.IN_PROGRESS) {
            return new MoveResult(false, "Игра не найдена или завершена", null);
        }

        Player player = game.getPlayerBySessionId(sessionId);
        if (player == null) {
            return new MoveResult(false, "Вы не участник этой игры", null);
        }
        if (player.getColor() != game.getCurrentTurn()) {
            return new MoveResult(false, "Не ваш ход", null);
        }

        Board board = game.getBoard();
        Piece piece = board.getPiece(from);
        if (piece == null || piece.getColor() != player.getColor()) {
            return new MoveResult(false, "Нельзя ходить этой шашкой", null);
        }

        List<Move> validMoves = board.getValidMovesForPiece(from, player.getColor());
        Move selectedMove = null;

        if (path != null && path.size() > 1) {
            // Серийный бой — ищем точное совпадение path
            for (Move m : validMoves) {
                if (m.isChainCapture() && m.getPath().equals(path)) {
                    selectedMove = m;
                    break;
                }
            }
        } else {
            // Простой ход или одиночный бой: ищем по конечной позиции
            // to приоритетен, но если path=[point] — используем его
            Position target = (path != null && !path.isEmpty()) ? path.get(0) : to;
            for (Move m : validMoves) {
                Position finalPos = m.getFinalPosition();
                if (finalPos != null && finalPos.equals(target)) {
                    selectedMove = m;
                    break;
                }
            }
        }

        if (selectedMove == null) {
            return new MoveResult(false, "Недопустимый ход", null);
        }

        List<Position> captured = board.executeMove(selectedMove);
        game.switchTurn();
        game.checkGameOver();

        return new MoveResult(true, null, captured);
    }

    public boolean resign(String gameId, String sessionId) {
        Game game = games.get(gameId);
        if (game == null || game.getStatus() != GameStatus.IN_PROGRESS) return false;
        Player player = game.getPlayerBySessionId(sessionId);
        if (player == null) return false;
        game.setStatus(player.getColor() == PlayerColor.WHITE
                ? GameStatus.BLACK_WON : GameStatus.WHITE_WON);
        game.setResigned(player.getColor());
        return true;
    }

    public Game getGame(String gameId) { return games.get(gameId); }

    public Game getGameBySession(String sessionId) {
        String gameId = sessionToGame.get(sessionId);
        return gameId != null ? games.get(gameId) : null;
    }

    public void removeSession(String sessionId) {
        String gameId = sessionToGame.remove(sessionId);
        if (gameId == null) return;
        Game game = games.get(gameId);
        if (game == null) return;
        if (game.getStatus() == GameStatus.WAITING_FOR_PLAYER) {
            games.remove(gameId);
        } else if (game.getStatus() == GameStatus.IN_PROGRESS) {
            Player player = game.getPlayerBySessionId(sessionId);
            if (player != null) {
                game.setStatus(player.getColor() == PlayerColor.WHITE
                        ? GameStatus.BLACK_WON : GameStatus.WHITE_WON);
            }
        }
    }

    /**
     * Удаляет игру в статусе WAITING_FOR_PLAYER.
     */
    public boolean deleteWaitingGame(String gameId) {
        Game game = games.get(gameId);
        if (game == null || game.getStatus() != GameStatus.WAITING_FOR_PLAYER) return false;
        games.remove(gameId);
        // Удаляем sessionId создателя из мапы
        if (game.getWhitePlayer() != null) {
            sessionToGame.remove(game.getWhitePlayer().getSessionId());
        }
        return true;
    }

    public List<Game> getWaitingGames() {
        return games.values().stream()
                .filter(g -> g.getStatus() == GameStatus.WAITING_FOR_PLAYER)
                .toList();
    }

    public static class MoveResult {
        private final boolean success;
        private final String error;
        private final List<Position> captured;

        public MoveResult(boolean success, String error, List<Position> captured) {
            this.success = success;
            this.error = error;
            this.captured = captured;
        }

        public boolean isSuccess() { return success; }
        public String getError() { return error; }
        public List<Position> getCaptured() { return captured; }
    }
}
