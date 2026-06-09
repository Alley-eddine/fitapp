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

  // CORS - allow all origins in development (Expo web can run on any port)
  await fastify.register(cors, {
    origin: env.NODE_ENV === 'production' ? env.FRONTEND_URL : true,
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
    const metrics = await register.metrics();
    await reply.header('Content-Type', register.contentType).send(metrics);
  });

  return fastify;
};
