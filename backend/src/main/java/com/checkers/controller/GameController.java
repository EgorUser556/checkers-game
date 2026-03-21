package com.checkers.controller;

import com.checkers.model.Game;
import com.checkers.service.GameService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST-контроллер для HTTP-запросов (список игр, статус).
 */
@RestController
@RequestMapping("/api")
public class GameController {

    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @GetMapping("/games")
    public List<Map<String, String>> getWaitingGames() {
        return gameService.getWaitingGames().stream()
                .map(g -> Map.of(
                        "id", g.getId(),
                        "creator", g.getWhitePlayer().getNickname(),
                        "status", g.getStatus().name()
                ))
                .toList();
    }

    @GetMapping("/games/{gameId}")
    public Map<String, Object> getGameStatus(@PathVariable String gameId) {
        Game game = gameService.getGame(gameId);
        if (game == null) {
            return Map.of("error", "Игра не найдена");
        }
        return Map.of(
                "id", game.getId(),
                "status", game.getStatus().name(),
                "currentTurn", game.getCurrentTurn().name(),
                "board", game.getBoard().toArray()
        );
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
