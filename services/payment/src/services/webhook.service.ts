import type Stripe from 'stripe';
import type { SubscriptionTier } from '@fitapp/shared';
import { PLANS, formatAmount } from '../config/plans.js';
import {
  findUserByStripeCustomerId,
  getUserById,
  setStripeCustomerId,
  updateSubscription,
} from './subscription.service.js';
import { sendInvoiceEmail, sendSubscriptionEmail } from './notifications.client.js';

/** Maps a Stripe price id to one of our subscription tiers. */
const tierFromPriceId = (priceId: string | undefined): SubscriptionTier => {
  if (priceId && priceId === PLANS.premium.priceId) return 'premium';
  if (priceId && priceId === PLANS.pro.priceId) return 'pro';
  return 'free';
};

const planName = (tier: SubscriptionTier): string =>
  tier === 'premium' ? PLANS.premium.name : tier === 'pro' ? PLANS.pro.name : 'Free';

const fmtDate = (unixSeconds: number): string =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(unixSeconds * 1000));

/**
 * Handles the Stripe webhook events that matter for subscription lifecycle.
 * Updates the user's status in DB and triggers transactional emails.
 */
export const handleStripeEvent = async (event: Stripe.Event): Promise<void> => {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const customerId = typeof session.customer === 'string' ? session.customer : null;
      if (userId && customerId) {
        await setStripeCustomerId(userId, customerId);
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      const user = await findUserByStripeCustomerId(customerId);
      if (!user) break;

      const priceId = subscription.items.data[0]?.price.id;
      const tier = tierFromPriceId(priceId);
      const active = subscription.status === 'active' || subscription.status === 'trialing';
      const endsAt = new Date(subscription.current_period_end * 1000);

      await updateSubscription(user.id, active ? tier : 'free', active ? endsAt : null);

      if (active && event.type === 'customer.subscription.created') {
        try {
          await sendSubscriptionEmail('subscription-started', {
            to: user.email,
            name: user.name,
            planName: planName(tier),
            periodEnd: fmtDate(subscription.current_period_end),
          });
        } catch (err) {
          console.error('subscription-started email failed:', err);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      const user = await findUserByStripeCustomerId(customerId);
      if (!user) break;

      await updateSubscription(user.id, 'free', null);
      try {
        await sendSubscriptionEmail('subscription-ending', {
          to: user.email,
          name: user.name,
          planName: planName(tierFromPriceId(subscription.items.data[0]?.price.id)),
        });
      } catch (err) {
        console.error('subscription-ending email failed:', err);
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;
      if (!customerId) break;
      const user = await findUserByStripeCustomerId(customerId);
      if (!user) break;

      const priceId = invoice.lines.data[0]?.price?.id;
      const tier = tierFromPriceId(priceId);
      try {
        await sendInvoiceEmail({
          to: user.email,
          name: user.name,
          planName: planName(tier),
          amount: formatAmount(invoice.amount_paid, invoice.currency),
          invoiceNumber: invoice.number ?? invoice.id,
          periodEnd: invoice.lines.data[0]?.period?.end
            ? fmtDate(invoice.lines.data[0].period.end)
            : undefined,
          invoiceUrl: invoice.hosted_invoice_url ?? undefined,
        });
      } catch (err) {
        console.error('invoice email failed:', err);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;
      if (!customerId) break;
      const user = await findUserByStripeCustomerId(customerId);
      if (!user) break;

      try {
        await sendSubscriptionEmail('payment-failed', {
          to: user.email,
          name: user.name,
          planName: planName(tierFromPriceId(invoice.lines.data[0]?.price?.id)),
        });
      } catch (err) {
        console.error('payment-failed email failed:', err);
      }
      break;
    }

    default:
      // Unhandled event types are acknowledged but ignored.
      break;
  }
};

export { getUserById };
