/**
 * Pure tier resolution — no infrastructure imports, so it stays unit testable.
 *
 * B2B rule: a student linked to an active coach gets premium-level AI access.
 * Their seat is paid by the coach, so the B2C tier stored on their account
 * must never limit them (see BUSINESS_RULES.md, "Tarification").
 */

import type { SubscriptionTier } from '@fitapp/shared';

export const resolveEffectiveTier = (
  subscription: SubscriptionTier,
  isActiveStudent: boolean
): SubscriptionTier => (isActiveStudent ? 'premium' : subscription);
