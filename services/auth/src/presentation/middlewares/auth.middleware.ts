import type { FastifyRequest, FastifyReply } from 'fastify';
import { TokenService } from '../../infrastructure/jwt/token.service.js';

const tokenService = new TokenService();

export const authMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = await tokenService.verifyAccessToken(token);
    request.user = payload;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
};

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      sub: string;
      email: string;
      subscription: string;
    };
  }
}
