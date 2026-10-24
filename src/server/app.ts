import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import type { DB } from './db.ts';
import { makeAuth } from './auth.ts';
import { HttpError } from './quiz.ts';
import { kidRoutes } from './routes/kid.ts';
import { parentRoutes } from './routes/parent.ts';

export interface AppOptions {
  db: DB;
  pin: string;
  sessionSecret: string;
  staticDir?: string;
  logger?: boolean;
}

export async function buildApp(opts: AppOptions) {
  const app = Fastify({ logger: opts.logger ?? false, trustProxy: true, bodyLimit: 64 * 1024 });
  await app.register(cookie, { secret: opts.sessionSecret });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) return reply.status(err.status).send({ error: err.message });
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) req.log.error(err);
    return reply.status(status).send({ error: status >= 500 ? 'Something went wrong' : (err as Error).message });
  });

  app.get('/healthz', async () => {
    opts.db.prepare('SELECT 1').get();
    return { ok: true };
  });

  const auth = makeAuth(opts.pin);
  kidRoutes(app, opts.db, auth);
  parentRoutes(app, opts.db, auth);

  if (opts.staticDir && existsSync(opts.staticDir)) {
    await app.register(fastifyStatic, { root: opts.staticDir, wildcard: false });
    // Single-page app: unknown non-API paths get index.html.
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith('/api/') ? reply.status(404).send({ error: 'Not found' }) : reply.sendFile('index.html'),
    );
  }

  return app;
}
