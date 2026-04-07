package com.checkers.websocket;

import com.checkers.dto.GameMessage;
import com.checkers.model.*;
import com.checkers.service.GameService;
import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.PingMessage;
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

        switch (msg.getType()) {
            case "CREATE_GAME"     -> handleCreateGame(session, msg);
            case "JOIN_GAME"       -> handleJoinGame(session, msg);
            case "QUICK_JOIN"      -> handleQuickJoin(session, msg);
            case "MAKE_MOVE"       -> handleMakeMove(session, msg);
            case "GET_VALID_MOVES" -> handleGetValidMoves(session, msg);
            case "GET_GAMES"       -> handleGetGames(session);
            case "RESIGN"          -> handleResign(session, msg);
            case "REJOIN"          -> handleRejoin(session, msg);
            case "PING"            -> { /* клиентский keepalive — ответ не нужен */ }
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
        response.setWhitePieces(game.getBoard().countPieces(PlayerColor.WHITE));
        response.setBlackPieces(game.getBoard().countPieces(PlayerColor.BLACK));

        sendMessage(session, response);
    }

    private void handleJoinGame(WebSocketSession session, GameMessage msg) throws IOException {
        String nickname = msg.getNickname() != null ? msg.getNickname() : "Игрок";
        Game game = gameService.joinGame(msg.getGameId(), session.getId(), nickname);

        if (game == null) {
            sendError(session, "Игра не найдена или уже заполнена");
            return;
        }

        GameMessage joinResponse = buildGameStateMessage(game, "GAME_JOINED", "BLACK");
        sendMessage(session, joinResponse);

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
            GameMessage response = new GameMessage();
            response.setType("GAME_CREATED");
            response.setGameId(game.getId());
            response.setPlayerColor("WHITE");
            response.setMessage("Ожидание второго игрока...");
            response.setBoard(game.getBoard().toArray());
            response.setWhitePlayer(nickname);
            response.setStatus(game.getStatus().name());
            response.setWhitePieces(game.getBoard().countPieces(PlayerColor.WHITE));
            response.setBlackPieces(game.getBoard().countPieces(PlayerColor.BLACK));
            sendMessage(session, response);
        } else {
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

        List<int[]> capturedArr = null;
        if (result.getCaptured() != null && !result.getCaptured().isEmpty()) {
            capturedArr = result.getCaptured().stream()
                    .map(p -> new int[]{p.getRow(), p.getCol()})
                    .toList();
        }

        String notation = buildNotation(from, to, path, result.getCaptured());

        GameMessage update = new GameMessage();
        update.setType("GAME_UPDATE");
        update.setGameId(game.getId());
        update.setBoard(game.getBoard().toArray());
        update.setCurrentTurn(game.getCurrentTurn().name());
        update.setStatus(game.getStatus().name());
        update.setCaptured(capturedArr);
        update.setWhitePlayer(game.getWhitePlayer().getNickname());
        update.setBlackPlayer(game.getBlackPlayer().getNickname());
        update.setWhitePieces(game.getBoard().countPieces(PlayerColor.WHITE));
        update.setBlackPieces(game.getBoard().countPieces(PlayerColor.BLACK));
        update.setMoveNotation(notation);

        broadcastToGame(game, update);
    }

    private void handleGetValidMoves(WebSocketSession session, GameMessage msg) throws IOException {
        Game game = gameService.getGame(msg.getGameId());
        if (game == null) {
            sendError(session, "Игра не найдена");
            return;
        }

        Player player = game.getPlayerBySessionId(session.getId());
        if (player == null) {
            sendError(session, "Вы не участник этой игры");
            return;
        }

        // БАГ-ФИХ: если не ваш ход — просто игнорируем запрос (не шлём ERROR)
        // Это устраняет "не ваш ход" при двойном клике на шашку или при задержке
        if (player.getColor() != game.getCurrentTurn()) {
            return;
        }

        Position from = new Position(msg.getFromRow(), msg.getFromCol());
        List<Move> moves = game.getBoard().getValidMovesForPiece(from, player.getColor());

        List<int[]> movesArr = new ArrayList<>();
        for (Move move : moves) {
            Position target = move.getFinalPosition();
            if (target != null) {
                movesArr.add(new int[]{target.getRow(), target.getCol()});
            }
        }

        GameMessage response = new GameMessage();
        response.setType("VALID_MOVES");
        response.setValidMoves(movesArr);

        sendMessage(session, response);
    }

    private void handleResign(WebSocketSession session, GameMessage msg) throws IOException {
        // Сохраняем данные ПЕРЕД resign, чтобы знать кто сдаётся
        Game game = gameService.getGame(msg.getGameId());
        if (game == null) {
            sendError(session, "Игра не найдена");
            return;
        }
        Player resigningPlayer = game.getPlayerBySessionId(session.getId());
        if (resigningPlayer == null) {
            sendError(session, "Вы не участник этой игры");
            return;
        }

        boolean ok = gameService.resign(msg.getGameId(), session.getId());
        if (!ok) {
            sendError(session, "Нельзя сдаться сейчас");
            return;
        }

        // game.getStatus() теперь обновлён внутри resign()
        String resignMsg = resigningPlayer.getNickname() + " сдался";

        // Отправляем GAME_UPDATE обоим игрокам с финальным статусом
        GameMessage updateWhite = buildGameUpdateForResign(game, resignMsg);
        GameMessage updateBlack = buildGameUpdateForResign(game, resignMsg);

        sendToPlayer(game.getWhitePlayer(), updateWhite);
        sendToPlayer(game.getBlackPlayer(), updateBlack);
    }

    private GameMessage buildGameUpdateForResign(Game game, String message) {
        GameMessage update = new GameMessage();
        update.setType("GAME_UPDATE");
        update.setGameId(game.getId());
        update.setBoard(game.getBoard().toArray());
        update.setCurrentTurn(game.getCurrentTurn().name());
        update.setStatus(game.getStatus().name());
        update.setWhitePlayer(game.getWhitePlayer().getNickname());
        update.setBlackPlayer(game.getBlackPlayer() != null ? game.getBlackPlayer().getNickname() : null);
        update.setWhitePieces(game.getBoard().countPieces(PlayerColor.WHITE));
        update.setBlackPieces(game.getBoard().countPieces(PlayerColor.BLACK));
        update.setMessage(message);
        return update;
    }

    private void handleRejoin(WebSocketSession session, GameMessage msg) throws IOException {
        String gameId = msg.getGameId();
        String playerColor = msg.getPlayerColor();
        if (gameId == null || playerColor == null) {
            sendError(session, "REJOIN: gameId и playerColor обязательны");
            return;
        }

        Game game = gameService.rejoin(gameId, session.getId(), playerColor);
        if (game == null) {
            // Игра не найдена (истекла) — отправляем сигнал вернуться в лобби
            GameMessage resp = new GameMessage();
            resp.setType("REJOIN_FAILED");
            resp.setMessage("Игра не найдена. Вернитесь в меню.");
            sendMessage(session, resp);
            return;
        }

        // Успешно — отправляем полное состояние игры
        GameMessage resp = buildGameStateMessage(game, "GAME_REJOINED", playerColor);
        resp.setWhitePieces(game.getBoard().countPieces(PlayerColor.WHITE));
        resp.setBlackPieces(game.getBoard().countPieces(PlayerColor.BLACK));
        sendMessage(session, resp);
        log.info("Player rejoined: gameId={} color={} newSession={}", gameId, playerColor, session.getId());
    }

    private void handleGetGames(WebSocketSession session) throws IOException {
        List<Game> waitingGames = gameService.getWaitingGames();
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

        // БАГ-ФИХ: получаем игру ДО удаления сессии, иначе getGameBySession вернёт null
        Game game = gameService.getGameBySession(sessionId);

        // Удаляем сессию из локальной карты
        sessions.remove(sessionId);

        if (game != null && game.getStatus() == GameStatus.IN_PROGRESS) {
            Player disconnected = game.getPlayerBySessionId(sessionId);

            // Устанавливаем победителя через removeSession
            gameService.removeSession(sessionId);

            // Теперь статус обновлён — шлём оппоненту GAME_UPDATE с финальным статусом
            if (disconnected != null) {
                String disconnectMsg = disconnected.getNickname() + " покинул игру";

                GameMessage update = new GameMessage();
                update.setType("GAME_UPDATE");
                update.setGameId(game.getId());
                update.setBoard(game.getBoard().toArray());
                update.setCurrentTurn(game.getCurrentTurn().name());
                update.setStatus(game.getStatus().name()); // уже обновлён
                update.setWhitePlayer(game.getWhitePlayer() != null ? game.getWhitePlayer().getNickname() : null);
                update.setBlackPlayer(game.getBlackPlayer() != null ? game.getBlackPlayer().getNickname() : null);
                update.setWhitePieces(game.getBoard().countPieces(PlayerColor.WHITE));
                update.setBlackPieces(game.getBoard().countPieces(PlayerColor.BLACK));
                update.setMessage(disconnectMsg);

                // Отправляем только оппоненту (сессия отключившегося уже закрыта)
                broadcastToGame(game, update);
            }
        } else {
            // Игра ещё не началась или уже завершена — просто чистим
            gameService.removeSession(sessionId);
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
        msg.setWhitePieces(game.getBoard().countPieces(PlayerColor.WHITE));
        msg.setBlackPieces(game.getBoard().countPieces(PlayerColor.BLACK));
        return msg;
    }

    private String buildNotation(Position from, Position to, List<Position> path, List<Position> captured) {
        String fromStr = posToNotation(from);
        boolean isCapture = (captured != null && !captured.isEmpty());
        char sep = isCapture ? ':' : '-';

        if (path != null && !path.isEmpty()) {
            StringBuilder sb = new StringBuilder(fromStr);
            for (Position p : path) {
                sb.append(sep).append(posToNotation(p));
            }
            return sb.toString();
        }
        return fromStr + sep + posToNotation(to);
    }

    private String posToNotation(Position pos) {
        if (pos == null) return "?";
        char col = (char) ('a' + pos.getCol());
        return "" + col + (pos.getRow() + 1);
    }

    private void sendToPlayer(Player player, GameMessage msg) {
        if (player == null) return;
        WebSocketSession ws = sessions.get(player.getSessionId());
        if (ws != null && ws.isOpen()) {
            try { sendMessage(ws, msg); } catch (IOException e) { log.error("Send error", e); }
        }
    }

    private void broadcastToGame(Game game, GameMessage msg) {
        sendToPlayer(game.getWhitePlayer(), msg);
        sendToPlayer(game.getBlackPlayer(), msg);
    }

    private void sendMessage(WebSocketSession session, GameMessage msg) throws IOException {
        session.sendMessage(new TextMessage(gson.toJson(msg)));
    }

    /**
     * Ping всех подключённых клиентов каждые 30 секунд.
     * Предотвращает закрытие соединения Render/proxy по таймауту idle.
     */
    @Scheduled(fixedDelay = 30_000)
    public void pingAll() {
        for (WebSocketSession session : sessions.values()) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(new PingMessage());
                } catch (IOException e) {
                    log.warn("Ping failed for session {}: {}", session.getId(), e.getMessage());
                }
            }
        }
    }

    private void sendError(WebSocketSession session, String error) throws IOException {
        GameMessage msg = new GameMessage();
        msg.setType("ERROR");
        msg.setMessage(error);
        sendMessage(session, msg);
    }
}
