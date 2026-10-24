export async function api<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const localDate = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

export interface Me {
  id: number;
  name: string;
  stars: number; // spendable balance
  starsEarned: number;
  owned: string[]; // Star Store items the child can wear
  streak: number;
  bestStreak: number;
  lastDate: string | null;
  avatar: import('../shared/rewards.ts').Avatar;
  badges: { code: string; earned_at: string }[];
}

export interface KidSummary {
  id: number;
  name: string;
  avatar: import('../shared/rewards.ts').Avatar;
  codeLength: number;
}
