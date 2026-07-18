import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { findDayForDate, findNextDay, isoDayOfWeek } from '../domain/program-schedule.js';

interface CoachRow {
  id: string;
  name: string | null;
  email: string;
  since: Date;
}

interface AssignedProgramRow {
  program_id: string;
  name: string;
  phase: number;
  description: string | null;
  start_date: Date;
  coach_id: string;
  coach_name: string | null;
}

interface DayRow {
  id: string;
  day_of_week: number;
  title: string;
}

interface ExerciseRow {
  id: string;
  day_id: string;
  name: string;
  exercise_type: string;
  sets: number | null;
  reps: number | null;
  weight_kg: string | number | null;
  rest_seconds: number | null;
}

const mapExercise = (e: ExerciseRow) => ({
  id: e.id,
  name: e.name,
  exerciseType: e.exercise_type,
  sets: e.sets,
  reps: e.reps,
  weightKg: e.weight_kg == null ? null : Number(e.weight_kg),
  restSeconds: e.rest_seconds,
});

export const studentRoutes = (fastify: FastifyInstance) => {
  // --- The student's coach (null when autonomous) -------------------------
  fastify.get(
    '/student/coach',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query<CoachRow>(
        `SELECT u.id, u.name, u.email, cs.created_at AS since
           FROM coach_students cs
           JOIN users u ON u.id = cs.coach_id
          WHERE cs.student_id = $1 AND cs.status = 'active'`,
        [userId]
      );
      const coach = result.rows[0];
      return reply.send({
        coach: coach ? { id: coach.id, name: coach.name, email: coach.email, since: coach.since } : null,
      });
    }
  );

  // --- The active program, with today's session resolved ------------------
  fastify.get(
    '/student/program',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const assignedRes = await query<AssignedProgramRow>(
        `SELECT p.id AS program_id, p.name, p.phase, p.description,
                a.start_date, a.coach_id, u.name AS coach_name
           FROM program_assignments a
           JOIN training_programs p ON p.id = a.program_id
           JOIN users u ON u.id = a.coach_id
          WHERE a.student_id = $1 AND a.status = 'active'
          LIMIT 1`,
        [userId]
      );
      const assigned = assignedRes.rows[0];
      if (!assigned) return reply.send({ program: null, today: null, next: null });

      const daysRes = await query<DayRow>(
        'SELECT id, day_of_week, title FROM training_program_days WHERE program_id = $1 ORDER BY day_of_week',
        [assigned.program_id]
      );
      const dayIds = daysRes.rows.map((d) => d.id);

      const byDay: Record<string, ExerciseRow[]> = {};
      if (dayIds.length > 0) {
        const exRes = await query<ExerciseRow>(
          `SELECT id, day_id, name, exercise_type, sets, reps, weight_kg, rest_seconds
             FROM training_program_exercises WHERE day_id = ANY($1) ORDER BY order_index`,
          [dayIds]
        );
        for (const ex of exRes.rows) (byDay[ex.day_id] ??= []).push(ex);
      }

      const days = daysRes.rows.map((d) => ({
        id: d.id,
        dayOfWeek: d.day_of_week,
        title: d.title,
        exercises: (byDay[d.id] ?? []).map(mapExercise),
      }));

      const now = new Date();
      const today = findDayForDate(days, now);
      const next = today ? null : findNextDay(days, now);

      return reply.send({
        program: {
          id: assigned.program_id,
          name: assigned.name,
          phase: assigned.phase,
          description: assigned.description,
          startDate: assigned.start_date,
          coach: { id: assigned.coach_id, name: assigned.coach_name },
          days,
        },
        todayDayOfWeek: isoDayOfWeek(now),
        today,
        next,
      });
    }
  );
};
