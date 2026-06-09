import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../config/database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

interface StudentRow {
  id: string;
  email: string;
  name: string | null;
  status: string;
  created_at: Date;
}

export const coachRoutes = (fastify: FastifyInstance) => {
  // List the students linked to the authenticated coach (coach-only).
  fastify.get(
    '/coach/students',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query<StudentRow>(
        `SELECT u.id, u.email, u.name, cs.status, cs.created_at
           FROM coach_students cs
           JOIN users u ON u.id = cs.student_id
          WHERE cs.coach_id = $1
          ORDER BY cs.created_at DESC`,
        [coachId]
      );

      return reply.send({
        students: result.rows.map((r) => ({
          id: r.id,
          email: r.email,
          name: r.name,
          status: r.status,
          since: r.created_at,
        })),
      });
    }
  );
};
