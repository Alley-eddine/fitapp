import { describe, it, expect } from 'vitest';
import {
  generateInvitationCode,
  invitationExpiresAt,
  isInvitationUsable,
  INVITATION_TTL_DAYS,
} from '../domain/invitations.js';

describe('generateInvitationCode', () => {
  it('returns an 8-character code', () => {
    expect(generateInvitationCode()).toHaveLength(8);
  });

  it('only uses the unambiguous alphabet (no 0, O, 1 or I)', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateInvitationCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });

  it('produces different codes across calls', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateInvitationCode()));
    // Collisions are astronomically unlikely; allow a tiny margin.
    expect(codes.size).toBeGreaterThan(95);
  });
});

describe('invitationExpiresAt', () => {
  it('adds the configured TTL to the creation date', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const expected = new Date('2026-01-15T00:00:00.000Z'); // +14 days
    expect(invitationExpiresAt(from).toISOString()).toBe(expected.toISOString());
  });

  it('uses INVITATION_TTL_DAYS', () => {
    const from = new Date('2026-06-01T12:00:00.000Z');
    const diffDays = (invitationExpiresAt(from).getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(INVITATION_TTL_DAYS);
  });
});

describe('isInvitationUsable', () => {
  const now = new Date('2026-06-10T00:00:00.000Z');
  const future = new Date('2026-06-20T00:00:00.000Z');
  const past = new Date('2026-06-01T00:00:00.000Z');

  it('accepts a pending, non-expired invitation', () => {
    expect(isInvitationUsable({ status: 'pending', expires_at: future }, now)).toBe(true);
  });

  it('rejects an expired invitation', () => {
    expect(isInvitationUsable({ status: 'pending', expires_at: past }, now)).toBe(false);
  });

  it('rejects an already accepted invitation', () => {
    expect(isInvitationUsable({ status: 'accepted', expires_at: future }, now)).toBe(false);
  });

  it('rejects a revoked invitation', () => {
    expect(isInvitationUsable({ status: 'revoked', expires_at: future }, now)).toBe(false);
  });

  it('rejects an invitation expiring exactly now', () => {
    expect(isInvitationUsable({ status: 'pending', expires_at: now }, now)).toBe(false);
  });
});
