import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';

/**
 * The notifications service is internal: only other microservices (auth,
 * payment, ...) may call it. Callers must present the shared INTERNAL_API_KEY
 * in the `x-internal-key` header. This keeps the service off the public surface.
 */
export const internalAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  const key = request.headers['x-internal-key'];

  if (typeof key !== 'string' || key !== env.INTERNAL_API_KEY) {
    return reply.status(401).send({ error: 'Invalid or missing internal API key' });
  }
};
