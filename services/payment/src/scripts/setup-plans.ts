/**
 * Creates (idempotently) the Stripe products + recurring prices for the Pro and
 * Premium plans, then prints the price ids to paste into the service .env.
 *
 * Run with:  pnpm --filter @fitapp/payment setup:plans
 */
import { stripe } from '../providers/stripe.client.js';
import { PLANS } from '../config/plans.js';

const ensurePrice = async (
  key: 'pro' | 'premium'
): Promise<string> => {
  if (!stripe) throw new Error('STRIPE_SECRET_KEY is not set');
  const plan = PLANS[key];
  const lookupKey = `fitapp_${key}_monthly`;

  // Reuse an existing price with this lookup key if present.
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data[0]) {
    return existing.data[0].id;
  }

  const product = await stripe.products.create({
    name: `FitCoach AI ${plan.name}`,
    metadata: { fitapp_tier: plan.tier },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.amount,
    currency: plan.currency,
    recurring: { interval: plan.interval },
    lookup_key: lookupKey,
  });

  return price.id;
};

const main = async () => {
  if (!stripe) {
    console.error('❌ STRIPE_SECRET_KEY is not set in services/payment/.env');
    process.exit(1);
  }

  const proId = await ensurePrice('pro');
  const premiumId = await ensurePrice('premium');

  console.log('\n✅ Stripe plans ready. Add these to services/payment/.env:\n');
  console.log(`STRIPE_PRICE_PRO=${proId}`);
  console.log(`STRIPE_PRICE_PREMIUM=${premiumId}\n`);
};

main().catch((err: unknown) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
