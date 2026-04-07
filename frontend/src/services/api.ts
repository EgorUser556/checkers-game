import type { LobbyGame } from '../types/game';

const BASE = '/api';

/**
 * GET /api/games — список ожидающих игр.
 * Используется для поллинга в лобби каждые 4 секунды.
 */
export async function fetchWaitingGames(): Promise<LobbyGame[]> {
  const res = await fetch(`${BASE}/games`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: { id: string; creator: string }[] = await res.json();
  return data.map(g => ({ id: g.id, creator: g.creator }));
}

/**
 * POST /api/games — создать игру через HTTP, получить gameId.
 * Клиент затем подключается по WebSocket и шлёт CREATE_GAME с этим gameId.
 */
export async function createGameHttp(nickname: string): Promise<{ gameId: string; nickname: string }> {
  const res = await fetch(`${BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * DELETE /api/games/{id} — удалить ожидающую игру.
 */
export async function deleteGameHttp(gameId: string): Promise<void> {
  const res = await fetch(`${BASE}/games/${gameId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
