package com.checkers.websocket;

import com.checkers.dto.GameMessage;
import com.checkers.model.*;
import com.checkers.service.GameService;
import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(GameWebSocketHandler.class);
    private final GameService gameService;
    private final Gson gson = new Gson();
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    public GameWebSocketHandler(GameService gameService) {
        this.gameService = gameService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.put(session.getId(), session);
        log.info("WebSocket connected: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        GameMessage msg = gson.fromJson(message.getPayload(), GameMessage.class);
        String sessionId = session.getId();

        switch (msg.getType()) {
            case "CREATE_GAME" -> handleCreateGame(session, msg);
            case "JOIN_GAME" -> handleJoinGame(session, msg);
            case "QUICK_JOIN" -> handleQuickJoin(session, msg);
            case "MAKE_MOVE" -> handleMakeMove(session, msg);
            case "GET_VALID_MOVES" -> handleGetValidMoves(session, msg);
            case "GET_GAMES" -> handleGetGames(session);
            default -> sendError(session, "Неизвестный тип сообщения: " + msg.getType());
        }
    }

    private void handleCreateGame(WebSocketSession session, GameMessage msg) throws IOException {
        String nickname = msg.getNickname() != null ? msg.getNickname() : "Игрок";
        Game game = gameService.createGame(session.getId(), nickname);

        GameMessage response = new GameMessage();
        response.setType("GAME_CREATED");
        response.setGameId(game.getId());
        response.setPlayerColor("WHITE");
        response.setMessage("Игра создана. Ожидание второго игрока...");
        response.setBoard(game.getBoard().toArray());
        response.setWhitePlayer(nickname);
        response.setStatus(game.getStatus().name());

        sendMessage(session, response);
    }

    private void handleJoinGame(WebSocketSession session, GameMessage msg) throws IOException {
        String nickname = msg.getNickname() != null ? msg.getNickname() : "Игрок";
        Game game = gameService.joinGame(msg.getGameId(), session.getId(), nickname);

        if (game == null) {
            sendError(session, "Игра не найдена или уже заполнена");
            return;
        }

        // Уведомляем присоединившегося
        GameMessage joinResponse = buildGameStateMessage(game, "GAME_JOINED", "BLACK");
        sendMessage(session, joinResponse);

        // Уведомляем создателя игры
        WebSocketSession whiteSession = sessions.get(game.getWhitePlayer().getSessionId());
        if (whiteSession != null && whiteSession.isOpen()) {
            GameMessage startMsg = buildGameStateMessage(game, "GAME_STARTED", "WHITE");
            sendMessage(whiteSession, startMsg);
        }
    }

    private void handleQuickJoin(WebSocketSession session, GameMessage msg) throws IOException {
        String nickname = msg.getNickname() != null ? msg.getNickname() : "Игрок";
        Game game = gameService.quickJoin(session.getId(), nickname);

        if (game.getStatus() == GameStatus.WAITING_FOR_PLAYER) {
            // Создал новую игру
            GameMessage response = new GameMessage();
            response.setType("GAME_CREATED");
            response.setGameId(game.getId());
            response.setPlayerColor("WHITE");
            response.setMessage("Ожидание второго игрока...");
            response.setBoard(game.getBoard().toArray());
            response.setWhitePlayer(nickname);
            response.setStatus(game.getStatus().name());
            sendMessage(session, response);
        } else {
            // Присоединился к существующей
            GameMessage joinResponse = buildGameStateMessage(game, "GAME_JOINED", "BLACK");
            sendMessage(session, joinResponse);

            WebSocketSession whiteSession = sessions.get(game.getWhitePlayer().getSessionId());
            if (whiteSession != null && whiteSession.isOpen()) {
                GameMessage startMsg = buildGameStateMessage(game, "GAME_STARTED", "WHITE");
                sendMessage(whiteSession, startMsg);
            }
        }
    }

    private void handleMakeMove(WebSocketSession session, GameMessage msg) throws IOException {
        Position from = new Position(msg.getFromRow(), msg.getFromCol());
        Position to = new Position(msg.getToRow(), msg.getToCol());

        // Преобразуем path из int[] в Position
        List<Position> path = null;
        if (msg.getPath() != null && !msg.getPath().isEmpty()) {
            path = new ArrayList<>();
            for (int[] p : msg.getPath()) {
                path.add(new Position(p[0], p[1]));
            }
        }

        GameService.MoveResult result = gameService.makeMove(
                msg.getGameId(), session.getId(), from, to, path);

        if (!result.isSuccess()) {
            sendError(session, result.getError());
            return;
        }

        Game game = gameService.getGame(msg.getGameId());

        // Готовим ответ с побитыми шашками
        List<int[]> capturedArr = null;
        if (result.getCaptured() != null && !result.getCaptured().isEmpty()) {
            capturedArr = result.getCaptured().stream()
                    .map(p -> new int[]{p.getRow(), p.getCol()})
                    .toList();
        }

        // Отправляем обновлённое состояние обоим игрокам
        GameMessage update = new GameMessage();
        update.setType("GAME_UPDATE");
        update.setGameId(game.getId());
        update.setBoard(game.getBoard().toArray());
        update.setCurrentTurn(game.getCurrentTurn().name());
        update.setStatus(game.getStatus().name());
        update.setCaptured(capturedArr);
        update.setWhitePlayer(game.getWhitePlayer().getNickname());
        update.setBlackPlayer(game.getBlackPlayer().getNickname());

        broadcastToGame(game, update);
    }

    private void handleGetValidMoves(WebSocketSession session, GameMessage msg) throws IOException {
        Game game = gameService.getGame(msg.getGameId());
        if (game == null) {
            sendError(session, "Игра не найдена");
            return;
        }

        Player player = game.getPlayerBySessionId(session.getId());
        if (player == null || player.getColor() != game.getCurrentTurn()) {
            sendError(session, "Не ваш ход");
            return;
        }

        Position from = new Position(msg.getFromRow(), msg.getFromCol());
        List<Move> moves = game.getBoard().getValidMovesForPiece(from, player.getColor());

        List<int[]> movesArr = new ArrayList<>();
        for (Move move : moves) {
            Position target = move.getFinalPosition();
            movesArr.add(new int[]{target.getRow(), target.getCol()});
        }

        GameMessage response = new GameMessage();
        response.setType("VALID_MOVES");
        response.setValidMoves(movesArr);

        sendMessage(session, response);
    }

    private void handleGetGames(WebSocketSession session) throws IOException {
        List<Game> waitingGames = gameService.getWaitingGames();
        // Простой формат — список id и создателей
        StringBuilder sb = new StringBuilder();
        for (Game g : waitingGames) {
            if (sb.length() > 0) sb.append(";");
            sb.append(g.getId()).append(":").append(g.getWhitePlayer().getNickname());
        }

        GameMessage response = new GameMessage();
        response.setType("GAMES_LIST");
        response.setMessage(sb.toString());
        sendMessage(session, response);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String sessionId = session.getId();
        sessions.remove(sessionId);

        Game game = gameService.getGameBySession(sessionId);
        if (game != null) {
            gameService.removeSession(sessionId);
            // Уведомляем оппонента
            GameMessage msg = new GameMessage();
            msg.setType("OPPONENT_DISCONNECTED");
            msg.setStatus(game.getStatus().name());
            msg.setMessage("Противник отключился");
            broadcastToGame(game, msg);
        }

        log.info("WebSocket disconnected: {}", sessionId);
    }

    private GameMessage buildGameStateMessage(Game game, String type, String playerColor) {
        GameMessage msg = new GameMessage();
        msg.setType(type);
        msg.setGameId(game.getId());
        msg.setBoard(game.getBoard().toArray());
        msg.setCurrentTurn(game.getCurrentTurn().name());
        msg.setStatus(game.getStatus().name());
        msg.setPlayerColor(playerColor);
        msg.setWhitePlayer(game.getWhitePlayer() != null ? game.getWhitePlayer().getNickname() : null);
        msg.setBlackPlayer(game.getBlackPlayer() != null ? game.getBlackPlayer().getNickname() : null);
        return msg;
    }

    private void broadcastToGame(Game game, GameMessage msg) {
        if (game.getWhitePlayer() != null) {
            WebSocketSession ws = sessions.get(game.getWhitePlayer().getSessionId());
            if (ws != null && ws.isOpen()) {
                try { sendMessage(ws, msg); } catch (IOException e) { log.error("Send error", e); }
            }
        }
        if (game.getBlackPlayer() != null) {
            WebSocketSession ws = sessions.get(game.getBlackPlayer().getSessionId());
            if (ws != null && ws.isOpen()) {
                try { sendMessage(ws, msg); } catch (IOException e) { log.error("Send error", e); }
            }
        }
    }

    private void sendMessage(WebSocketSession session, GameMessage msg) throws IOException {
        session.sendMessage(new TextMessage(gson.toJson(msg)));
    }

    private void sendError(WebSocketSession session, String error) throws IOException {
        GameMessage msg = new GameMessage();
        msg.setType("ERROR");
        msg.setMessage(error);
        sendMessage(session, msg);
    }
}
