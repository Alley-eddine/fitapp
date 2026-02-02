import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const nutritionRoutes = (fastify: FastifyInstance) => {
  // Proxy to AI service - Generate recipe
  fastify.post(
    '/nutrition/generate-recipe',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;

      try {
        const response = await fetch(`${env.AI_SERVICE_URL}/api/ai/generate-recipe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader ?? '',
          },
          body: JSON.stringify(request.body),
        });

        const data = await response.json();
        return await reply.status(response.status).send(data);
      } catch (err) {
        console.error('AI service error:', err);
        return reply.status(503).send({ error: 'AI service unavailable' });
      }
    }
  );

  // Proxy to AI service - Frigo mode chat
  fastify.post(
    '/nutrition/frigo-mode',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      console.log('Forwarding to AI service with auth:', authHeader ? 'Bearer ***' : 'MISSING');

      try {
        const response = await fetch(`${env.AI_SERVICE_URL}/api/ai/frigo-mode`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader ?? '',
          },
          body: JSON.stringify(request.body),
        });
        console.log('AI service response status:', response.status);

        const data = await response.json();
        return await reply.status(response.status).send(data);
      } catch (err) {
        console.error('AI service error:', err);
        return reply.status(503).send({ error: 'AI service unavailable' });
      }
    }
  );

  // Proxy - Check rate limit
  fastify.get(
    '/nutrition/rate-limit',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;

      try {
        const response = await fetch(`${env.AI_SERVICE_URL}/api/ai/rate-limit`, {
          headers: { Authorization: authHeader ?? '' },
        });

        const data = await response.json();
        return await reply.status(response.status).send(data);
      } catch (err) {
        console.error('AI service error:', err);
        return reply.status(503).send({ error: 'AI service unavailable' });
      }
    }
  );
};
