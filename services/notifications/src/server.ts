import Fastify from 'fastify';
import cors from '@fastify/cors';
import { register, collectDefaultMetrics } from 'prom-client';
import { healthRoutes } from './routes/health.routes.js';
import { notificationRoutes } from './routes/notifications.routes.js';
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

  await fastify.register(healthRoutes);
  await fastify.register(notificationRoutes, { prefix: '/api' });

  // Prometheus metrics endpoint
  fastify.get('/metrics', async (_request, reply) => {
    await reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  return fastify;
};
