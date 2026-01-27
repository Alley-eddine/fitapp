import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createWorkoutSchema } from '@fitapp/shared';
import { query } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

interface WorkoutRow {
  id: string;
  user_id: string;
  type: string;
  duration_minutes: number;
  calories_burned: number | null;
  notes: string | null;
  ai_guided: boolean;
  logged_at: Date;
}

export const workoutRoutes = (fastify: FastifyInstance) => {
  // Get user's workouts
  fastify.get(
    '/workouts',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const { limit = '10', offset = '0' } = request.query as { limit?: string; offset?: string };

      const result = await query<WorkoutRow>(
        `SELECT * FROM workouts WHERE user_id = $1 ORDER BY logged_at DESC LIMIT $2 OFFSET $3`,
        [userId, parseInt(limit), parseInt(offset)]
      );

      const countResult = await query<{ count: string }>(
        'SELECT COUNT(*) FROM workouts WHERE user_id = $1',
        [userId]
      );

      return await reply.send({
        items: result.rows.map(mapWorkout),
        total: parseInt(countResult.rows[0]?.count ?? '0'),
      });
    }
  );

  // Create workout
  fastify.post(
    '/workouts',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const validation = createWorkoutSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.flatten() });
      }

      const data = validation.data;

      const result = await query<WorkoutRow>(
        `INSERT INTO workouts (user_id, type, duration_minutes, calories_burned, notes, ai_guided)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, data.type, data.durationMinutes, data.caloriesBurned ?? null, data.notes ?? null, data.aiGuided ?? false]
      );

      return await reply.status(201).send(mapWorkout(result.rows[0]));
    }
  );

  // Get single workout
  fastify.get(
    '/workouts/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      const { id } = request.params as { id: string };
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query<WorkoutRow>(
        'SELECT * FROM workouts WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (!result.rows[0]) {
        return reply.status(404).send({ error: 'Workout not found' });
      }

      return await reply.send(mapWorkout(result.rows[0]));
    }
  );

  // Delete workout
  fastify.delete(
    '/workouts/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      const { id } = request.params as { id: string };
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      await query('DELETE FROM workouts WHERE id = $1 AND user_id = $2', [id, userId]);

      return await reply.status(204).send();
    }
  );

  // Get weekly stats
  fastify.get(
    '/workouts/stats/weekly',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query<{ count: string; total_minutes: string }>(
        `SELECT COUNT(*) as count, COALESCE(SUM(duration_minutes), 0) as total_minutes
         FROM workouts
         WHERE user_id = $1 AND logged_at >= NOW() - INTERVAL '7 days'`,
        [userId]
      );

      return await reply.send({
        workoutsThisWeek: parseInt(result.rows[0]?.count ?? '0'),
        totalMinutes: parseInt(result.rows[0]?.total_minutes ?? '0'),
      });
    }
  );
};

const mapWorkout = (row: WorkoutRow | undefined) => {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    durationMinutes: row.duration_minutes,
    caloriesBurned: row.calories_burned,
    notes: row.notes,
    aiGuided: row.ai_guided,
    loggedAt: row.logged_at,
  };
};
