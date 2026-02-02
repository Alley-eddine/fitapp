import type { FastifyInstance } from 'fastify';

export const healthRoutes = (fastify: FastifyInstance) => {
  fastify.get('/health', async () => ({ status: 'ok', service: 'ai' }));
  fastify.get('/ready', async () => ({ status: 'ready' }));
};
