import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logWeightSchema } from '@fitapp/shared';
import { query } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

interface WeightRow {
  id: string;
  user_id: string;
  weight: number;
  logged_at: Date;
}

export const weightRoutes = (fastify: FastifyInstance) => {
  // Get weight history
  fastify.get(
    '/weight',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const { days = '30' } = request.query as { days?: string };

      const result = await query<WeightRow>(
        `SELECT * FROM weight_logs
         WHERE user_id = $1 AND logged_at >= NOW() - INTERVAL '1 day' * $2
         ORDER BY logged_at DESC`,
        [userId, parseInt(days)]
      );

      return await reply.send(result.rows.map(mapWeight));
    }
  );

  // Log weight
  fastify.post(
    '/weight',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const validation = logWeightSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.flatten() });
      }

      const { weight } = validation.data;

      // Upsert for today
      const result = await query<WeightRow>(
        `INSERT INTO weight_logs (user_id, weight, logged_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, (logged_at::DATE)) DO UPDATE SET weight = $2
         RETURNING *`,
        [userId, weight]
      );

      // Also update current_weight in profile
      await query(
        'UPDATE profiles SET current_weight = $2 WHERE user_id = $1',
        [userId, weight]
      );

      return await reply.status(201).send(mapWeight(result.rows[0]));
    }
  );

  // Get latest weight
  fastify.get(
    '/weight/latest',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query<WeightRow>(
        'SELECT * FROM weight_logs WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 1',
        [userId]
      );

      if (!result.rows[0]) {
        return reply.status(404).send({ error: 'No weight logged yet' });
      }

      return await reply.send(mapWeight(result.rows[0]));
    }
  );
};

const mapWeight = (row: WeightRow | undefined) => {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    weight: parseFloat(String(row.weight)),
    loggedAt: row.logged_at,
  };
};
