import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { internalAuth } from '../middleware/internal-auth.js';
import { sendEmail } from '../providers/email.provider.js';
import { sendSms } from '../providers/sms.provider.js';
import { sendPush } from '../providers/push.provider.js';
import { renderEmailTemplate, type EmailTemplate } from '../templates/email.templates.js';
import { logNotification } from '../services/notification-log.service.js';
import { pool } from '../db/pool.js';

const EMAIL_TEMPLATES = [
  'verify-account',
  'invoice',
  'subscription-started',
  'subscription-ending',
  'payment-failed',
] as const;

// Either a server-side template (+ data) or a fully raw email.
const emailBodySchema = z.union([
  z.object({
    to: z.string().email(),
    template: z.enum(EMAIL_TEMPLATES),
    data: z.record(z.unknown()),
  }),
  z.object({
    to: z.string().email(),
    subject: z.string().min(1),
    html: z.string().min(1),
    text: z.string().min(1),
  }),
]);

const smsBodySchema = z.object({
  to: z.string().min(5),
  body: z.string().min(1).max(640),
});

const pushBodySchema = z.object({
  to: z.union([z.string(), z.array(z.string())]),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.unknown()).optional(),
});

export const notificationRoutes = (fastify: FastifyInstance) => {
  // All endpoints require the internal service key.
  fastify.addHook('preHandler', internalAuth);

  // --- Email -------------------------------------------------------------
  fastify.post('/notifications/email', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = emailBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const rendered =
      'template' in parsed.data
        ? renderEmailTemplate({
            template: parsed.data.template,
            data: parsed.data.data,
          } as unknown as EmailTemplate)
        : { subject: parsed.data.subject, html: parsed.data.html, text: parsed.data.text };

    const template = 'template' in parsed.data ? parsed.data.template : null;

    try {
      const result = await sendEmail({ to: parsed.data.to, ...rendered });
      await logNotification({
        channel: 'email',
        recipient: parsed.data.to,
        template,
        subject: rendered.subject,
        status: result.status,
        providerId: result.providerId,
      });
      return await reply.send({ ok: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send email';
      await logNotification({
        channel: 'email',
        recipient: parsed.data.to,
        template,
        subject: rendered.subject,
        status: 'failed',
        error: message,
      });
      return reply.status(502).send({ error: message });
    }
  });

  // --- SMS ---------------------------------------------------------------
  fastify.post('/notifications/sms', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = smsBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    try {
      const result = await sendSms(parsed.data);
      await logNotification({
        channel: 'sms',
        recipient: parsed.data.to,
        status: result.status,
        providerId: result.providerId,
      });
      return await reply.send({ ok: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send SMS';
      await logNotification({
        channel: 'sms',
        recipient: parsed.data.to,
        status: 'failed',
        error: message,
      });
      return reply.status(502).send({ error: message });
    }
  });

  // --- Push --------------------------------------------------------------
  fastify.post('/notifications/push', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = pushBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const recipient = Array.isArray(parsed.data.to) ? parsed.data.to.join(',') : parsed.data.to;

    try {
      const result = await sendPush(parsed.data);
      await logNotification({
        channel: 'push',
        recipient,
        subject: parsed.data.title,
        status: result.status,
        providerId: result.providerId,
      });
      return await reply.send({ ok: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send push';
      await logNotification({
        channel: 'push',
        recipient,
        subject: parsed.data.title,
        status: 'failed',
        error: message,
      });
      return reply.status(502).send({ error: message });
    }
  });

  // --- Delivery reporting ------------------------------------------------
  fastify.get('/notifications/logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = z
      .object({ limit: z.coerce.number().min(1).max(200).default(50) })
      .safeParse(request.query);
    const limit = query.success ? query.data.limit : 50;

    const { rows } = await pool.query(
      `SELECT id, channel, recipient, template, subject, status, provider_id, error, created_at
         FROM notification_logs
        ORDER BY created_at DESC
        LIMIT $1`,
      [limit]
    );
    return reply.send({ logs: rows });
  });
};
