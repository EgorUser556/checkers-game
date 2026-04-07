package com.checkers.dto;

import java.util.List;

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
    // Счётчики для UI
    private int whitePieces;
    private int blackPieces;
    // История ходов (упрощённая нотация)
    private String moveNotation;

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

    public int getWhitePieces() { return whitePieces; }
    public void setWhitePieces(int whitePieces) { this.whitePieces = whitePieces; }

    public int getBlackPieces() { return blackPieces; }
    public void setBlackPieces(int blackPieces) { this.blackPieces = blackPieces; }

    public String getMoveNotation() { return moveNotation; }
    public void setMoveNotation(String moveNotation) { this.moveNotation = moveNotation; }

    // Координаты последнего хода — для анимации и подсветки
    private int fromMoveRow = -1;
    private int fromMoveCol = -1;
    private int toMoveRow   = -1;
    private int toMoveCol   = -1;

    public int getFromMoveRow() { return fromMoveRow; }
    public void setFromMoveRow(int fromMoveRow) { this.fromMoveRow = fromMoveRow; }
    public int getFromMoveCol() { return fromMoveCol; }
    public void setFromMoveCol(int fromMoveCol) { this.fromMoveCol = fromMoveCol; }
    public int getToMoveRow() { return toMoveRow; }
    public void setToMoveRow(int toMoveRow) { this.toMoveRow = toMoveRow; }
    public int getToMoveCol() { return toMoveCol; }
    public void setToMoveCol(int toMoveCol) { this.toMoveCol = toMoveCol; }

    // Список ожидающих игр — корректный JSON массив [{id, creator}]
    private List<java.util.Map<String, String>> games;

    public List<java.util.Map<String, String>> getGames() { return games; }
    public void setGames(List<java.util.Map<String, String>> games) { this.games = games; }
}
