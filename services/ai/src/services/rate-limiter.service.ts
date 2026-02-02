import type { IRateLimiter, RateLimitResult } from '../domain/interfaces/index.js';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

export class RateLimiterService implements IRateLimiter {
  private getLimitForSubscription(subscription: string): number {
    switch (subscription) {
      case 'premium':
        return env.PREMIUM_TIER_DAILY_LIMIT;
      case 'pro':
        return env.PRO_TIER_DAILY_LIMIT;
      default:
        return env.FREE_TIER_DAILY_LIMIT;
    }
  }

  async checkLimit(userId: string, subscription: string, type: string): Promise<RateLimitResult> {
    const limit = this.getLimitForSubscription(subscription);

    const result = await query<{ count: string }>(
      `SELECT COUNT(*) FROM ai_generations
       WHERE user_id = $1 AND type = $2 AND created_at > NOW() - INTERVAL '24 hours'`,
      [userId, type]
    );

    const currentCount = parseInt(result.rows[0]?.count ?? '0', 10);
    const allowed = currentCount < limit;

    const resetAt = new Date();
    resetAt.setHours(resetAt.getHours() + 24);

    return {
      allowed,
      remaining: Math.max(0, limit - currentCount),
      resetAt,
    };
  }

  async recordUsage(
    userId: string,
    type: string,
    promptTokens: number,
    completionTokens: number
  ): Promise<void> {
    await query(
      `INSERT INTO ai_generations (id, user_id, type, prompt_tokens, completion_tokens, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
      [userId, type, promptTokens, completionTokens]
    );
  }
}
