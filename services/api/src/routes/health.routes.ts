import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../config/database.js';

export const healthRoutes = (fastify: FastifyInstance) => {
  fastify.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      await pool.query('SELECT 1');
      return await reply.send({ status: 'healthy', service: 'api' });
    } catch {
      return await reply.status(503).send({ status: 'unhealthy', service: 'api' });
    }
  });
};
