import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createInvitationSchema } from '@fitapp/shared';
import { pool, query } from '../config/database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import {
  generateInvitationCode,
  invitationExpiresAt,
  isInvitationUsable,
} from '../domain/invitations.js';

interface InvitationRow {
  id: string;
  coach_id: string;
  code: string;
  email: string | null;
  status: string;
  expires_at: Date;
  accepted_by: string | null;
  accepted_at: Date | null;
  created_at: Date;
}

const mapInvitation = (row: InvitationRow) => ({
  id: row.id,
  code: row.code,
  email: row.email,
  status: row.status,
  expiresAt: row.expires_at,
  acceptedAt: row.accepted_at,
  createdAt: row.created_at,
});

export const invitationRoutes = (fastify: FastifyInstance) => {
  // --- Coach: create an invitation ---------------------------------------
  fastify.post(
    '/coach/invitations',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const validation = createInvitationSchema.safeParse(request.body ?? {});
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.flatten() });
      }

      const expiresAt = invitationExpiresAt(new Date());

      // Retry a few times in the unlikely event of a code collision.
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const result = await query<InvitationRow>(
            `INSERT INTO coach_invitations (coach_id, code, email, expires_at)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [coachId, generateInvitationCode(), validation.data.email ?? null, expiresAt]
          );
          const row = result.rows[0];
          if (row) return await reply.status(201).send(mapInvitation(row));
        } catch (err) {
          const code = (err as { code?: string }).code;
          if (code !== '23505') throw err; // not a unique violation → real error
        }
      }

      return reply.status(500).send({ error: 'Could not generate an invitation code' });
    }
  );

  // --- Coach: list invitations -------------------------------------------
  fastify.get(
    '/coach/invitations',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query<InvitationRow>(
        `SELECT * FROM coach_invitations WHERE coach_id = $1 ORDER BY created_at DESC`,
        [coachId]
      );
      return reply.send({ items: result.rows.map(mapInvitation) });
    }
  );

  // --- Coach: revoke an invitation ---------------------------------------
  fastify.delete(
    '/coach/invitations/:id',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      const { id } = request.params as { id: string };
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query<InvitationRow>(
        `UPDATE coach_invitations SET status = 'revoked'
          WHERE id = $1 AND coach_id = $2 AND status = 'pending'
          RETURNING *`,
        [id, coachId]
      );
      if (!result.rows[0]) return reply.status(404).send({ error: 'Invitation not found' });
      return reply.send(mapInvitation(result.rows[0]));
    }
  );

  // --- Public: look up an invitation by code ------------------------------
  fastify.get('/invitations/:code', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.params as { code: string };

    const result = await query<InvitationRow & { coach_name: string | null }>(
      `SELECT i.*, u.name AS coach_name
         FROM coach_invitations i
         JOIN users u ON u.id = i.coach_id
        WHERE i.code = $1`,
      [code.toUpperCase()]
    );
    const invitation = result.rows[0];
    if (!invitation) return reply.status(404).send({ error: 'Invitation introuvable' });

    return reply.send({
      code: invitation.code,
      coachName: invitation.coach_name,
      status: invitation.status,
      expiresAt: invitation.expires_at,
      usable: isInvitationUsable(invitation, new Date()),
    });
  });

  // --- Accept an invitation (authenticated) -------------------------------
  fastify.post(
    '/invitations/:code/accept',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      const { code } = request.params as { code: string };
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const invRes = await client.query<InvitationRow>(
          `SELECT * FROM coach_invitations WHERE code = $1 FOR UPDATE`,
          [code.toUpperCase()]
        );
        const invitation = invRes.rows[0];
        if (!invitation) {
          await client.query('ROLLBACK');
          return await reply.status(404).send({ error: 'Invitation introuvable' });
        }
        if (!isInvitationUsable(invitation, new Date())) {
          await client.query('ROLLBACK');
          return await reply.status(410).send({ error: 'Invitation expirée ou déjà utilisée' });
        }
        if (invitation.coach_id === userId) {
          await client.query('ROLLBACK');
          return await reply.status(400).send({ error: 'Un coach ne peut pas rejoindre sa propre invitation' });
        }

        // A student belongs to at most one coach.
        const existing = await client.query<{ coach_id: string }>(
          `SELECT coach_id FROM coach_students WHERE student_id = $1 AND status = 'active'`,
          [userId]
        );
        const current = existing.rows[0];
        if (current && current.coach_id !== invitation.coach_id) {
          await client.query('ROLLBACK');
          return await reply.status(409).send({ error: 'Tu es déjà rattaché à un coach' });
        }

        await client.query(
          `INSERT INTO coach_students (coach_id, student_id)
           VALUES ($1, $2)
           ON CONFLICT (coach_id, student_id) DO UPDATE SET status = 'active'`,
          [invitation.coach_id, userId]
        );

        // A lambda user becomes a student; an existing coach keeps their role.
        await client.query(`UPDATE users SET role = 'student' WHERE id = $1 AND role = 'user'`, [
          userId,
        ]);

        await client.query(
          `UPDATE coach_invitations
              SET status = 'accepted', accepted_by = $2, accepted_at = NOW()
            WHERE id = $1`,
          [invitation.id, userId]
        );

        await client.query('COMMIT');

        const coachRes = await query<{ name: string | null; email: string }>(
          'SELECT name, email FROM users WHERE id = $1',
          [invitation.coach_id]
        );

        return await reply.send({
          joined: true,
          coach: {
            id: invitation.coach_id,
            name: coachRes.rows[0]?.name ?? null,
          },
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  );
};
