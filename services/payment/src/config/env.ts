import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(3005),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),

  // Stripe - optional so the service boots without keys (endpoints then return 503).
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_PREMIUM: z.string().optional(),

  // Notifications service (invoices + subscription emails)
  NOTIFICATIONS_SERVICE_URL: z.string().url().default('http://localhost:3004'),
  INTERNAL_API_KEY: z.string().min(16),

  // Where Stripe Checkout redirects the user back to.
  FRONTEND_URL: z.string().url().default('http://localhost:8081'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isStripeConfigured = Boolean(env.STRIPE_SECRET_KEY);
