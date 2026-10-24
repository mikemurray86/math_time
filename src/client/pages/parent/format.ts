export const fmtDuration = (ms: number | null | undefined) => {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
};

// SQLite datetime('now') is UTC without a zone marker.
export const fmtWhen = (sqlUtc: string) =>
  new Date(`${sqlUtc.replace(' ', 'T')}Z`).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);

export const level = (p: number | null) => (p === null ? 'none' : p >= 80 ? 'good' : p >= 60 ? 'ok' : 'low');
