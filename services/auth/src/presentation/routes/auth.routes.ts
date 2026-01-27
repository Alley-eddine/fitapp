import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { OAuth2Namespace } from '@fastify/oauth2';
import { fetchGoogleUserInfo } from '../../infrastructure/oauth/google.provider.js';
import { UserRepository } from '../../infrastructure/repositories/user.repository.js';
import { TokenService } from '../../infrastructure/jwt/token.service.js';
import { AuthenticateOAuthUseCase } from '../../application/use-cases/authenticate-oauth.usecase.js';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.usecase.js';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.usecase.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { env } from '../../infrastructure/config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
  }
}

const userRepository = new UserRepository();
const tokenService = new TokenService();
const authenticateOAuth = new AuthenticateOAuthUseCase(userRepository, tokenService);
const refreshTokenUseCase = new RefreshTokenUseCase(userRepository, tokenService);
const getCurrentUser = new GetCurrentUserUseCase(userRepository, tokenService);

export const authRoutes = (fastify: FastifyInstance) => {
  // Google OAuth callback
  fastify.get('/auth/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token } = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      const googleUser = await fetchGoogleUserInfo(token.access_token);

      const result = await authenticateOAuth.execute({
        provider: 'google',
        providerId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
      });

      const redirectUrl = new URL('/auth/callback', env.FRONTEND_URL);
      redirectUrl.searchParams.set('accessToken', result.accessToken);
      redirectUrl.searchParams.set('refreshToken', result.refreshToken);
      redirectUrl.searchParams.set('isNewUser', String(result.isNewUser));

      return await reply.redirect(redirectUrl.toString());
    } catch {
      const errorUrl = new URL('/auth/error', env.FRONTEND_URL);
      errorUrl.searchParams.set('error', 'authentication_failed');
      return await reply.redirect(errorUrl.toString());
    }
  });

  // Refresh token
  fastify.post('/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as { refreshToken?: string };

    if (!refreshToken) {
      return reply.status(400).send({ error: 'Refresh token required' });
    }

    try {
      const result = await refreshTokenUseCase.execute(refreshToken);
      return await reply.send(result);
    } catch {
      return await reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });

  // Get current user
  fastify.get(
    '/auth/me',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: 'Missing authorization header' });
      }
      const token = authHeader.slice(7);

      try {
        const user = await getCurrentUser.execute(token);
        return await reply.send(user);
      } catch {
        return await reply.status(401).send({ error: 'Invalid token' });
      }
    }
  );

  // Logout (client-side, just return success)
  fastify.post('/auth/logout', async (_request: FastifyRequest, reply: FastifyReply) => {
    return await reply.send({ success: true });
  });
};
