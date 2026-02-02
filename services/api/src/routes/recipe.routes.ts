import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { saveRecipeSchema } from '@fitapp/shared';
import { query } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

interface RecipeRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  ingredients: unknown;
  instructions: unknown;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  tags: string[] | null;
  is_from_frigo_mode: boolean;
  created_at: Date;
}

export const recipeRoutes = (fastify: FastifyInstance) => {
  // Get user's saved recipes
  fastify.get(
    '/recipes',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const { limit = '20', offset = '0', tag } = request.query as {
        limit?: string;
        offset?: string;
        tag?: string;
      };

      const limitNum = parseInt(limit, 10);
      const offsetNum = parseInt(offset, 10);

      let result;
      if (tag) {
        result = await query<RecipeRow>(
          `SELECT * FROM recipes WHERE user_id = $1 AND $4 = ANY(tags)
           ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
          [userId, limitNum, offsetNum, tag]
        );
      } else {
        result = await query<RecipeRow>(
          `SELECT * FROM recipes WHERE user_id = $1
           ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
          [userId, limitNum, offsetNum]
        );
      }

      const countResult = await query<{ count: string }>(
        'SELECT COUNT(*) FROM recipes WHERE user_id = $1',
        [userId]
      );

      return await reply.send({
        items: result.rows.map(mapRecipe),
        total: parseInt(countResult.rows[0]?.count ?? '0', 10),
      });
    }
  );

  // Get single recipe
  fastify.get(
    '/recipes/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      const { id } = request.params as { id: string };
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await query<RecipeRow>(
        'SELECT * FROM recipes WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (!result.rows[0]) {
        return reply.status(404).send({ error: 'Recipe not found' });
      }

      return await reply.send(mapRecipe(result.rows[0]));
    }
  );

  // Save a recipe
  fastify.post(
    '/recipes',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      const validation = saveRecipeSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.flatten() });
      }

      const data = validation.data;

      const result = await query<RecipeRow>(
        `INSERT INTO recipes (id, user_id, title, description, image_url, ingredients, instructions,
         prep_time_minutes, cook_time_minutes, servings, calories, protein, carbs, fat, tags, is_from_frigo_mode, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
         RETURNING *`,
        [
          userId,
          data.title,
          data.description ?? null,
          data.imageUrl ?? null,
          JSON.stringify(data.ingredients),
          JSON.stringify(data.instructions),
          data.prepTimeMinutes ?? null,
          data.cookTimeMinutes ?? null,
          data.servings ?? null,
          data.calories ?? null,
          data.protein ?? null,
          data.carbs ?? null,
          data.fat ?? null,
          data.tags ?? [],
          data.isFromFrigoMode ?? false,
        ]
      );

      return await reply.status(201).send(mapRecipe(result.rows[0]));
    }
  );

  // Delete a recipe
  fastify.delete(
    '/recipes/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      const { id } = request.params as { id: string };
      if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

      await query('DELETE FROM recipes WHERE id = $1 AND user_id = $2', [id, userId]);
      return await reply.status(204).send();
    }
  );
};

const mapRecipe = (row: RecipeRow | undefined) => {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    ingredients: row.ingredients,
    instructions: row.instructions,
    prepTimeMinutes: row.prep_time_minutes,
    cookTimeMinutes: row.cook_time_minutes,
    servings: row.servings,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    tags: row.tags ?? [],
    isFromFrigoMode: row.is_from_frigo_mode,
    createdAt: row.created_at,
  };
};
