import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';

const SOURCE_URL = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json';

interface RawExercise {
  id?: string;
  name: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  equipment?: string | null;
  category?: string;
  level?: string;
}

// Curated muscle groups (FR) mapped to the dataset's raw muscle keys.
const MUSCLE_GROUPS = [
  { key: 'dos', label: 'Dos', muscles: ['lats', 'middle back', 'lower back', 'traps'] },
  { key: 'pectoraux', label: 'Pectoraux', muscles: ['chest'] },
  { key: 'jambes', label: 'Jambes', muscles: ['quadriceps', 'hamstrings', 'calves', 'glutes', 'abductors', 'adductors'] },
  { key: 'epaules', label: 'Épaules', muscles: ['shoulders', 'neck'] },
  { key: 'biceps', label: 'Biceps', muscles: ['biceps'] },
  { key: 'triceps', label: 'Triceps', muscles: ['triceps'] },
  { key: 'abdos', label: 'Abdominaux', muscles: ['abdominals'] },
  { key: 'avant-bras', label: 'Avant-bras', muscles: ['forearms'] },
] as const;

let cache: RawExercise[] | null = null;

const loadExercises = async (): Promise<RawExercise[]> => {
  if (cache) return cache;
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Failed to fetch exercise catalog (${String(res.status)})`);
  cache = (await res.json()) as RawExercise[];
  return cache;
};

export const exercisesRoutes = (fastify: FastifyInstance) => {
  // List the curated muscle groups
  fastify.get(
    '/exercises/groups',
    { preHandler: [authMiddleware] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ groups: MUSCLE_GROUPS.map((g) => ({ key: g.key, label: g.label })) });
    }
  );

  // List exercises, optionally filtered by muscle group or raw muscle
  fastify.get(
    '/exercises',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { group, muscle, search, limit = '60' } = request.query as {
        group?: string;
        muscle?: string;
        search?: string;
        limit?: string;
      };

      let all: RawExercise[];
      try {
        all = await loadExercises();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Catalog unavailable';
        return reply.status(502).send({ error: message });
      }

      const groupDef = group ? MUSCLE_GROUPS.find((g) => g.key === group) : undefined;
      const targetMuscles = groupDef ? [...groupDef.muscles] : muscle ? [muscle] : null;
      const searchLower = search?.toLowerCase();

      const filtered = all.filter((ex) => {
        const muscles = ex.primaryMuscles ?? [];
        const muscleOk = !targetMuscles || muscles.some((m) => targetMuscles.includes(m));
        const searchOk = !searchLower || ex.name.toLowerCase().includes(searchLower);
        return muscleOk && searchOk;
      });

      const max = Math.min(parseInt(limit, 10) || 60, 200);
      const items = filtered.slice(0, max).map((ex) => ({
        id: ex.id ?? ex.name,
        name: ex.name,
        primaryMuscles: ex.primaryMuscles ?? [],
        equipment: ex.equipment ?? null,
        category: ex.category ?? null,
        level: ex.level ?? null,
      }));

      return reply.send({ items, total: filtered.length });
    }
  );
};
