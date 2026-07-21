import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { studentMealRecipeSchema } from '@fitapp/shared';
import { query } from '../config/database.js';
import { env } from '../config/env.js';
import { authMiddleware } from '../middleware/auth.js';
import { findDayForDate, findNextDay, isoDayOfWeek } from '../domain/program-schedule.js';
import { buildMealRecipeRequest } from '../domain/meal-recipe-request.js';

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

interface AssignedPlanRow {
  plan_id: string;
  name: string;
  phase: number;
  daily_calories: number | null;
  notes: string | null;
  start_date: Date;
  coach_id: string;
  coach_name: string | null;
}

interface MealRow {
  id: string;
  label: string;
  target_calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  foods: string[] | null;
  notes: string | null;
}

interface SupplementRow {
  id: string;
  name: string;
  dosage: string | null;
  timing: string | null;
}

const mapMeal = (m: MealRow) => ({
  id: m.id,
  label: m.label,
  targetCalories: m.target_calories,
  proteinG: m.protein_g,
  carbsG: m.carbs_g,
  fatG: m.fat_g,
  foods: m.foods ?? [],
  notes: m.notes,
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

  // --- The active nutrition plan (meals + supplements) --------------------
  fastify.get(
    '/student/nutrition',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const assignedRes = await query<AssignedPlanRow>(
        `SELECT p.id AS plan_id, p.name, p.phase, p.daily_calories, p.notes,
                a.start_date, a.coach_id, u.name AS coach_name
           FROM nutrition_assignments a
           JOIN nutrition_plans p ON p.id = a.plan_id
           JOIN users u ON u.id = a.coach_id
          WHERE a.student_id = $1 AND a.status = 'active'
          LIMIT 1`,
        [userId]
      );
      const assigned = assignedRes.rows[0];
      if (!assigned) return reply.send({ plan: null });

      const [mealsRes, suppsRes] = await Promise.all([
        query<MealRow>(
          `SELECT id, label, target_calories, protein_g, carbs_g, fat_g, foods, notes
             FROM nutrition_meals WHERE plan_id = $1 ORDER BY order_index`,
          [assigned.plan_id]
        ),
        query<SupplementRow>(
          'SELECT id, name, dosage, timing FROM nutrition_supplements WHERE plan_id = $1 ORDER BY order_index',
          [assigned.plan_id]
        ),
      ]);

      return reply.send({
        plan: {
          id: assigned.plan_id,
          name: assigned.name,
          phase: assigned.phase,
          dailyCalories: assigned.daily_calories,
          notes: assigned.notes,
          startDate: assigned.start_date,
          coach: { id: assigned.coach_id, name: assigned.coach_name },
          meals: mealsRes.rows.map(mapMeal),
          supplements: suppsRes.rows,
        },
      });
    }
  );

  // --- AI recipe constrained by an imposed meal ---------------------------
  // The coach's frame is authoritative: targets are resolved server-side and
  // any client-provided preference is ignored.
  fastify.post(
    '/student/nutrition/meals/:mealId/recipe',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      const { mealId } = request.params as { mealId: string };
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const validation = studentMealRecipeSchema.safeParse(request.body ?? {});
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.flatten() });
      }

      const mealRes = await query<MealRow>(
        `SELECT m.id, m.label, m.target_calories, m.protein_g, m.carbs_g, m.fat_g, m.foods, m.notes
           FROM nutrition_meals m
           JOIN nutrition_assignments a ON a.plan_id = m.plan_id
          WHERE m.id = $1 AND a.student_id = $2 AND a.status = 'active'`,
        [mealId, userId]
      );
      const mealRow = mealRes.rows[0];
      if (!mealRow) return reply.status(404).send({ error: 'Repas introuvable dans ton plan' });

      const meal = mapMeal(mealRow);
      const recipeRequest = buildMealRecipeRequest(meal, validation.data.ingredients ?? []);
      if (!recipeRequest) {
        return reply.status(400).send({
          error: 'Aucun aliment dans ce repas — indique ce que tu as sous la main',
        });
      }

      try {
        const response = await fetch(`${env.AI_SERVICE_URL}/api/ai/generate-recipe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: request.headers.authorization ?? '',
          },
          body: JSON.stringify(recipeRequest),
        });
        const data = (await response.json()) as Record<string, unknown>;
        return await reply.status(response.status).send({ ...data, meal });
      } catch (err) {
        console.error('AI service error:', err);
        return reply.status(503).send({ error: 'AI service unavailable' });
      }
    }
  );
};
