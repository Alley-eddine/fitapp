import type { SubscriptionTier } from '@fitapp/shared';
import { pool } from '../db/pool.js';

export interface UserBilling {
  id: string;
  email: string;
  name: string | null;
  stripeCustomerId: string | null;
  subscription: SubscriptionTier;
}

interface UserBillingRow {
  id: string;
  email: string;
  name: string | null;
  stripe_customer_id: string | null;
  subscription: SubscriptionTier;
}

const map = (r: UserBillingRow): UserBilling => ({
  id: r.id,
  email: r.email,
  name: r.name,
  stripeCustomerId: r.stripe_customer_id,
  subscription: r.subscription,
});

export const getUserById = async (id: string): Promise<UserBilling | null> => {
  const { rows } = await pool.query<UserBillingRow>(
    `SELECT id, email, name, stripe_customer_id, subscription FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] ? map(rows[0]) : null;
};

export const findUserByStripeCustomerId = async (
  customerId: string
): Promise<UserBilling | null> => {
  const { rows } = await pool.query<UserBillingRow>(
    `SELECT id, email, name, stripe_customer_id, subscription FROM users WHERE stripe_customer_id = $1`,
    [customerId]
  );
  return rows[0] ? map(rows[0]) : null;
};

export const setStripeCustomerId = async (userId: string, customerId: string): Promise<void> => {
  await pool.query(
    `UPDATE users SET stripe_customer_id = $2, updated_at = NOW() WHERE id = $1`,
    [userId, customerId]
  );
};

export const updateSubscription = async (
  userId: string,
  tier: SubscriptionTier,
  endsAt: Date | null
): Promise<void> => {
  await pool.query(
    `UPDATE users SET subscription = $2, subscription_ends_at = $3, updated_at = NOW() WHERE id = $1`,
    [userId, tier, endsAt]
  );
};
