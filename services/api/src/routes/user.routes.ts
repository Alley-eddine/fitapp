import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { updateUserSchema } from '@fitapp/shared';
import { query } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  subscription: string;
}

export const userRoutes = (fastify: FastifyInstance) => {
  // Get current user
  fastify.get(
    '/user',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query<UserRow>(
        'SELECT id, email, name, avatar_url, subscription FROM users WHERE id = $1',
        [userId]
      );

      if (!result.rows[0]) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return await reply.send(mapUser(result.rows[0]));
    }
  );

  // Update user
  fastify.put(
    '/user',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const validation = updateUserSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.flatten() });
      }

      const data = validation.data;

      const result = await query<UserRow>(
        `UPDATE users SET
          name = COALESCE($2, name),
          avatar_url = COALESCE($3, avatar_url),
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, name, avatar_url, subscription`,
        [userId, data.name ?? null, data.avatarUrl ?? null]
      );

      if (!result.rows[0]) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return await reply.send(mapUser(result.rows[0]));
    }
  );
};

const mapUser = (row: UserRow) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  avatarUrl: row.avatar_url,
  subscriptionTier: row.subscription,
});
