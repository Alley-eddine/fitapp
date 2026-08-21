import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { hashPassword, verifyPassword, isLegacyHash } from '../domain/password.js';

const PEPPER = 'test-pepper-not-a-real-secret';
const legacy = (password: string): string =>
  createHash('sha256').update(password + PEPPER).digest('hex');

describe('hashPassword', () => {
  it('produces a bcrypt hash that verifies and does not need a rehash', async () => {
    const hash = await hashPassword('S3cret!pass');
    expect(hash.startsWith('$2')).toBe(true);
    const check = await verifyPassword('S3cret!pass', hash, PEPPER);
    expect(check).toEqual({ valid: true, needsRehash: false });
  });

  it('salts per call: the same password never yields the same hash', async () => {
    const [a, b] = await Promise.all([hashPassword('same'), hashPassword('same')]);
    expect(a).not.toBe(b);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('right');
    const check = await verifyPassword('wrong', hash, PEPPER);
    expect(check.valid).toBe(false);
  });
});

describe('legacy scheme migration', () => {
  it('detects a legacy hash by its shape', async () => {
    expect(isLegacyHash(legacy('x'))).toBe(true);
    expect(isLegacyHash(await hashPassword('x'))).toBe(false);
  });

  it('accepts a valid legacy hash and flags it for rehash', async () => {
    const check = await verifyPassword('OldPass123', legacy('OldPass123'), PEPPER);
    expect(check).toEqual({ valid: true, needsRehash: true });
  });

  it('rejects a wrong password against a legacy hash without flagging a rehash', async () => {
    const check = await verifyPassword('nope', legacy('OldPass123'), PEPPER);
    expect(check).toEqual({ valid: false, needsRehash: false });
  });

  it('rejects a legacy hash computed with a different pepper', async () => {
    const other = createHash('sha256').update('OldPass123' + 'other-pepper').digest('hex');
    const check = await verifyPassword('OldPass123', other, PEPPER);
    expect(check.valid).toBe(false);
  });
});
