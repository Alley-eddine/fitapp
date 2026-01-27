import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { register, collectDefaultMetrics } from 'prom-client';
import { registerGoogleOAuth } from '../infrastructure/oauth/google.provider.js';
import { authRoutes } from './routes/auth.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { env } from '../infrastructure/config/env.js';

collectDefaultMetrics();

export const createServer = async () => {
  const fastify = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  // CORS
  await fastify.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  // Cookies
  await fastify.register(cookie);

  // OAuth providers
  await registerGoogleOAuth(fastify);

  // Routes
  await fastify.register(authRoutes);
  await fastify.register(healthRoutes);

  // Prometheus metrics endpoint
  fastify.get('/metrics', async (_request, reply) => {
    await reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  return fastify;
};
