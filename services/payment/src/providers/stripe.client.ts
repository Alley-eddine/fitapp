import Stripe from 'stripe';
import { env } from '../config/env.js';

/**
 * Shared Stripe client. Null when no secret key is configured, so the service
 * can still boot (payment endpoints then return 503 "not configured").
 */
export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
  : null;
