import { describe, it, expect } from 'vitest';
import { resolveEffectiveTier } from '../domain/effective-tier.js';

describe('resolveEffectiveTier', () => {
  it('upgrades a linked student to premium regardless of their B2C tier', () => {
    expect(resolveEffectiveTier('free', true)).toBe('premium');
    expect(resolveEffectiveTier('pro', true)).toBe('premium');
    expect(resolveEffectiveTier('premium', true)).toBe('premium');
  });

  it('keeps the B2C tier for a non-student user', () => {
    expect(resolveEffectiveTier('free', false)).toBe('free');
    expect(resolveEffectiveTier('pro', false)).toBe('pro');
    expect(resolveEffectiveTier('premium', false)).toBe('premium');
  });
});
