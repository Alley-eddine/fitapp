import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateRecipeSchema, frigoModeMessageSchema } from '@fitapp/shared';
import { authMiddleware } from '../middleware/auth.js';
import { GroqProvider } from '../providers/groq.provider.js';
import { RateLimiterService } from '../services/rate-limiter.service.js';

const aiProvider = new GroqProvider();
const rateLimiter = new RateLimiterService();

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const aiRoutes = (fastify: FastifyInstance) => {
  // Generate recipe from ingredients
  fastify.post(
    '/ai/generate-recipe',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) return reply.status(401).send({ error: 'Unauthorized' });

      const validation = generateRecipeSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.flatten() });
      }

      try {
        // Check rate limit
        const rateLimit = await rateLimiter.checkLimit(user.sub, user.subscription, 'recipe');
        if (!rateLimit.allowed) {
          return reply.status(429).send({
            error: 'Rate limit exceeded',
            remaining: rateLimit.remaining,
            resetAt: rateLimit.resetAt.toISOString(),
          });
        }

        // Generate recipe
        const recipe = await aiProvider.generateRecipe(validation.data);

        // Record usage
        await rateLimiter.recordUsage(user.sub, 'recipe', 500, 1500);

        return await reply.send({ recipe });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate recipe';
        console.error('Recipe generation error:', err);
        return reply.status(500).send({ error: message });
      }
    }
  );

  // Frigo mode chat
  fastify.post(
    '/ai/frigo-mode',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) return reply.status(401).send({ error: 'Unauthorized' });

      console.log('Frigo mode request body:', JSON.stringify(request.body, null, 2));

      const validation = frigoModeMessageSchema.safeParse(request.body);
      if (!validation.success) {
        console.log('Validation error:', JSON.stringify(validation.error.flatten(), null, 2));
        return reply.status(400).send({ error: validation.error.flatten() });
      }

      const { conversationHistory } = request.body as { conversationHistory?: ConversationMessage[] };

      try {
        // Check rate limit
        const rateLimit = await rateLimiter.checkLimit(user.sub, user.subscription, 'frigo_mode');
        if (!rateLimit.allowed) {
          return reply.status(429).send({
            error: 'Rate limit exceeded',
            remaining: rateLimit.remaining,
            resetAt: rateLimit.resetAt.toISOString(),
          });
        }

        // Chat with AI
        const response = await aiProvider.frigoModeChat({
          ...validation.data,
          conversationHistory,
        });

        // Record usage
        await rateLimiter.recordUsage(user.sub, 'frigo_mode', 300, 800);

        return await reply.send(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to process message';
        console.error('Frigo mode error:', err);
        return reply.status(500).send({ error: message });
      }
    }
  );

  // Check rate limit status
  fastify.get(
    '/ai/rate-limit',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) return reply.status(401).send({ error: 'Unauthorized' });

      const [recipeLimit, frigoLimit] = await Promise.all([
        rateLimiter.checkLimit(user.sub, user.subscription, 'recipe'),
        rateLimiter.checkLimit(user.sub, user.subscription, 'frigo_mode'),
      ]);

      return await reply.send({
        recipe: {
          allowed: recipeLimit.allowed,
          remaining: recipeLimit.remaining,
          resetAt: recipeLimit.resetAt.toISOString(),
        },
        frigoMode: {
          allowed: frigoLimit.allowed,
          remaining: frigoLimit.remaining,
          resetAt: frigoLimit.resetAt.toISOString(),
        },
      });
    }
  );
};
