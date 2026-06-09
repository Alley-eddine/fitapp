import type { SubscriptionTier } from '@fitapp/shared';
import { env } from './env.js';

export interface PlanDefinition {
  tier: Exclude<SubscriptionTier, 'free'>;
  name: string;
  amount: number; // in cents
  currency: string;
  interval: 'month';
  priceId?: string; // Stripe price id, set after setup:plans
}

export const PLANS: Record<Exclude<SubscriptionTier, 'free'>, PlanDefinition> = {
  pro: {
    tier: 'pro',
    name: 'Pro',
    amount: 999, // 9,99 €
    currency: 'eur',
    interval: 'month',
    priceId: env.STRIPE_PRICE_PRO,
  },
  premium: {
    tier: 'premium',
    name: 'Premium',
    amount: 1999, // 19,99 €
    currency: 'eur',
    interval: 'month',
    priceId: env.STRIPE_PRICE_PREMIUM,
  },
};

export const formatAmount = (amount: number, currency: string): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount / 100);
