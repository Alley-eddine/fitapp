import type { FastifyInstance } from 'fastify';
import oauth2 from '@fastify/oauth2';
import { env } from '../config/env.js';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export const registerGoogleOAuth = async (fastify: FastifyInstance) => {
  await fastify.register(oauth2, {
    name: 'googleOAuth2',
    scope: ['profile', 'email'],
    credentials: {
      client: {
        id: env.GOOGLE_CLIENT_ID,
        secret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    startRedirectPath: '/auth/google',
    callbackUri: env.GOOGLE_CALLBACK_URL,
    discovery: {
      issuer: 'https://accounts.google.com',
    },
  });
};

export const fetchGoogleUserInfo = async (accessToken: string): Promise<GoogleUserInfo> => {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google user info');
  }

  return response.json() as Promise<GoogleUserInfo>;
};
