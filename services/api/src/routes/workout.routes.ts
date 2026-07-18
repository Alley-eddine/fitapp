import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createWorkoutSchema } from '@fitapp/shared';
import { query } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendEmail, emailHtml } from '../notifications.client.js';
import { estimateCalories } from '../domain/workout-calories.js';

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

interface ExerciseRow {
  id: string;
  workout_id: string;
  name: string;
  exercise_type: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  work_seconds: number | null;
  rest_seconds: number | null;
  rounds: number | null;
  order_index: number;
}

// Rough MET values per exercise type for a calorie-burn estimate.
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

      // Fetch exercises for all workouts
      const workoutIds = result.rows.map(w => w.id);
      const exercisesByWorkout: Record<string, ExerciseRow[]> = {};

      if (workoutIds.length > 0) {
        const exercisesResult = await query<ExerciseRow>(
          `SELECT * FROM workout_exercises WHERE workout_id = ANY($1) ORDER BY order_index`,
          [workoutIds]
        );
        for (const ex of exercisesResult.rows) {
          const workoutId = ex.workout_id;
          if (!exercisesByWorkout[workoutId]) {
            exercisesByWorkout[workoutId] = [];
          }
          exercisesByWorkout[workoutId].push(ex);
        }
      }

      return await reply.send({
        items: result.rows.map(w => mapWorkout(w, exercisesByWorkout[w.id] || [])),
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

      // Estimate calories burned when the client doesn't provide a value.
      let caloriesBurned = data.caloriesBurned ?? null;
      if (caloriesBurned == null) {
        const profileRes = await query<{ current_weight: number | null }>(
          'SELECT current_weight FROM profiles WHERE user_id = $1',
          [userId]
        );
        const weight = Number(profileRes.rows[0]?.current_weight) || 70;
        caloriesBurned = estimateCalories(data.durationMinutes, weight, data.exercises);
      }

      const result = await query<WorkoutRow>(
        `INSERT INTO workouts (user_id, type, duration_minutes, calories_burned, notes, ai_guided)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, data.type, data.durationMinutes, caloriesBurned, data.notes ?? null, data.aiGuided ?? false]
      );

      const workout = result.rows[0];

      // Insert exercises if provided
      const insertedExercises: ExerciseRow[] = [];
      if (data.exercises && data.exercises.length > 0 && workout) {
        for (let i = 0; i < data.exercises.length; i++) {
          const exercise = data.exercises[i];
          if (!exercise) continue;
          const exResult = await query<ExerciseRow>(
            `INSERT INTO workout_exercises (workout_id, name, exercise_type, sets, reps, weight_kg, duration_seconds, work_seconds, rest_seconds, rounds, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
              workout.id,
              exercise.name,
              exercise.exerciseType,
              exercise.sets ?? null,
              exercise.reps ?? null,
              exercise.weightKg ?? null,
              exercise.durationSeconds ?? null,
              exercise.workSeconds ?? null,
              exercise.restSeconds ?? null,
              exercise.rounds ?? null,
              i
            ]
          );
          if (exResult.rows[0]) {
            insertedExercises.push(exResult.rows[0]);
          }
        }
      }

      // Notify the user that their session was logged (best-effort).
      if (workout && request.user?.email) {
        const burned = workout.calories_burned ?? 0;
        void sendEmail({
          to: request.user.email,
          subject: 'Séance enregistrée 💪',
          html: emailHtml(
            'Séance enregistrée 💪',
            `Bravo ! Ta séance « ${workout.type} » est enregistrée (${String(workout.duration_minutes)} min, ${String(burned)} kcal).`
          ),
          text: `Séance « ${workout.type} » enregistrée.`,
        });
      }

      return await reply.status(201).send(mapWorkout(workout, insertedExercises));
    }
  );

  // Update workout
  fastify.put(
    '/workouts/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      const { id } = request.params as { id: string };
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      console.log('PUT /workouts/:id - Request body:', JSON.stringify(request.body, null, 2));
      const validation = createWorkoutSchema.safeParse(request.body);
      if (!validation.success) {
        console.log('PUT /workouts/:id - Validation error:', JSON.stringify(validation.error.flatten(), null, 2));
        return reply.status(400).send({ error: validation.error.flatten() });
      }

      // Check workout exists and belongs to user
      const existing = await query<WorkoutRow>(
        'SELECT * FROM workouts WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      if (!existing.rows[0]) {
        return reply.status(404).send({ error: 'Workout not found' });
      }

      const data = validation.data;

      // Update workout
      const result = await query<WorkoutRow>(
        `UPDATE workouts
         SET type = $1, duration_minutes = $2, calories_burned = $3, notes = $4, ai_guided = $5
         WHERE id = $6 AND user_id = $7
         RETURNING *`,
        [data.type, data.durationMinutes, data.caloriesBurned ?? null, data.notes ?? null, data.aiGuided ?? false, id, userId]
      );

      const workout = result.rows[0];

      // Delete existing exercises
      await query('DELETE FROM workout_exercises WHERE workout_id = $1', [id]);

      // Insert new exercises
      const updatedExercises: ExerciseRow[] = [];
      if (data.exercises && data.exercises.length > 0 && workout) {
        for (let i = 0; i < data.exercises.length; i++) {
          const exercise = data.exercises[i];
          if (!exercise) continue;
          const exResult = await query<ExerciseRow>(
            `INSERT INTO workout_exercises (workout_id, name, exercise_type, sets, reps, weight_kg, duration_seconds, work_seconds, rest_seconds, rounds, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
              workout.id,
              exercise.name,
              exercise.exerciseType,
              exercise.sets ?? null,
              exercise.reps ?? null,
              exercise.weightKg ?? null,
              exercise.durationSeconds ?? null,
              exercise.workSeconds ?? null,
              exercise.restSeconds ?? null,
              exercise.rounds ?? null,
              i
            ]
          );
          if (exResult.rows[0]) {
            updatedExercises.push(exResult.rows[0]);
          }
        }
      }

      return await reply.send(mapWorkout(workout, updatedExercises));
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

      // Fetch exercises for this workout
      const exercisesResult = await query<ExerciseRow>(
        'SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index',
        [id]
      );

      return await reply.send(mapWorkout(result.rows[0], exercisesResult.rows));
    }
  );

  // Delete workout
  fastify.delete(
    '/workouts/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      const { id } = request.params as { id: string };
      console.log('DELETE /workouts/:id - userId:', userId, 'workoutId:', id);
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query('DELETE FROM workouts WHERE id = $1 AND user_id = $2', [id, userId]);
      console.log('DELETE result:', result.rowCount, 'rows deleted');

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

      const result = await query<{ count: string; total_minutes: string; total_calories: string }>(
        `SELECT COUNT(*) as count,
                COALESCE(SUM(duration_minutes), 0) as total_minutes,
                COALESCE(SUM(calories_burned), 0) as total_calories
         FROM workouts
         WHERE user_id = $1 AND logged_at >= NOW() - INTERVAL '7 days'`,
        [userId]
      );

      const row = result.rows[0];
      return await reply.send({
        totalWorkouts: parseInt(row?.count ?? '0'),
        totalDuration: parseInt(row?.total_minutes ?? '0'),
        totalCalories: parseInt(row?.total_calories ?? '0'),
      });
    }
  );
};

const mapWorkout = (row: WorkoutRow | undefined, exercises: ExerciseRow[] = []) => {
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
    exercises: exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      exerciseType: ex.exercise_type,
      sets: ex.sets,
      reps: ex.reps,
      weightKg: ex.weight_kg,
      durationSeconds: ex.duration_seconds,
      workSeconds: ex.work_seconds,
      restSeconds: ex.rest_seconds,
      rounds: ex.rounds,
    })),
  };
};
