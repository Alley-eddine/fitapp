import Fastify from 'fastify';
import cors from '@fastify/cors';
import { register, collectDefaultMetrics } from 'prom-client';
import { profileRoutes } from './routes/profile.routes.js';
import { workoutRoutes } from './routes/workout.routes.js';
import { weightRoutes } from './routes/weight.routes.js';
import { stepsRoutes } from './routes/steps.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { recipeRoutes } from './routes/recipe.routes.js';
import { nutritionRoutes } from './routes/nutrition.routes.js';
import { exercisesRoutes } from './routes/exercises.routes.js';
import { env } from './config/env.js';

collectDefaultMetrics();

export const createServer = async () => {
  const fastify = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  // CORS - allow all origins for development
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(userRoutes, { prefix: '/api' });
  await fastify.register(profileRoutes, { prefix: '/api' });
  await fastify.register(workoutRoutes, { prefix: '/api' });
  await fastify.register(weightRoutes, { prefix: '/api' });
  await fastify.register(stepsRoutes, { prefix: '/api' });
  await fastify.register(recipeRoutes, { prefix: '/api' });
  await fastify.register(nutritionRoutes, { prefix: '/api' });
  await fastify.register(exercisesRoutes, { prefix: '/api' });

  // Prometheus metrics endpoint
  fastify.get('/metrics', async (_request, reply) => {
    const metrics = await register.metrics();
    await reply.header('Content-Type', register.contentType).send(metrics);
  });

  return fastify;
};
