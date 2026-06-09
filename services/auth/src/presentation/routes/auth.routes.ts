import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { OAuth2Namespace } from '@fastify/oauth2';
import { createHash, randomBytes, randomInt } from 'crypto';
import { fetchGoogleUserInfo } from '../../infrastructure/oauth/google.provider.js';
import {
  sendVerificationEmail,
  sendPasswordResetSms,
} from '../../infrastructure/notifications/notifications.client.js';
import { UserRepository } from '../../infrastructure/repositories/user.repository.js';
import { TokenService } from '../../infrastructure/jwt/token.service.js';
import { AuthenticateOAuthUseCase } from '../../application/use-cases/authenticate-oauth.usecase.js';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.usecase.js';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.usecase.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { env } from '../../infrastructure/config/env.js';

const hashPassword = (password: string): string => {
  return createHash('sha256').update(password + env.JWT_SECRET).digest('hex');
};

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

  // Register with email/password
  fastify.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, name, phone } = request.body as {
      email?: string;
      password?: string;
      name?: string;
      phone?: string;
    };

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password required' });
    }

    try {
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        return await reply.status(400).send({ error: 'Email already registered' });
      }

      const passwordHash = hashPassword(password);
      const user = await userRepository.createWithPassword({
        email,
        name: name || email.split('@')[0] || 'User',
        passwordHash,
        phone: phone ?? null,
      });

      // Generate a one-time verification token (valid 24h) and email the link.
      const verifyToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await userRepository.saveVerificationToken(user.id, verifyToken, expiresAt);

      const verifyUrl = new URL('/auth/verify-email', env.AUTH_PUBLIC_URL);
      verifyUrl.searchParams.set('token', verifyToken);

      // Best-effort: a notification failure must not block registration.
      try {
        await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl: verifyUrl.toString() });
      } catch (notifyErr) {
        console.error('Failed to send verification email:', notifyErr);
      }

      const tokens = await tokenService.generateTokens(user);

      return await reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionTier: user.subscription,
          emailVerified: user.emailVerified,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (err) {
      console.error('Registration error:', err);
      return await reply.status(500).send({ error: 'Registration failed' });
    }
  });

  // Verify email (target of the link sent in the verification email)
  fastify.get('/auth/verify-email', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.query as { token?: string };

    const renderPage = (title: string, message: string, ok: boolean): string => `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
  <div style="text-align:center;max-width:420px;padding:32px">
    <div style="font-size:56px">${ok ? '✅' : '⚠️'}</div>
    <h1 style="color:#22d3ee;font-size:24px">${title}</h1>
    <p style="color:#94a3b8;font-size:16px">${message}</p>
  </div>
</body></html>`;

    if (!token) {
      return reply.status(400).type('text/html').send(
        renderPage('Lien invalide', 'Le lien de vérification est incomplet.', false)
      );
    }

    try {
      const userId = await userRepository.consumeVerificationToken(token);
      if (!userId) {
        return await reply.status(400).type('text/html').send(
          renderPage('Lien expiré', 'Ce lien de vérification est invalide ou a expiré.', false)
        );
      }

      await userRepository.markEmailVerified(userId);
      return await reply.type('text/html').send(
        renderPage('Compte confirmé !', 'Votre adresse email a été vérifiée. Vous pouvez retourner dans l’application.', true)
      );
    } catch (err) {
      console.error('Email verification error:', err);
      return await reply.status(500).type('text/html').send(
        renderPage('Erreur', 'Une erreur est survenue. Réessayez plus tard.', false)
      );
    }
  });

  // Forgot password - send a 6-digit code by SMS
  fastify.post('/auth/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as { email?: string };

    if (!email) {
      return reply.status(400).send({ error: 'Email required' });
    }

    try {
      const user = await userRepository.findByEmail(email);

      // Only send when we actually have a user with a phone on file, but always
      // return a generic success so we never leak which emails exist.
      if (user?.phone) {
        const code = String(randomInt(100000, 1000000));
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await userRepository.savePasswordResetCode(user.id, code, expiresAt);
        try {
          await sendPasswordResetSms({ to: user.phone, code });
        } catch (notifyErr) {
          console.error('Failed to send reset SMS:', notifyErr);
        }
      }

      return await reply.send({
        message: 'Si un compte avec un numéro de téléphone existe, un code a été envoyé par SMS.',
      });
    } catch (err) {
      console.error('Forgot password error:', err);
      return await reply.status(500).send({ error: 'Request failed' });
    }
  });

  // Reset password using the SMS code
  fastify.post('/auth/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, code, newPassword } = request.body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    if (!email || !code || !newPassword) {
      return reply.status(400).send({ error: 'Email, code and newPassword required' });
    }
    if (newPassword.length < 8) {
      return reply.status(400).send({ error: 'Password must be at least 8 characters' });
    }

    try {
      const user = await userRepository.findByEmail(email);
      if (!user) {
        return await reply.status(400).send({ error: 'Invalid code' });
      }

      const codeId = await userRepository.findValidResetCode(user.id, code);
      if (!codeId) {
        return await reply.status(400).send({ error: 'Invalid or expired code' });
      }

      await userRepository.updatePassword(user.id, hashPassword(newPassword));
      await userRepository.markResetCodeUsed(codeId);

      return await reply.send({ message: 'Mot de passe réinitialisé avec succès.' });
    } catch (err) {
      console.error('Reset password error:', err);
      return await reply.status(500).send({ error: 'Reset failed' });
    }
  });

  // Login with email/password
  fastify.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email?: string; password?: string };

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password required' });
    }

    try {
      const user = await userRepository.findByEmail(email);
      if (!user || !user.passwordHash) {
        return await reply.status(401).send({ error: 'Invalid email or password' });
      }

      const passwordHash = hashPassword(password);
      if (user.passwordHash !== passwordHash) {
        return await reply.status(401).send({ error: 'Invalid email or password' });
      }

      const tokens = await tokenService.generateTokens(user);

      return await reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionTier: user.subscription,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch {
      return await reply.status(500).send({ error: 'Login failed' });
    }
  });
};
