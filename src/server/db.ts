import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type DB = DatabaseSync;

const MIGRATIONS = join(import.meta.dirname, 'migrations');

export function openDb(file: string): DB {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  // The volume is NFS in the cluster: WAL needs shared memory that NFS can't
  // provide, so stay on the rollback journal and wait out brief locks.
  db.exec(`PRAGMA journal_mode = DELETE; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;`);
  migrate(db);
  return db;
}

function migrate(db: DB) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)`);
  const done = new Set(db.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name as string));
  for (const name of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    if (done.has(name)) continue;
    tx(db, () => {
      db.exec(readFileSync(join(MIGRATIONS, name), 'utf8'));
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
    });
  }
}

export function tx<T>(db: DB, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function kvGet<T>(db: DB, key: string, fallback: T): T {
  const row = db.prepare('SELECT value FROM kv WHERE key = ?').get(key);
  return row ? (JSON.parse(row.value as string) as T) : fallback;
}

export function kvSet(db: DB, key: string, value: unknown) {
  db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value));
}
