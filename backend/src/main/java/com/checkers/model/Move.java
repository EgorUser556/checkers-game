package com.checkers.model;

import java.util.ArrayList;
import java.util.List;

public class Move {
    private Position from;
    private Position to;
    private List<Position> path;          // позиции приземления (для серийного боя)
    private List<Position> capturedPath;  // побитые позиции (для executeMove)

    public Move(Position from, Position to) {
        this.from = from;
        this.to = to;
        this.path = new ArrayList<>();
        this.capturedPath = new ArrayList<>();
    }

    public Move(Position from, Position to, List<Position> path) {
        this.from = from;
        this.to = to;
        this.path = path != null ? path : new ArrayList<>();
        this.capturedPath = new ArrayList<>();
    }

    public Move(Position from, Position to, List<Position> path, List<Position> capturedPath) {
        this.from = from;
        this.to = to;
        this.path = path != null ? path : new ArrayList<>();
        this.capturedPath = capturedPath != null ? capturedPath : new ArrayList<>();
    }

    public Position getFrom() {
        return from;
    }

    public void setFrom(Position from) {
        this.from = from;
    }

    public Position getTo() {
        return to;
    }

    public List<Position> getPath() {
        return path;
    }

    public List<Position> getCapturedPath() {
        return capturedPath;
    }

    public boolean isChainCapture() {
        return path != null && !path.isEmpty();
    }

    /**
     * Конечная позиция (для серийного боя — последняя в цепочке).
     */
    public Position getFinalPosition() {
        if (isChainCapture()) {
            return path.get(path.size() - 1);
        }
        return to;
    }
}
