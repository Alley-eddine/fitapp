import type { FastifyRequest, FastifyReply } from 'fastify';
import * as jose from 'jose';
import { env } from '../config/env.js';

interface TokenPayload {
  sub: string;
  email: string;
  subscription: 'free' | 'pro' | 'premium';
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

const secret = new TextEncoder().encode(env.JWT_SECRET);

export const authMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;
  console.log('AI Auth - header received:', authHeader ? `Bearer ${authHeader.slice(7, 20)}...` : 'MISSING');

  if (!authHeader?.startsWith('Bearer ')) {
    console.log('AI Auth - REJECTED: missing or no Bearer prefix');
    return reply.status(401).send({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: 'fitapp:auth',
      audience: 'fitapp:api',
    });

    request.user = {
      sub: payload.sub as string,
      email: payload.email as string,
      subscription: payload.subscription as TokenPayload['subscription'],
    };
  } catch (err) {
    console.log('AI Auth - JWT verification failed:', err instanceof Error ? err.message : 'Unknown error');
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
};
