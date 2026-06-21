import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { updateProfileSchema } from '@fitapp/shared';
import { query } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendEmail, emailHtml } from '../notifications.client.js';

export interface ProfileRow {
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
  onboarding_completed: boolean;
}

export const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const GOAL_ADJUSTMENTS: Record<string, number> = {
  lose_weight: -500,
  gain_muscle: 300,
  maintain: 0,
  improve_endurance: 200,
};

/**
 * Daily calorie target via Mifflin-St Jeor BMR x activity factor + goal
 * adjustment. Returns null when the required inputs are missing.
 */
export const computeDailyCalories = (row: ProfileRow): number | null => {
  if (row.current_weight == null || row.height == null || !row.birth_date || !row.gender) {
    return null;
  }
  const birth = new Date(row.birth_date);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  if (age <= 0 || age > 120) return null;

  const weight = Number(row.current_weight);
  const height = Number(row.height);
  const bmr =
    10 * weight + 6.25 * height - 5 * age + (row.gender === 'male' ? 5 : -161);
  const tdee = bmr * (ACTIVITY_FACTORS[row.activity_level] ?? 1.55);
  const target = tdee + (GOAL_ADJUSTMENTS[row.goal] ?? 0);
  return Math.round(target);
};

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
        `INSERT INTO profiles (user_id, current_weight, target_weight, height, birth_date, gender, activity_level, goal, daily_calorie_target, allergies, diet_preferences, onboarding_completed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
           onboarding_completed = COALESCE($12, profiles.onboarding_completed),
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
          data.onboardingCompleted ?? null,
        ]
      );

      let profile = result.rows[0];

      // Recompute the daily calorie target from the merged profile values.
      if (profile) {
        const calories = computeDailyCalories(profile);
        if (calories !== null && calories !== profile.daily_calorie_target) {
          const updated = await query<ProfileRow>(
            `UPDATE profiles SET daily_calorie_target = $2, updated_at = NOW()
             WHERE user_id = $1 RETURNING *`,
            [userId, calories]
          );
          profile = updated.rows[0] ?? profile;
        }
      }

      // Welcome email when the user just completed onboarding (best-effort).
      if (data.onboardingCompleted === true && request.user?.email) {
        void sendEmail({
          to: request.user.email,
          subject: 'Bienvenue sur FitCoach AI 💪',
          html: emailHtml(
            'Bienvenue sur FitCoach AI 💪',
            'Ton compte est prêt. Crée ta première séance, suis ton poids et tes calories, et laisse le coach IA t’aider côté nutrition.'
          ),
          text: 'Bienvenue sur FitCoach AI ! Ton compte est prêt.',
        });
      }

      return await reply.send(mapProfile(profile));
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
    onboardingCompleted: row.onboarding_completed,
  };
};
