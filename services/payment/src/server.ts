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

  // CORS — any origin in development, locked to the front origin in production
  await fastify.register(cors, {
    origin: env.NODE_ENV === 'production' ? env.FRONTEND_URL : true,
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
    const metrics = await register.metrics();
    await reply.header('Content-Type', register.contentType).send(metrics);
  });

  return fastify;
};
