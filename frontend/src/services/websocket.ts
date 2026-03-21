import type { GameMessage } from '../types/game';

type MessageHandler = (message: GameMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private url: string;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = `${protocol}//${host}/ws/game`;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket подключён');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message: GameMessage = JSON.parse(event.data);
        this.handlers.forEach(handler => handler(message));
      } catch (e) {
        console.error('Ошибка парсинга сообщения:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket отключён');
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket ошибка:', error);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: GameMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket не подключён');
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
