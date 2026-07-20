import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PoolClient } from 'pg';
import {
  createNutritionPlanSchema,
  assignNutritionPlanSchema,
  type NutritionMealInput,
  type NutritionSupplementInput,
} from '@fitapp/shared';
import { pool, query } from '../config/database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

interface PlanRow {
  id: string;
  coach_id: string;
  name: string;
  phase: number;
  daily_calories: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface MealRow {
  id: string;
  plan_id: string;
  label: string;
  order_index: number;
  target_calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  foods: string[] | null;
  notes: string | null;
}

interface SupplementRow {
  id: string;
  plan_id: string;
  name: string;
  dosage: string | null;
  timing: string | null;
  order_index: number;
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

const mapSupplement = (s: SupplementRow) => ({
  id: s.id,
  name: s.name,
  dosage: s.dosage,
  timing: s.timing,
});

/** Loads a plan with its meals and supplements, or null when not found. */
const loadPlan = async (planId: string, coachId: string) => {
  const planRes = await query<PlanRow>(
    'SELECT * FROM nutrition_plans WHERE id = $1 AND coach_id = $2',
    [planId, coachId]
  );
  const plan = planRes.rows[0];
  if (!plan) return null;

  const [mealsRes, suppsRes] = await Promise.all([
    query<MealRow>('SELECT * FROM nutrition_meals WHERE plan_id = $1 ORDER BY order_index', [
      planId,
    ]),
    query<SupplementRow>(
      'SELECT * FROM nutrition_supplements WHERE plan_id = $1 ORDER BY order_index',
      [planId]
    ),
  ]);

  return {
    id: plan.id,
    name: plan.name,
    phase: plan.phase,
    dailyCalories: plan.daily_calories,
    notes: plan.notes,
    createdAt: plan.created_at,
    meals: mealsRes.rows.map(mapMeal),
    supplements: suppsRes.rows.map(mapSupplement),
  };
};

/** Inserts the meals and supplements of a plan, preserving their order. */
const insertPlanContent = async (
  client: PoolClient,
  planId: string,
  meals: NutritionMealInput[],
  supplements: NutritionSupplementInput[]
) => {
  for (let i = 0; i < meals.length; i++) {
    const meal = meals[i];
    if (!meal) continue;
    await client.query(
      `INSERT INTO nutrition_meals
         (plan_id, label, order_index, target_calories, protein_g, carbs_g, fat_g, foods, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        planId,
        meal.label,
        i,
        meal.targetCalories ?? null,
        meal.proteinG ?? null,
        meal.carbsG ?? null,
        meal.fatG ?? null,
        meal.foods,
        meal.notes ?? null,
      ]
    );
  }

  for (let i = 0; i < supplements.length; i++) {
    const supp = supplements[i];
    if (!supp) continue;
    await client.query(
      `INSERT INTO nutrition_supplements (plan_id, name, dosage, timing, order_index)
       VALUES ($1, $2, $3, $4, $5)`,
      [planId, supp.name, supp.dosage ?? null, supp.timing ?? null, i]
    );
  }
};

export const nutritionPlanRoutes = (fastify: FastifyInstance) => {
  // --- Create a plan ------------------------------------------------------
  fastify.post(
    '/coach/nutrition-plans',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const validation = createNutritionPlanSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.flatten() });
      }
      const data = validation.data;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const planRes = await client.query<PlanRow>(
          `INSERT INTO nutrition_plans (coach_id, name, phase, daily_calories, notes)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [coachId, data.name, data.phase ?? 1, data.dailyCalories ?? null, data.notes ?? null]
        );
        const plan = planRes.rows[0];
        if (!plan) throw new Error('Nutrition plan insert failed');

        await insertPlanContent(client, plan.id, data.meals, data.supplements);
        await client.query('COMMIT');

        return await reply.status(201).send(await loadPlan(plan.id, coachId));
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  );

  // --- List plans ---------------------------------------------------------
  fastify.get(
    '/coach/nutrition-plans',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query<PlanRow & { meal_count: string; assigned_count: string }>(
        `SELECT p.*,
                (SELECT COUNT(*) FROM nutrition_meals m WHERE m.plan_id = p.id) AS meal_count,
                (SELECT COUNT(*) FROM nutrition_assignments a WHERE a.plan_id = p.id AND a.status = 'active') AS assigned_count
           FROM nutrition_plans p
          WHERE p.coach_id = $1
          ORDER BY p.created_at DESC`,
        [coachId]
      );

      return reply.send({
        items: result.rows.map((p) => ({
          id: p.id,
          name: p.name,
          phase: p.phase,
          dailyCalories: p.daily_calories,
          mealCount: parseInt(p.meal_count, 10),
          assignedCount: parseInt(p.assigned_count, 10),
          createdAt: p.created_at,
        })),
      });
    }
  );

  // --- Plan detail --------------------------------------------------------
  fastify.get(
    '/coach/nutrition-plans/:id',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      const { id } = request.params as { id: string };
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const plan = await loadPlan(id, coachId);
      if (!plan) return reply.status(404).send({ error: 'Plan introuvable' });
      return reply.send(plan);
    }
  );

  // --- Replace a plan's content -------------------------------------------
  fastify.put(
    '/coach/nutrition-plans/:id',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      const { id } = request.params as { id: string };
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const validation = createNutritionPlanSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.flatten() });
      }
      const data = validation.data;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const updated = await client.query<PlanRow>(
          `UPDATE nutrition_plans
              SET name = $3, phase = $4, daily_calories = $5, notes = $6, updated_at = NOW()
            WHERE id = $1 AND coach_id = $2
            RETURNING *`,
          [id, coachId, data.name, data.phase ?? 1, data.dailyCalories ?? null, data.notes ?? null]
        );
        if (!updated.rows[0]) {
          await client.query('ROLLBACK');
          return await reply.status(404).send({ error: 'Plan introuvable' });
        }

        await client.query('DELETE FROM nutrition_meals WHERE plan_id = $1', [id]);
        await client.query('DELETE FROM nutrition_supplements WHERE plan_id = $1', [id]);
        await insertPlanContent(client, id, data.meals, data.supplements);
        await client.query('COMMIT');

        return await reply.send(await loadPlan(id, coachId));
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  );

  // --- Delete a plan ------------------------------------------------------
  fastify.delete(
    '/coach/nutrition-plans/:id',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      const { id } = request.params as { id: string };
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query(
        'DELETE FROM nutrition_plans WHERE id = $1 AND coach_id = $2 RETURNING id',
        [id, coachId]
      );
      if (result.rowCount === 0) return reply.status(404).send({ error: 'Plan introuvable' });
      return reply.status(204).send();
    }
  );

  // --- Assign a plan to one of the coach's students -----------------------
  fastify.post(
    '/coach/nutrition-plans/:id/assign',
    { preHandler: [authMiddleware, requireRole('coach')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coachId = request.user?.sub;
      const { id } = request.params as { id: string };
      if (!coachId) return reply.status(401).send({ error: 'Unauthorized' });

      const validation = assignNutritionPlanSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.flatten() });
      }
      const { studentId, startDate } = validation.data;

      const owns = await query('SELECT 1 FROM nutrition_plans WHERE id = $1 AND coach_id = $2', [
        id,
        coachId,
      ]);
      if (owns.rowCount === 0) return reply.status(404).send({ error: 'Plan introuvable' });

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
        // Only one active nutrition plan per student.
        await client.query(
          `UPDATE nutrition_assignments SET status = 'archived'
            WHERE student_id = $1 AND status = 'active'`,
          [studentId]
        );
        const assignment = await client.query<{ id: string; start_date: Date }>(
          `INSERT INTO nutrition_assignments (plan_id, student_id, coach_id, start_date)
           VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE))
           RETURNING id, start_date`,
          [id, studentId, coachId, startDate ?? null]
        );
        await client.query('COMMIT');

        return await reply.status(201).send({
          assignmentId: assignment.rows[0]?.id,
          planId: id,
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
