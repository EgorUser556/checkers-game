package com.checkers.model;

import java.util.*;

/**
 * Доска 8x8 для русских шашек.
 * Правила:
 * - Обычная шашка ходит вперёд по диагонали на 1 клетку
 * - Обычная шашка бьёт вперёд и назад (через одну клетку)
 * - Дамка ходит и бьёт на любое расстояние по диагонали
 * - Бой обязателен
 * - При наличии нескольких вариантов боя — выбор свободный
 * - Превращение в дамку на последней горизонтали
 * - Турецкий удар запрещён (сбитые шашки снимаются после завершения серии)
 */
public class Board {

    private final Piece[][] cells = new Piece[8][8];

    public Board() {
        initBoard();
    }

    private void initBoard() {
        // Белые на рядах 0-2, чёрные на рядах 5-7
        for (int row = 0; row < 8; row++) {
            for (int col = 0; col < 8; col++) {
                cells[row][col] = null;
                if ((row + col) % 2 == 1) {
                    if (row < 3) {
                        cells[row][col] = new Piece(PlayerColor.WHITE, PieceType.MAN);
                    } else if (row > 4) {
                        cells[row][col] = new Piece(PlayerColor.BLACK, PieceType.MAN);
                    }
                }
            }
        }
    }

    public Piece getPiece(int row, int col) {
        return cells[row][col];
    }

    public Piece getPiece(Position pos) {
        return cells[pos.getRow()][pos.getCol()];
    }

    public void setPiece(int row, int col, Piece piece) {
        cells[row][col] = piece;
    }

    public void setPiece(Position pos, Piece piece) {
        cells[pos.getRow()][pos.getCol()] = piece;
    }

    /**
     * Получить все возможные ходы для указанного цвета.
     * Если есть хотя бы один ход с боем — возвращаются только ходы с боем.
     */
    public List<Move> getValidMoves(PlayerColor color) {
        List<Move> captures = new ArrayList<>();
        List<Move> simpleMoves = new ArrayList<>();

        for (int row = 0; row < 8; row++) {
            for (int col = 0; col < 8; col++) {
                Piece piece = cells[row][col];
                if (piece != null && piece.getColor() == color) {
                    Position from = new Position(row, col);
                    captures.addAll(getCapturesForPiece(from, piece));
                    simpleMoves.addAll(getSimpleMovesForPiece(from, piece));
                }
            }
        }

        return captures.isEmpty() ? simpleMoves : captures;
    }

    /**
     * Получить все ходы для конкретной шашки.
     * Учитывает обязательность боя.
     */
    public List<Move> getValidMovesForPiece(Position from, PlayerColor color) {
        Piece piece = getPiece(from);
        if (piece == null || piece.getColor() != color) {
            return Collections.emptyList();
        }

        // Проверяем, есть ли бой у любой шашки этого цвета
        boolean mustCapture = hasCapturesForColor(color);

        if (mustCapture) {
            return getCapturesForPiece(from, piece);
        } else {
            return getSimpleMovesForPiece(from, piece);
        }
    }

    public boolean hasCapturesForColor(PlayerColor color) {
        for (int row = 0; row < 8; row++) {
            for (int col = 0; col < 8; col++) {
                Piece piece = cells[row][col];
                if (piece != null && piece.getColor() == color) {
                    if (!getCapturesForPiece(new Position(row, col), piece).isEmpty()) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Простые ходы (без боя) для шашки.
     */
    private List<Move> getSimpleMovesForPiece(Position from, Piece piece) {
        List<Move> moves = new ArrayList<>();
        int[][] directions = {{-1, -1}, {-1, 1}, {1, -1}, {1, 1}};

        if (piece.isKing()) {
            // Дамка — ход на любое расстояние по диагонали
            for (int[] dir : directions) {
                int r = from.getRow() + dir[0];
                int c = from.getCol() + dir[1];
                while (r >= 0 && r < 8 && c >= 0 && c < 8 && cells[r][c] == null) {
                    moves.add(new Move(from, new Position(r, c)));
                    r += dir[0];
                    c += dir[1];
                }
            }
        } else {
            // Обычная шашка — ход вперёд на 1
            int forward = piece.getColor() == PlayerColor.WHITE ? 1 : -1;
            int[][] manDirs = {{forward, -1}, {forward, 1}};
            for (int[] dir : manDirs) {
                int r = from.getRow() + dir[0];
                int c = from.getCol() + dir[1];
                if (r >= 0 && r < 8 && c >= 0 && c < 8 && cells[r][c] == null) {
                    moves.add(new Move(from, new Position(r, c)));
                }
            }
        }

        return moves;
    }

    /**
     * Все цепочки боя для шашки (серийный бой).
     */
    private List<Move> getCapturesForPiece(Position from, Piece piece) {
        List<Move> result = new ArrayList<>();
        Set<Position> alreadyCaptured = new HashSet<>();
        findCaptureChains(from, from, piece, alreadyCaptured, new ArrayList<>(), new ArrayList<>(), result);
        return result;
    }

    /**
     * Рекурсивный поиск цепочек боя.
     *
     * @param origin          исходная позиция всей цепочки (не меняется в рекурсии)
     * @param current         текущая позиция шашки
     * @param piece           шашка (может стать дамкой по ходу цепочки)
     * @param alreadyCaptured уже побитые шашки (турецкий удар запрещён)
     * @param path            список позиций приземления
     * @param capturedPath    список побитых позиций (для executeMove)
     * @param result          накапливаем готовые ходы
     */
    private void findCaptureChains(Position origin, Position current, Piece piece,
                                    Set<Position> alreadyCaptured,
                                    List<Position> path,
                                    List<Position> capturedPath,
                                    List<Move> result) {
        int[][] directions = {{-1, -1}, {-1, 1}, {1, -1}, {1, 1}};
        boolean foundCapture = false;

        if (piece.isKing()) {
            // Дамка бьёт на любое расстояние
            for (int[] dir : directions) {
                int r = current.getRow() + dir[0];
                int c = current.getCol() + dir[1];

                // Ищем вражескую шашку (пропускаем пустые клетки)
                while (r >= 0 && r < 8 && c >= 0 && c < 8 && cells[r][c] == null) {
                    r += dir[0];
                    c += dir[1];
                }

                if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;

                Piece target = cells[r][c];
                Position targetPos = new Position(r, c);
                if (target == null || target.getColor() == piece.getColor()
                        || alreadyCaptured.contains(targetPos)) continue;

                // За побитой шашкой должна быть хотя бы одна свободная клетка
                int lr = r + dir[0];
                int lc = c + dir[1];
                while (lr >= 0 && lr < 8 && lc >= 0 && lc < 8 && cells[lr][lc] == null) {
                    foundCapture = true;
                    Position landingPos = new Position(lr, lc);
                    List<Position> newPath = new ArrayList<>(path);
                    newPath.add(landingPos);
                    List<Position> newCapturedPath = new ArrayList<>(capturedPath);
                    newCapturedPath.add(targetPos);
                    Set<Position> newCaptured = new HashSet<>(alreadyCaptured);
                    newCaptured.add(targetPos);

                    // Временно перемещаем для продолжения цепочки
                    Piece savedCurrent = cells[current.getRow()][current.getCol()];
                    Piece savedTarget = cells[r][c];
                    cells[current.getRow()][current.getCol()] = null;
                    cells[r][c] = null;
                    cells[lr][lc] = piece;

                    findCaptureChains(origin, landingPos, piece, newCaptured, newPath, newCapturedPath, result);

                    // Восстанавливаем позиции
                    cells[current.getRow()][current.getCol()] = savedCurrent;
                    cells[r][c] = savedTarget;
                    cells[lr][lc] = null;

                    lr += dir[0];
                    lc += dir[1];
                }
            }
        } else {
            // Обычная шашка бьёт через одну клетку (вперёд и назад)
            for (int[] dir : directions) {
                int mr = current.getRow() + dir[0];
                int mc = current.getCol() + dir[1];
                int lr = current.getRow() + 2 * dir[0];
                int lc = current.getCol() + 2 * dir[1];

                if (lr < 0 || lr >= 8 || lc < 0 || lc >= 8) continue;

                Piece target = cells[mr][mc];
                Position targetPos = new Position(mr, mc);
                if (target == null || target.getColor() == piece.getColor()
                        || alreadyCaptured.contains(targetPos)
                        || cells[lr][lc] != null) continue;

                foundCapture = true;
                Position landingPos = new Position(lr, lc);
                List<Position> newPath = new ArrayList<>(path);
                newPath.add(landingPos);
                List<Position> newCapturedPath = new ArrayList<>(capturedPath);
                newCapturedPath.add(targetPos);
                Set<Position> newCaptured = new HashSet<>(alreadyCaptured);
                newCaptured.add(targetPos);

                // Проверяем, становится ли шашка дамкой на промежуточной позиции
                boolean becomesKing = (piece.getColor() == PlayerColor.WHITE && lr == 7)
                        || (piece.getColor() == PlayerColor.BLACK && lr == 0);
                Piece movingPiece = becomesKing ? new Piece(piece.getColor(), PieceType.KING) : piece;

                Piece savedCurrent = cells[current.getRow()][current.getCol()];
                Piece savedTarget = cells[mr][mc];
                cells[current.getRow()][current.getCol()] = null;
                cells[mr][mc] = null;
                cells[lr][lc] = movingPiece;

                findCaptureChains(origin, landingPos, movingPiece, newCaptured, newPath, newCapturedPath, result);

                cells[current.getRow()][current.getCol()] = savedCurrent;
                cells[mr][mc] = savedTarget;
                cells[lr][lc] = null;
            }
        }

        if (!foundCapture && !path.isEmpty()) {
            // Конец цепочки — добавляем ход с полным путём
            Move move = new Move(origin, null, new ArrayList<>(path), new ArrayList<>(capturedPath));
            result.add(move);
        }
    }

    /**
     * Выполнить ход на доске.
     *
     * @return список побитых позиций
     */
    public List<Position> executeMove(Move move) {
        List<Position> captured = new ArrayList<>();
        Piece piece = getPiece(move.getFrom());

        if (move.isChainCapture()) {
            // Серийный бой — используем сохранённый capturedPath
            List<Position> capturedPath = move.getCapturedPath();
            if (capturedPath != null && !capturedPath.isEmpty()) {
                captured.addAll(capturedPath);
            } else {
                // Фолбек: восстанавливаем вручную
                Position current = move.getFrom();
                for (Position next : move.getPath()) {
                    Position capturedPos = findCapturedPosition(current, next, piece);
                    if (capturedPos != null) {
                        captured.add(capturedPos);
                    }
                    current = next;
                }
            }

            // Снимаем побитые
            for (Position cap : captured) {
                setPiece(cap, null);
            }

            // Перемещаем шашку в конечную позицию
            Position finalPos = move.getPath().get(move.getPath().size() - 1);

            // Проверяем промежуточное превращение в дамку
            // (может быть уже учтено в цепочке, но если нет — проверяем финальную позицию)
            setPiece(move.getFrom(), null);
            setPiece(finalPos, piece);

            // Проверяем превращение в дамку
            checkPromotion(finalPos, piece);
        } else {
            // Простой ход
            Position capturedPos = findCapturedPosition(move.getFrom(), move.getTo(), piece);
            if (capturedPos != null) {
                captured.add(capturedPos);
                setPiece(capturedPos, null);
            }
            setPiece(move.getTo(), piece);
            setPiece(move.getFrom(), null);
            checkPromotion(move.getTo(), piece);
        }

        return captured;
    }

    /**
     * Найти побитую шашку между двумя позициями.
     */
    private Position findCapturedPosition(Position from, Position to, Piece movingPiece) {
        int dr = Integer.signum(to.getRow() - from.getRow());
        int dc = Integer.signum(to.getCol() - from.getCol());
        int r = from.getRow() + dr;
        int c = from.getCol() + dc;

        while (r != to.getRow() || c != to.getCol()) {
            Piece p = cells[r][c];
            if (p != null && p.getColor() != movingPiece.getColor()) {
                return new Position(r, c);
            }
            r += dr;
            c += dc;
        }
        return null;
    }

    private void checkPromotion(Position pos, Piece piece) {
        if (piece.getType() == PieceType.MAN) {
            if ((piece.getColor() == PlayerColor.WHITE && pos.getRow() == 7)
                    || (piece.getColor() == PlayerColor.BLACK && pos.getRow() == 0)) {
                piece.promote();
            }
        }
    }

    /**
     * Подсчёт шашек определённого цвета.
     */
    public int countPieces(PlayerColor color) {
        int count = 0;
        for (int row = 0; row < 8; row++) {
            for (int col = 0; col < 8; col++) {
                Piece piece = cells[row][col];
                if (piece != null && piece.getColor() == color) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Создание DTO-представления доски для отправки клиенту.
     */
    public int[][] toArray() {
        int[][] result = new int[8][8];
        for (int row = 0; row < 8; row++) {
            for (int col = 0; col < 8; col++) {
                Piece piece = cells[row][col];
                if (piece == null) {
                    result[row][col] = 0;
                } else if (piece.getColor() == PlayerColor.WHITE) {
                    result[row][col] = piece.isKing() ? 3 : 1;
                } else {
                    result[row][col] = piece.isKing() ? 4 : 2;
                }
            }
        }
        return result;
    }
}
