import type { GameMessage } from '../types/game';

type MessageHandler = (message: GameMessage) => void;

class WebSocketService {
    private ws: WebSocket | null = null;
    private handlers: MessageHandler[] = [];
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private url: string;
    private intentionalClose = false;

    constructor() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        this.url = `${protocol}//${host}/ws/game`;
    }

    connect(): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve();

        if (this.ws?.readyState === WebSocket.CONNECTING) {
            return new Promise((resolve) => {
                const check = setInterval(() => {
                    if (this.ws?.readyState === WebSocket.OPEN) {
                        clearInterval(check);
                        resolve();
                    }
                }, 50);
            });
        }

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('[WS] подключён');
                this.reconnectAttempts = 0;
                resolve();
            };

            this.ws.onmessage = (event) => {
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
                if (!this.intentionalClose) this.scheduleReconnect();
            };

            this.ws.onerror = () => {
                reject(new Error('WebSocket connection error'));
            };
        });
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer) return;

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30_000);
        this.reconnectAttempts++;
        console.log(`[WS] переподключение через ${delay}ms (попытка ${this.reconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch((e) => {
                console.error('[WS] Ошибка переподключения:', e);
            });
        }, delay);
    }

    disconnect(): void {
        this.intentionalClose = true;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

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