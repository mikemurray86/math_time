import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { openDb } from './db.ts';
import { buildApp } from './app.ts';

const production = process.env.NODE_ENV === 'production';
const env = (name: string, devDefault: string) => {
  const v = process.env[name];
  if (v) return v;
  if (production) throw new Error(`${name} must be set`);
  console.warn(`${name} not set; using development default`);
  return devDefault;
};

const db = openDb(process.env.DB_PATH ?? join(process.cwd(), 'data', 'math.db'));

const app = await buildApp({
  db,
  pin: env('PARENT_PIN', '1234'),
  sessionSecret: env('SESSION_SECRET', randomBytes(32).toString('hex')),
  staticDir: join(import.meta.dirname, '..', '..', 'dist'),
  logger: true,
});

const shutdown = async () => {
  await app.close();
  db.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 8080) });
