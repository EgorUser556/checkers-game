package com.checkers.model;

public class Piece {
    private PlayerColor color;
    private PieceType type;

    public Piece(PlayerColor color, PieceType type) {
        this.color = color;
        this.type = type;
    }

    public PlayerColor getColor() {
        return color;
    }

    public PieceType getType() {
        return type;
    }

    public void setType(PieceType type) {
        this.type = type;
    }

    public void promote() {
        this.type = PieceType.KING;
    }

    public boolean isKing() {
        return type == PieceType.KING;
    }
}
