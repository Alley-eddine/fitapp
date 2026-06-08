import Fastify from 'fastify';
import cors from '@fastify/cors';
import { register, collectDefaultMetrics } from 'prom-client';
import { healthRoutes } from './routes/health.routes.js';
import { paymentRoutes } from './routes/payment.routes.js';
import { env } from './config/env.js';

collectDefaultMetrics();

export const createServer = async () => {
  const fastify = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // Keep the raw body around so the Stripe webhook can verify its signature,
  // while still parsing JSON for every other route.
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      (req as typeof req & { rawBody?: Buffer }).rawBody = body as Buffer;
      try {
        const json = body.length ? JSON.parse(body.toString('utf8')) : {};
        done(null, json);
      } catch (err) {
        done(err instanceof Error ? err : new Error('Invalid JSON'), undefined);
      }
    }
  );

  await fastify.register(healthRoutes);
  await fastify.register(paymentRoutes, { prefix: '/api' });

  fastify.get('/metrics', async (_request, reply) => {
    await reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  return fastify;
};
