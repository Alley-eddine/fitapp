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

interface StudentWorkoutRow {
  id: string;
  type: string;
  duration_minutes: number;
  calories_burned: number | null;
  logged_at: Date;
}

interface StudentWeightRow {
  weight: string | number;
  logged_at: Date;
}

interface ActiveProgramRow {
  name: string;
  phase: number;
  day_count: string;
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

  // Progress of one linked student: recent sessions, weight trend, adherence.
  fastify.get(
    '/coach/students/:id',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      const { id } = request.params as { id: string };
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const linkRes = await query<StudentRow>(
        `SELECT u.id, u.email, u.name, cs.status, cs.created_at
           FROM coach_students cs
           JOIN users u ON u.id = cs.student_id
          WHERE cs.coach_id = $1 AND cs.student_id = $2 AND cs.status = 'active'`,
        [coachId, id]
      );
      const student = linkRes.rows[0];
      if (!student) return reply.status(404).send({ error: 'Élève introuvable' });

      const [workoutsRes, weightsRes, programRes, weekRes] = await Promise.all([
        query<StudentWorkoutRow>(
          `SELECT id, type, duration_minutes, calories_burned, logged_at
             FROM workouts WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 20`,
          [id]
        ),
        query<StudentWeightRow>(
          `SELECT weight, logged_at FROM weight_logs
            WHERE user_id = $1 AND logged_at > NOW() - INTERVAL '90 days'
            ORDER BY logged_at ASC`,
          [id]
        ),
        query<ActiveProgramRow>(
          `SELECT p.name, p.phase,
                  (SELECT COUNT(*) FROM training_program_days d WHERE d.program_id = p.id) AS day_count
             FROM program_assignments a
             JOIN training_programs p ON p.id = a.program_id
            WHERE a.student_id = $1 AND a.status = 'active'
            LIMIT 1`,
          [id]
        ),
        query<{ count: string }>(
          `SELECT COUNT(*) FROM workouts
            WHERE user_id = $1 AND logged_at > NOW() - INTERVAL '7 days'`,
          [id]
        ),
      ]);

      const program = programRes.rows[0];
      const plannedPerWeek = program ? parseInt(program.day_count, 10) : null;

      return reply.send({
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          since: student.created_at,
        },
        program: program ? { name: program.name, phase: program.phase } : null,
        adherence: {
          completedLast7Days: parseInt(weekRes.rows[0]?.count ?? '0', 10),
          plannedPerWeek,
        },
        workouts: workoutsRes.rows.map((w) => ({
          id: w.id,
          type: w.type,
          durationMinutes: w.duration_minutes,
          caloriesBurned: w.calories_burned,
          loggedAt: w.logged_at,
        })),
        weights: weightsRes.rows.map((w) => ({
          weight: Number(w.weight),
          loggedAt: w.logged_at,
        })),
      });
    }
  );
};
