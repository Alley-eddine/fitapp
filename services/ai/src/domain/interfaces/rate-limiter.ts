export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface IRateLimiter {
  checkLimit(userId: string, subscription: string, type: string): Promise<RateLimitResult>;
  recordUsage(userId: string, type: string, promptTokens: number, completionTokens: number): Promise<void>;
}
