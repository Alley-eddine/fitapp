import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { env } from '../config/env.js';
import { stripe } from '../providers/stripe.client.js';
import { PLANS, formatAmount } from '../config/plans.js';
import { authMiddleware } from '../middleware/auth.js';
import { getUserById, setStripeCustomerId } from '../services/subscription.service.js';
import { handleStripeEvent } from '../services/webhook.service.js';
import { syncSubscription } from '../services/sync.service.js';

const checkoutSchema = z.object({ tier: z.enum(['pro', 'premium']) });

export const paymentRoutes = (fastify: FastifyInstance) => {
  // --- Public: list plans ------------------------------------------------
  fastify.get('/payment/plans', async (_request, reply) => {
    const plans = Object.values(PLANS).map((p) => ({
      tier: p.tier,
      name: p.name,
      price: formatAmount(p.amount, p.currency),
      amount: p.amount,
      currency: p.currency,
      interval: p.interval,
    }));
    return reply.send({ plans });
  });

  // --- Create a Checkout session ----------------------------------------
  fastify.post(
    '/payment/checkout',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!stripe) {
        return reply.status(503).send({ error: 'Stripe is not configured' });
      }
      const user = request.user;
      if (!user) return reply.status(401).send({ error: 'Unauthorized' });

      const parsed = checkoutSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const plan = PLANS[parsed.data.tier];
      if (!plan.priceId) {
        return reply.status(503).send({ error: `Plan ${plan.tier} has no Stripe price configured. Run setup:plans.` });
      }

      try {
        const dbUser = await getUserById(user.sub);
        if (!dbUser) return reply.status(404).send({ error: 'User not found' });

        // Reuse an existing Stripe customer or create one.
        let customerId = dbUser.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: dbUser.email,
            name: dbUser.name ?? undefined,
            metadata: { userId: dbUser.id },
          });
          customerId = customer.id;
          await setStripeCustomerId(dbUser.id, customerId);
        }

        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          customer: customerId,
          client_reference_id: dbUser.id,
          line_items: [{ price: plan.priceId, quantity: 1 }],
          subscription_data: { metadata: { userId: dbUser.id } },
          success_url: `${env.FRONTEND_URL}/paywall?status=success`,
          cancel_url: `${env.FRONTEND_URL}/paywall?status=cancel`,
        });

        return await reply.send({ url: session.url, sessionId: session.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Checkout failed';
        console.error('Checkout error:', err);
        return reply.status(502).send({ error: message });
      }
    }
  );

  // --- Sync subscription from Stripe (called on return from Checkout) ----
  fastify.post(
    '/payment/sync',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!stripe) return reply.status(503).send({ error: 'Stripe is not configured' });
      const user = request.user;
      if (!user) return reply.status(401).send({ error: 'Unauthorized' });

      try {
        const result = await syncSubscription(user.sub);
        return await reply.send(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sync failed';
        console.error('Sync error:', err);
        return reply.status(502).send({ error: message });
      }
    }
  );

  // --- Billing portal (manage / cancel subscription) --------------------
  fastify.post(
    '/payment/portal',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!stripe) return reply.status(503).send({ error: 'Stripe is not configured' });
      const user = request.user;
      if (!user) return reply.status(401).send({ error: 'Unauthorized' });

      try {
        const dbUser = await getUserById(user.sub);
        if (!dbUser?.stripeCustomerId) {
          return await reply.status(400).send({ error: 'No billing account for this user' });
        }
        const session = await stripe.billingPortal.sessions.create({
          customer: dbUser.stripeCustomerId,
          return_url: `${env.FRONTEND_URL}/settings`,
        });
        return await reply.send({ url: session.url });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Portal failed';
        return reply.status(502).send({ error: message });
      }
    }
  );

  // --- Stripe webhook ----------------------------------------------------
  fastify.post('/payment/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
      return reply.status(503).send({ error: 'Stripe webhook is not configured' });
    }

    const signature = request.headers['stripe-signature'];
    const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;
    if (typeof signature !== 'string' || !rawBody) {
      return reply.status(400).send({ error: 'Missing signature or body' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid signature';
      return reply.status(400).send({ error: `Webhook signature verification failed: ${message}` });
    }

    try {
      await handleStripeEvent(event);
      return await reply.send({ received: true });
    } catch (err) {
      console.error('Webhook handling error:', err);
      // Acknowledge to avoid endless Stripe retries on our internal errors.
      return reply.send({ received: true, warning: 'handler error' });
    }
  });
};
