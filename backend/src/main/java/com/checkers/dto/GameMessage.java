package com.checkers.dto;

import java.util.List;
import java.util.Map;

/**
 * Универсальное сообщение для WebSocket-обмена.
 */
public class GameMessage {
    private String type;
    private String gameId;
    private String nickname;
    private int fromRow;
    private int fromCol;
    private int toRow;
    private int toCol;
    private List<int[]> path; // серийный бой: [[row,col], [row,col], ...]

    // Поля для ответов
    private int[][] board;
    private String currentTurn;
    private String status;
    private String playerColor;
    private String message;
    private String whitePlayer;
    private String blackPlayer;
    private List<int[]> validMoves;
    private List<int[]> captured;

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getGameId() { return gameId; }
    public void setGameId(String gameId) { this.gameId = gameId; }

    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }

    public int getFromRow() { return fromRow; }
    public void setFromRow(int fromRow) { this.fromRow = fromRow; }

    public int getFromCol() { return fromCol; }
    public void setFromCol(int fromCol) { this.fromCol = fromCol; }

    public int getToRow() { return toRow; }
    public void setToRow(int toRow) { this.toRow = toRow; }

    public int getToCol() { return toCol; }
    public void setToCol(int toCol) { this.toCol = toCol; }

    public List<int[]> getPath() { return path; }
    public void setPath(List<int[]> path) { this.path = path; }

    public int[][] getBoard() { return board; }
    public void setBoard(int[][] board) { this.board = board; }

    public String getCurrentTurn() { return currentTurn; }
    public void setCurrentTurn(String currentTurn) { this.currentTurn = currentTurn; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPlayerColor() { return playerColor; }
    public void setPlayerColor(String playerColor) { this.playerColor = playerColor; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getWhitePlayer() { return whitePlayer; }
    public void setWhitePlayer(String whitePlayer) { this.whitePlayer = whitePlayer; }

    public String getBlackPlayer() { return blackPlayer; }
    public void setBlackPlayer(String blackPlayer) { this.blackPlayer = blackPlayer; }

    public List<int[]> getValidMoves() { return validMoves; }
    public void setValidMoves(List<int[]> validMoves) { this.validMoves = validMoves; }

    public List<int[]> getCaptured() { return captured; }
    public void setCaptured(List<int[]> captured) { this.captured = captured; }
}
