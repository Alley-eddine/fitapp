import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logStepsSchema } from '@fitapp/shared';
import { query } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

interface StepsRow {
  id: string;
  user_id: string;
  steps: number;
  goal: number;
  logged_at: Date;
}

export const stepsRoutes = (fastify: FastifyInstance) => {
  // Get steps history
  fastify.get(
    '/steps',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const { days = '7' } = request.query as { days?: string };

      const result = await query<StepsRow>(
        `SELECT * FROM steps_logs
         WHERE user_id = $1 AND logged_at >= CURRENT_DATE - INTERVAL '1 day' * $2
         ORDER BY logged_at DESC`,
        [userId, parseInt(days)]
      );

      return await reply.send(result.rows.map(mapSteps));
    }
  );

  // Log steps for today
  fastify.post(
    '/steps',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const validation = logStepsSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.flatten() });
      }

      const { steps, goal = 10000 } = validation.data;

      // Upsert for today
      const result = await query<StepsRow>(
        `INSERT INTO steps_logs (user_id, steps, goal, logged_at)
         VALUES ($1, $2, $3, CURRENT_DATE)
         ON CONFLICT (user_id, logged_at) DO UPDATE SET steps = $2, goal = $3
         RETURNING *`,
        [userId, steps, goal]
      );

      return await reply.status(201).send(mapSteps(result.rows[0]));
    }
  );

  // Get today's steps
  fastify.get(
    '/steps/today',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query<StepsRow>(
        'SELECT * FROM steps_logs WHERE user_id = $1 AND logged_at = CURRENT_DATE',
        [userId]
      );

      if (!result.rows[0]) {
        return await reply.send({ steps: 0, goal: 10000, percentage: 0 });
      }

      const row = result.rows[0];
      return await reply.send({
        ...mapSteps(row),
        percentage: Math.round((row.steps / row.goal) * 100),
      });
    }
  );
};

const mapSteps = (row: StepsRow | undefined) => {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    steps: row.steps,
    goal: row.goal,
    loggedAt: row.logged_at,
  };
};
