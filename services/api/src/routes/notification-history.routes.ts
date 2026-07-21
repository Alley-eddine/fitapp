import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendEmail, sendSms, emailHtml } from '../notifications.client.js';

interface LogRow {
  id: string;
  channel: string;
  recipient: string;
  template: string | null;
  subject: string | null;
  status: string;
  created_at: Date;
}

export const notificationHistoryRoutes = (fastify: FastifyInstance) => {
  // History of notifications sent to the current user (email + phone)
  fastify.get(
    '/notifications',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      const email = request.user?.email;
      if (!userId || !email) return reply.status(401).send({ error: 'Unauthorized' });

      const userRes = await query<{ phone: string | null }>(
        'SELECT phone FROM users WHERE id = $1',
        [userId]
      );
      const phone = userRes.rows[0]?.phone ?? null;

      const recipients = [email, ...(phone ? [phone] : [])];
      const result = await query<LogRow>(
        `SELECT id, channel, recipient, template, subject, status, created_at
           FROM notification_logs
          WHERE recipient = ANY($1)
          ORDER BY created_at DESC
          LIMIT 50`,
        [recipients]
      );

      return reply.send({
        items: result.rows.map((r) => ({
          id: r.id,
          channel: r.channel,
          recipient: r.recipient,
          template: r.template,
          subject: r.subject,
          status: r.status,
          createdAt: r.created_at,
        })),
      });
    }
  );

  // Send a test email (+ SMS if a phone is on file) to the current user.
  fastify.post(
    '/notifications/test',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      const email = request.user?.email;
      if (!userId || !email) return reply.status(401).send({ error: 'Unauthorized' });

      const userRes = await query<{ phone: string | null; name: string | null }>(
        'SELECT phone, name FROM users WHERE id = $1',
        [userId]
      );
      const phone = userRes.rows[0]?.phone ?? null;
      const name = userRes.rows[0]?.name ?? null;

      const emailOk = await sendEmail({
        to: email,
        subject: 'FitCoach AI — notification de test',
        html: emailHtml(
          'Notification de test 🔔',
          `Salut ${name ?? ''} ! Ceci confirme que tes notifications par email fonctionnent.`
        ),
        text: 'Ceci confirme que tes notifications par email fonctionnent.',
      });

      const smsOk = phone
        ? await sendSms({ to: phone, body: 'FitCoach AI : ceci est un SMS de test ✅' })
        : false;

      return reply.send({ email: emailOk, sms: smsOk, hasPhone: Boolean(phone) });
    }
  );
};
