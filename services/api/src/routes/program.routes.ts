import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PoolClient } from 'pg';
import { createProgramSchema, assignProgramSchema, type ProgramDayInput } from '@fitapp/shared';
import { pool, query } from '../config/database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

interface ProgramRow {
  id: string;
  coach_id: string;
  name: string;
  phase: number;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

interface DayRow {
  id: string;
  program_id: string;
  day_of_week: number;
  title: string;
}

interface ProgramExerciseRow {
  id: string;
  day_id: string;
  name: string;
  exercise_type: string;
  sets: number | null;
  reps: number | null;
  weight_kg: string | number | null;
  duration_seconds: number | null;
  work_seconds: number | null;
  rest_seconds: number | null;
  rounds: number | null;
  order_index: number;
}

const mapExercise = (e: ProgramExerciseRow) => ({
  id: e.id,
  name: e.name,
  exerciseType: e.exercise_type,
  sets: e.sets,
  reps: e.reps,
  weightKg: e.weight_kg == null ? null : Number(e.weight_kg),
  durationSeconds: e.duration_seconds,
  workSeconds: e.work_seconds,
  restSeconds: e.rest_seconds,
  rounds: e.rounds,
});

/** Loads a program with its days and exercises, or null when not found. */
const loadProgram = async (programId: string, coachId: string) => {
  const programRes = await query<ProgramRow>(
    'SELECT * FROM training_programs WHERE id = $1 AND coach_id = $2',
    [programId, coachId]
  );
  const program = programRes.rows[0];
  if (!program) return null;

  const daysRes = await query<DayRow>(
    'SELECT * FROM training_program_days WHERE program_id = $1 ORDER BY day_of_week',
    [programId]
  );
  const dayIds = daysRes.rows.map((d) => d.id);

  const exercisesByDay: Record<string, ProgramExerciseRow[]> = {};
  if (dayIds.length > 0) {
    const exRes = await query<ProgramExerciseRow>(
      'SELECT * FROM training_program_exercises WHERE day_id = ANY($1) ORDER BY order_index',
      [dayIds]
    );
    for (const ex of exRes.rows) {
      (exercisesByDay[ex.day_id] ??= []).push(ex);
    }
  }

  return {
    id: program.id,
    name: program.name,
    phase: program.phase,
    description: program.description,
    createdAt: program.created_at,
    days: daysRes.rows.map((d) => ({
      id: d.id,
      dayOfWeek: d.day_of_week,
      title: d.title,
      exercises: (exercisesByDay[d.id] ?? []).map(mapExercise),
    })),
  };
};

/** Inserts the weekly structure (days + exercises) for a program. */
const insertDays = async (client: PoolClient, programId: string, days: ProgramDayInput[]) => {
  for (const day of days) {
    const dayRes = await client.query<DayRow>(
      `INSERT INTO training_program_days (program_id, day_of_week, title)
       VALUES ($1, $2, $3) RETURNING *`,
      [programId, day.dayOfWeek, day.title]
    );
    const dayId = dayRes.rows[0]?.id;
    if (!dayId) continue;

    for (let i = 0; i < day.exercises.length; i++) {
      const ex = day.exercises[i];
      if (!ex) continue;
      await client.query(
        `INSERT INTO training_program_exercises
           (day_id, name, exercise_type, sets, reps, weight_kg, duration_seconds, work_seconds, rest_seconds, rounds, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          dayId,
          ex.name,
          ex.exerciseType,
          ex.sets ?? null,
          ex.reps ?? null,
          ex.weightKg ?? null,
          ex.durationSeconds ?? null,
          ex.workSeconds ?? null,
          ex.restSeconds ?? null,
          ex.rounds ?? null,
          i,
        ]
      );
    }
  }
};

export const programRoutes = (fastify: FastifyInstance) => {
  // --- Create a program ---------------------------------------------------
  fastify.post(
    '/coach/programs',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const validation = createProgramSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.flatten() });
      }
      const data = validation.data;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const programRes = await client.query<ProgramRow>(
          `INSERT INTO training_programs (coach_id, name, phase, description)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [coachId, data.name, data.phase ?? 1, data.description ?? null]
        );
        const program = programRes.rows[0];
        if (!program) throw new Error('Program insert failed');

        await insertDays(client, program.id, data.days);
        await client.query('COMMIT');

        return await reply.status(201).send(await loadProgram(program.id, coachId));
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  );

  // --- List programs ------------------------------------------------------
  fastify.get(
    '/coach/programs',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query<ProgramRow & { day_count: string; assigned_count: string }>(
        `SELECT p.*,
                (SELECT COUNT(*) FROM training_program_days d WHERE d.program_id = p.id) AS day_count,
                (SELECT COUNT(*) FROM program_assignments a WHERE a.program_id = p.id AND a.status = 'active') AS assigned_count
           FROM training_programs p
          WHERE p.coach_id = $1
          ORDER BY p.created_at DESC`,
        [coachId]
      );

      return reply.send({
        items: result.rows.map((p) => ({
          id: p.id,
          name: p.name,
          phase: p.phase,
          description: p.description,
          dayCount: parseInt(p.day_count, 10),
          assignedCount: parseInt(p.assigned_count, 10),
          createdAt: p.created_at,
        })),
      });
    }
  );

  // --- Program detail -----------------------------------------------------
  fastify.get(
    '/coach/programs/:id',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      const { id } = request.params as { id: string };
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const program = await loadProgram(id, coachId);
      if (!program) return reply.status(404).send({ error: 'Programme introuvable' });
      return reply.send(program);
    }
  );

  // --- Replace a program's content ---------------------------------------
  fastify.put(
    '/coach/programs/:id',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      const { id } = request.params as { id: string };
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const validation = createProgramSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.flatten() });
      }
      const data = validation.data;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const updated = await client.query<ProgramRow>(
          `UPDATE training_programs
              SET name = $3, phase = $4, description = $5, updated_at = NOW()
            WHERE id = $1 AND coach_id = $2
            RETURNING *`,
          [id, coachId, data.name, data.phase ?? 1, data.description ?? null]
        );
        if (!updated.rows[0]) {
          await client.query('ROLLBACK');
          return await reply.status(404).send({ error: 'Programme introuvable' });
        }

        // Days cascade-delete their exercises.
        await client.query('DELETE FROM training_program_days WHERE program_id = $1', [id]);
        await insertDays(client, id, data.days);
        await client.query('COMMIT');

        return await reply.send(await loadProgram(id, coachId));
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  );

  // --- Delete a program ---------------------------------------------------
  fastify.delete(
    '/coach/programs/:id',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      const { id } = request.params as { id: string };
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query(
        'DELETE FROM training_programs WHERE id = $1 AND coach_id = $2 RETURNING id',
        [id, coachId]
      );
      if (result.rowCount === 0) return reply.status(404).send({ error: 'Programme introuvable' });
      return reply.status(204).send();
    }
  );

  // --- Assign a program to one of the coach's students --------------------
  fastify.post(
    '/coach/programs/:id/assign',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      const { id } = request.params as { id: string };
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const validation = assignProgramSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.flatten() });
      }
      const { studentId, startDate } = validation.data;

      const owns = await query(
        'SELECT 1 FROM training_programs WHERE id = $1 AND coach_id = $2',
        [id, coachId]
      );
      if (owns.rowCount === 0) return reply.status(404).send({ error: 'Programme introuvable' });

      const linked = await query(
        `SELECT 1 FROM coach_students WHERE coach_id = $1 AND student_id = $2 AND status = 'active'`,
        [coachId, studentId]
      );
      if (linked.rowCount === 0) {
        return reply.status(403).send({ error: "Cet élève n'est pas rattaché à toi" });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Only one active program per student.
        await client.query(
          `UPDATE program_assignments SET status = 'archived'
            WHERE student_id = $1 AND status = 'active'`,
          [studentId]
        );
        const assignment = await client.query<{ id: string; start_date: Date }>(
          `INSERT INTO program_assignments (program_id, student_id, coach_id, start_date)
           VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE))
           RETURNING id, start_date`,
          [id, studentId, coachId, startDate ?? null]
        );
        await client.query('COMMIT');

        return await reply.status(201).send({
          assignmentId: assignment.rows[0]?.id,
          programId: id,
          studentId,
          startDate: assignment.rows[0]?.start_date,
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
