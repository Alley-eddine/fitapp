import type Stripe from 'stripe';
import type { SubscriptionTier } from '@fitapp/shared';
import { stripe } from '../providers/stripe.client.js';
import { PLANS, formatAmount } from '../config/plans.js';
import { getUserById, updateSubscription } from './subscription.service.js';
import { sendInvoiceEmail, sendSubscriptionEmail } from './notifications.client.js';

const tierFromPriceId = (priceId: string | undefined): SubscriptionTier => {
  if (priceId && priceId === PLANS.premium.priceId) return 'premium';
  if (priceId && priceId === PLANS.pro.priceId) return 'pro';
  return 'free';
};

const planName = (tier: SubscriptionTier): string =>
  tier === 'premium' ? PLANS.premium.name : tier === 'pro' ? PLANS.pro.name : 'Free';

const periodEndUnix = (subscription: Stripe.Subscription): number | null => {
  const item = subscription.items.data[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined;
  const sub = subscription as Stripe.Subscription & { current_period_end?: number };
  return item?.current_period_end ?? sub.current_period_end ?? null;
};

const fmtDate = (unixSeconds: number): string =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(unixSeconds * 1000));

export interface SyncResult {
  subscription: SubscriptionTier;
  synced: boolean;
}

/**
 * Pulls the user's subscription state directly from Stripe and reconciles the
 * DB. Used when the app returns from Checkout so the upgrade is reflected
 * immediately, without relying on the webhook being delivered. Sends the
 * invoice + welcome emails only on the transition into a paid plan (avoids spam
 * on repeated syncs).
 */
export const syncSubscription = async (userId: string): Promise<SyncResult> => {
  if (!stripe) throw new Error('Stripe is not configured');

  const user = await getUserById(userId);
  if (!user?.stripeCustomerId) {
    return { subscription: user?.subscription ?? 'free', synced: false };
  }

  const subs = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: 'all',
    limit: 1,
  });
  const subscription = subs.data[0];

  const active =
    subscription && (subscription.status === 'active' || subscription.status === 'trialing');

  if (!active) {
    await updateSubscription(userId, 'free', null);
    return { subscription: 'free', synced: true };
  }

  const priceId = subscription.items.data[0]?.price.id;
  const tier = tierFromPriceId(priceId);
  const endUnix = periodEndUnix(subscription);
  const endsAt = endUnix ? new Date(endUnix * 1000) : null;

  const wasUpgrade = user.subscription === 'free';
  await updateSubscription(userId, tier, endsAt);

  // First transition into a paid plan -> send the welcome + invoice emails once.
  if (wasUpgrade && tier !== 'free') {
    try {
      await sendSubscriptionEmail('subscription-started', {
        to: user.email,
        name: user.name,
        planName: planName(tier),
        periodEnd: endUnix ? fmtDate(endUnix) : undefined,
      });
    } catch (err) {
      console.error('subscription-started email failed:', err);
    }

    try {
      const invoices = await stripe.invoices.list({ customer: user.stripeCustomerId, limit: 1 });
      const invoice = invoices.data[0];
      if (invoice) {
        await sendInvoiceEmail({
          to: user.email,
          name: user.name,
          planName: planName(tier),
          amount: formatAmount(invoice.amount_paid, invoice.currency),
          invoiceNumber: invoice.number ?? invoice.id,
          periodEnd: endUnix ? fmtDate(endUnix) : undefined,
          invoiceUrl: invoice.hosted_invoice_url ?? undefined,
        });
      }
    } catch (err) {
      console.error('invoice email failed:', err);
    }
  }

  return { subscription: tier, synced: true };
};
