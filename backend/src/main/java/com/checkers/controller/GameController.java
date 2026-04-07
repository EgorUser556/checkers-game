package com.checkers.controller;

import com.checkers.model.Game;
import com.checkers.model.GameStatus;
import com.checkers.model.PlayerColor;
import com.checkers.service.GameService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST-контроллер.
 *
 * GET  /api/games         — список ожидающих игр (для поллинга в лобби)
 * POST /api/games         — предварительно зарезервировать gameId;
 *                           клиент затем подключается по WS с этим ID
 * GET  /api/games/{id}    — информация о конкретной игре
 * GET  /api/health        — health check для Railway/Render
 */
@RestController
@RequestMapping("/api")
public class GameController {

    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    /**
     * Список всех ожидающих игр.
     * Лобби поллит этот эндпоинт каждые 4 секунды.
     */
    @GetMapping("/games")
    public List<Map<String, String>> getWaitingGames() {
        return gameService.getWaitingGames().stream()
                .map(g -> Map.of(
                        "id",      g.getId(),
                        "creator", g.getWhitePlayer().getNickname(),
                        "status",  g.getStatus().name()
                ))
                .toList();
    }

    /**
     * Создать игру через HTTP.
     * Возвращает { gameId } — клиент использует его при WS-подключении (CREATE_GAME).
     * Тело запроса: { "nickname": "Игрок" }
     */
    @PostMapping("/games")
    public ResponseEntity<Map<String, String>> createGame(
            @RequestBody(required = false) Map<String, String> body) {

        String nickname = (body != null && body.containsKey("nickname"))
                ? body.get("nickname").trim()
                : "Игрок";

        if (nickname.isEmpty()) nickname = "Игрок";
        if (nickname.length() > 20) nickname = nickname.substring(0, 20);

        // Резервируем gameId — создаём игру с временным sessionId.
        // При WS-подключении клиент пришлёт CREATE_GAME с этим gameId,
        // и сервер подхватит существующую запись.
        String tempSessionId = "http-" + UUID.randomUUID();
        Game game = gameService.createGame(tempSessionId, nickname);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of(
                        "gameId",   game.getId(),
                        "nickname", nickname
                ));
    }

    /**
     * Информация о конкретной игре.
     */
    @GetMapping("/games/{gameId}")
    public ResponseEntity<Map<String, Object>> getGame(@PathVariable String gameId) {
        Game game = gameService.getGame(gameId);
        if (game == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Игра не найдена"));
        }
        return ResponseEntity.ok(Map.of(
                "id",          game.getId(),
                "status",      game.getStatus().name(),
                "currentTurn", game.getCurrentTurn().name(),
                "whitePieces", game.getBoard().countPieces(com.checkers.model.PlayerColor.WHITE),
                "blackPieces", game.getBoard().countPieces(com.checkers.model.PlayerColor.BLACK),
                "whitePlayer", game.getWhitePlayer() != null ? game.getWhitePlayer().getNickname() : "",
                "blackPlayer", game.getBlackPlayer() != null ? game.getBlackPlayer().getNickname() : ""
        ));
    }

    /**
     * Удалить игру в статусе WAITING_FOR_PLAYER.
     * Только если игра ещё не началась (нет второго игрока).
     */
    @DeleteMapping("/games/{gameId}")
    public ResponseEntity<Map<String, String>> deleteGame(
            @PathVariable String gameId,
            @RequestParam(required = false) String sessionId) {

        Game game = gameService.getGame(gameId);

        if (game == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Игра не найдена"));
        }

        if (game.getStatus() != GameStatus.WAITING_FOR_PLAYER) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Нельзя удалить начавшуюся игру"));
        }

        gameService.deleteWaitingGame(gameId);
        return ResponseEntity.ok(Map.of("status", "deleted", "gameId", gameId));
    }

    /**
     * Health check — Railway/Render мониторинг.
     */
    @GetMapping("/health")
    public Map<String, Object> health() {
        long waitingCount = gameService.getWaitingGames().size();
        return Map.of(
                "status",       "ok",
                "waitingGames", waitingCount
        );
    }
}
