import type { FastifyInstance } from 'fastify';
import { isStripeConfigured } from '../config/env.js';

export const healthRoutes = (fastify: FastifyInstance) => {
  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'payment',
    stripe: isStripeConfigured ? 'configured' : 'not-configured',
  }));
  fastify.get('/ready', async () => ({ status: 'ready' }));
};
