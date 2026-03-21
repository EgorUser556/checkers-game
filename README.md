# Русские шашки — веб-приложение

Курсовая работа: клиент-серверная онлайн-игра «Русские шашки».

## Архитектура

- **Сервер**: Java 17, Spring Boot 3.2, WebSocket
- **Клиент**: React 18, TypeScript, Vite
- **Протоколы**: WebSocket (реальное время), HTTP (REST API)

## Правила (русские шашки)

- Доска 8×8
- Обычная шашка ходит вперёд по диагонали на 1 клетку
- Бой обязателен (вперёд и назад)
- Дамка ходит и бьёт на любое расстояние по диагонали
- Серийный бой (цепочка взятий за один ход)
- Превращение в дамку при достижении последней горизонтали

## Функционал

- Создание и поиск игр
- Быстрый поиск (Quick Join)
- Подключение к игре по ID
- Авторизация по никнейму
- Подсветка возможных ходов
- Автоматическое определение победителя
- Обработка отключения игрока

## Запуск

### Сервер (backend)

Требуется Java 17+ и Maven.

```bash
cd backend
mvn spring-boot:run
```

Сервер запустится на `http://localhost:8080`.

### Клиент (frontend)

Требуется Node.js 18+.

```bash
cd frontend
npm install
npm run dev
```

Клиент запустится на `http://localhost:5173`.

## WebSocket API

Эндпоинт: `ws://localhost:8080/ws/game`

### Сообщения клиент → сервер

| Тип | Описание | Параметры |
|-----|----------|-----------|
| `CREATE_GAME` | Создать игру | `nickname` |
| `JOIN_GAME` | Войти в игру | `nickname`, `gameId` |
| `QUICK_JOIN` | Быстрый поиск | `nickname` |
| `MAKE_MOVE` | Сделать ход | `gameId`, `fromRow`, `fromCol`, `toRow`, `toCol` |
| `GET_VALID_MOVES` | Запрос ходов | `gameId`, `fromRow`, `fromCol` |

### Сообщения сервер → клиент

| Тип | Описание |
|-----|----------|
| `GAME_CREATED` | Игра создана, ожидание соперника |
| `GAME_JOINED` | Присоединение к игре |
| `GAME_STARTED` | Игра началась |
| `GAME_UPDATE` | Обновление состояния доски |
| `VALID_MOVES` | Список допустимых ходов |
| `ERROR` | Ошибка |
| `OPPONENT_DISCONNECTED` | Соперник отключился |

## REST API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/games` | Список ожидающих игр |
| GET | `/api/games/{id}` | Состояние игры |
| GET | `/api/health` | Health check |

## Структура проекта

```
checkers-game/
├── backend/
│   ├── pom.xml
│   └── src/main/java/com/checkers/
│       ├── CheckersApplication.java
│       ├── config/
│       │   ├── WebSocketConfig.java
│       │   └── CorsConfig.java
│       ├── model/
│       │   ├── Board.java          # Игровая логика
│       │   ├── Game.java           # Состояние игры
│       │   ├── Move.java           # Модель хода
│       │   ├── Piece.java          # Шашка
│       │   ├── Player.java         # Игрок
│       │   ├── Position.java       # Позиция на доске
│       │   ├── PieceType.java      # MAN / KING
│       │   ├── PlayerColor.java    # WHITE / BLACK
│       │   └── GameStatus.java     # Статусы игры
│       ├── dto/
│       │   └── GameMessage.java    # DTO для WebSocket
│       ├── service/
│       │   └── GameService.java    # Бизнес-логика
│       ├── websocket/
│       │   └── GameWebSocketHandler.java
│       └── controller/
│           └── GameController.java # REST API
└── frontend/
    ├── index.html
    ├── package.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── types/
        │   └── game.ts
        ├── services/
        │   └── websocket.ts
        ├── hooks/
        │   └── useGame.ts
        └── components/
            ├── Board.tsx
            ├── Cell.tsx
            ├── GameInfo.tsx
            └── Lobby.tsx
```
