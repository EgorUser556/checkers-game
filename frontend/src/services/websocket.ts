import type { GameMessage } from '../types/game';

type MessageHandler = (message: GameMessage) => void;

const PING_INTERVAL_MS   = 20_000; // шлём ping каждые 20с
const PONG_TIMEOUT_MS    = 8_000;  // если за 8с нет pong — считаем соединение мёртвым
const MAX_RECONNECT_DELAY = 16_000;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private url: string;

  // Сохраняем для REJOIN после реконнекта
  private activeGame: { gameId: string; playerColor: string } | null = null;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.host}/ws/game`;
  }

  connect(): void {
    if (
      this.ws?.readyState === WebSocket.OPEN ||
      this.ws?.readyState === WebSocket.CONNECTING
    ) return;

    this.intentionalClose = false;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('[WS] подключён');
      this.reconnectAttempts = 0;
      this.startPing();

      // Восстанавливаем игровую сессию после реконнекта
      if (this.activeGame) {
        console.log('[WS] отправляем REJOIN', this.activeGame);
        this.send({ type: 'REJOIN', ...this.activeGame });
      }
    };

    this.ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;

      // Pong от сервера — соединение живое
      if (event.data === '__pong__') {
        this.clearPongTimer();
        return;
      }

      try {
        const message: GameMessage = JSON.parse(event.data);
        this.handlers.forEach(h => h(message));
      } catch (e) {
        console.error('[WS] ошибка парсинга:', e);
      }
    };

    this.ws.onclose = (ev) => {
      console.log(`[WS] отключён (code=${ev.code})`);
      this.stopPing();
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose всегда следует за onerror — там и обработаем
    };
  }

  /** Вызвать когда игра началась — для восстановления после реконнекта */
  setActiveGame(gameId: string, playerColor: string): void {
    this.activeGame = { gameId, playerColor };
  }

  /** Вызвать когда игра завершена или игрок вернулся в лобби */
  clearActiveGame(): void {
    this.activeGame = null;
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;

      // Отправляем текстовый ping (не бинарный WebSocket ping)
      // чтобы сервер мог его обработать и поддерживать Render alive
      this.ws.send(JSON.stringify({ type: 'PING' }));

      // Запускаем таймер ожидания pong
      // Если сервер не ответит pong — принудительно переподключаемся
      this.pongTimer = setTimeout(() => {
        console.warn('[WS] pong не получен — принудительный реконнект');
        this.ws?.close();
      }, PONG_TIMEOUT_MS);
    }, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    this.clearPongTimer();
  }

  private clearPongTimer(): void {
    if (this.pongTimer) { clearTimeout(this.pongTimer); this.pongTimer = null; }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), MAX_RECONNECT_DELAY);
    this.reconnectAttempts++;
    console.log(`[WS] реконнект через ${delay}ms (попытка ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.activeGame = null;
    this.stopPing();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.ws?.close();
    this.ws = null;
    this.reconnectAttempts = 0;
  }

  send(message: GameMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WS] не подключён, сообщение потеряно:', message.type);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.push(handler);
    return () => { this.handlers = this.handlers.filter(h => h !== handler); };
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();
