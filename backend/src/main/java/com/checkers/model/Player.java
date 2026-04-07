package com.checkers.model;

public class Player {
    private final String sessionId;
    private final String nickname;
    private PlayerColor color;

    public Player(String sessionId, String nickname) {
        this.sessionId = sessionId;
        this.nickname = nickname;
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getNickname() {
        return nickname;
    }

    public PlayerColor getColor() {
        return color;
    }

    public void setColor(PlayerColor color) {
        this.color = color;
    }
}
