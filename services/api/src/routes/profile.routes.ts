import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { updateProfileSchema } from '@fitapp/shared';
import { query } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

interface ProfileRow {
  id: string;
  user_id: string;
  current_weight: number | null;
  target_weight: number | null;
  height: number | null;
  birth_date: Date | null;
  gender: string | null;
  activity_level: string;
  goal: string;
  daily_calorie_target: number | null;
  allergies: string[] | null;
  diet_preferences: string[] | null;
}

export const profileRoutes = (fastify: FastifyInstance) => {
  // Get current user's profile
  fastify.get(
    '/profile',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query<ProfileRow>(
        'SELECT * FROM profiles WHERE user_id = $1',
        [userId]
      );

      if (!result.rows[0]) {
        // Create default profile if doesn't exist
        const newProfile = await query<ProfileRow>(
          'INSERT INTO profiles (user_id) VALUES ($1) RETURNING *',
          [userId]
        );
        return await reply.send(mapProfile(newProfile.rows[0]));
      }

      return await reply.send(mapProfile(result.rows[0]));
    }
  );

  // Update profile
  fastify.put(
    '/profile',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const validation = updateProfileSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.flatten() });
      }

      const data = validation.data;

      const result = await query<ProfileRow>(
        `INSERT INTO profiles (user_id, current_weight, target_weight, height, birth_date, gender, activity_level, goal, daily_calorie_target, allergies, diet_preferences)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (user_id) DO UPDATE SET
           current_weight = COALESCE($2, profiles.current_weight),
           target_weight = COALESCE($3, profiles.target_weight),
           height = COALESCE($4, profiles.height),
           birth_date = COALESCE($5, profiles.birth_date),
           gender = COALESCE($6, profiles.gender),
           activity_level = COALESCE($7, profiles.activity_level),
           goal = COALESCE($8, profiles.goal),
           daily_calorie_target = COALESCE($9, profiles.daily_calorie_target),
           allergies = COALESCE($10, profiles.allergies),
           diet_preferences = COALESCE($11, profiles.diet_preferences),
           updated_at = NOW()
         RETURNING *`,
        [
          userId,
          data.currentWeight ?? null,
          data.targetWeight ?? null,
          data.height ?? null,
          data.birthDate ?? null,
          data.gender ?? null,
          data.activityLevel ?? 'moderate',
          data.goal ?? 'maintain',
          data.dailyCalorieTarget ?? null,
          data.allergies ?? null,
          data.dietPreferences ?? null,
        ]
      );

      return await reply.send(mapProfile(result.rows[0]));
    }
  );
};

const mapProfile = (row: ProfileRow | undefined) => {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    currentWeight: row.current_weight,
    targetWeight: row.target_weight,
    height: row.height,
    birthDate: row.birth_date,
    gender: row.gender,
    activityLevel: row.activity_level,
    goal: row.goal,
    dailyCalorieTarget: row.daily_calorie_target,
    allergies: row.allergies ?? [],
    dietPreferences: row.diet_preferences ?? [],
  };
};
