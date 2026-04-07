package com.checkers.model;

import java.util.UUID;

public class Game {
    private final String id;
    private final Board board;
    private Player whitePlayer;
    private Player blackPlayer;
    private PlayerColor currentTurn;
    private GameStatus status;
    private PlayerColor resigned; // кто сдался (null если никто)

    public Game() {
        this.id = UUID.randomUUID().toString().substring(0, 8);
        this.board = new Board();
        this.currentTurn = PlayerColor.WHITE;
        this.status = GameStatus.WAITING_FOR_PLAYER;
        this.resigned = null;
    }

    public String getId() {
        return id;
    }

    public Board getBoard() {
        return board;
    }

    public Player getWhitePlayer() {
        return whitePlayer;
    }

    public void setWhitePlayer(Player whitePlayer) {
        this.whitePlayer = whitePlayer;
        whitePlayer.setColor(PlayerColor.WHITE);
    }

    public Player getBlackPlayer() {
        return blackPlayer;
    }

    public void setBlackPlayer(Player blackPlayer) {
        this.blackPlayer = blackPlayer;
        blackPlayer.setColor(PlayerColor.BLACK);
    }

    public PlayerColor getCurrentTurn() {
        return currentTurn;
    }

    public void switchTurn() {
        this.currentTurn = currentTurn.opposite();
    }

    public GameStatus getStatus() {
        return status;
    }

    public void setStatus(GameStatus status) {
        this.status = status;
    }

    public PlayerColor getResigned() {
        return resigned;
    }

    public void setResigned(PlayerColor resigned) {
        this.resigned = resigned;
    }

    public boolean isFull() {
        return whitePlayer != null && blackPlayer != null;
    }

    public Player getPlayerBySessionId(String sessionId) {
        if (whitePlayer != null && whitePlayer.getSessionId().equals(sessionId)) {
            return whitePlayer;
        }
        if (blackPlayer != null && blackPlayer.getSessionId().equals(sessionId)) {
            return blackPlayer;
        }
        return null;
    }

    /**
     * Проверяет окончание игры: если у одного из игроков нет шашек
     * или нет возможных ходов.
     */
    public void checkGameOver() {
        int whitePieces = board.countPieces(PlayerColor.WHITE);
        int blackPieces = board.countPieces(PlayerColor.BLACK);

        if (whitePieces == 0) {
            status = GameStatus.BLACK_WON;
        } else if (blackPieces == 0) {
            status = GameStatus.WHITE_WON;
        } else if (board.getValidMoves(currentTurn).isEmpty()) {
            // Текущий игрок не может ходить — проиграл
            status = (currentTurn == PlayerColor.WHITE) ? GameStatus.BLACK_WON : GameStatus.WHITE_WON;
        }
    }
}
