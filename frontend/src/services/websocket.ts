import type { GameMessage } from '../types/game';

type MessageHandler = (message: GameMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string;
  private intentionalClose = false;

  // Сохраняем для восстановления сессии после реконнекта
  private pendingRejoin: { gameId: string; playerColor: string } | null = null;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = `${protocol}//${host}/ws/game`;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN ||
        this.ws?.readyState === WebSocket.CONNECTING) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('[WS] подключён');
      this.reconnectAttempts = 0;

      // Если была активная игра — пересылаем REJOIN
      if (this.pendingRejoin) {
        this.send({ type: 'REJOIN', ...this.pendingRejoin });
      }
    };

    this.ws.onmessage = (event) => {
      // Игнорируем бинарные фреймы (pong от сервера)
      if (typeof event.data !== 'string') return;
      try {
        const message: GameMessage = JSON.parse(event.data);
        this.handlers.forEach(h => h(message));
      } catch (e) {
        console.error('[WS] Ошибка парсинга:', e);
      }
    };

    this.ws.onclose = (ev) => {
      console.log(`[WS] отключён (code=${ev.code})`);
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onerror всегда сопровождается onclose — реконнект сработает там
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, затем каждые 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30_000);
    this.reconnectAttempts++;
    console.log(`[WS] переподключение через ${delay}ms (попытка ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /** Вызывать когда игра началась — сохраняем для восстановления после реконнекта */
  setActiveGame(gameId: string, playerColor: string): void {
    this.pendingRejoin = { gameId, playerColor };
  }

  /** Вызывать когда игра завершена / игрок ушёл в лобби */
  clearActiveGame(): void {
    this.pendingRejoin = null;
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.pendingRejoin = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    // Сброс флага — следующий connect() будет обычным
    this.intentionalClose = false;
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
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();
