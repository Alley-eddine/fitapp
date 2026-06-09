import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(3004),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),

  // Shared secret for service-to-service calls (auth, payment, ...).
  INTERNAL_API_KEY: z.string().min(16),

  // Email (Resend) - optional: falls back to console simulation when missing.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('FitCoach AI <onboarding@resend.dev>'),

  // SMS (Twilio) - optional: falls back to console simulation when missing.
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  // Push (Expo) - optional: a token unlocks higher rate limits, not required.
  EXPO_ACCESS_TOKEN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
