import type { FastifyInstance } from 'fastify';

export const healthRoutes = (fastify: FastifyInstance) => {
  fastify.get('/health', async () => ({ status: 'ok', service: 'notifications' }));
  fastify.get('/ready', async () => ({ status: 'ready' }));
};
