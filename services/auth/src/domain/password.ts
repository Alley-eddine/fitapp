import bcrypt from 'bcryptjs';
import { createHash, timingSafeEqual } from 'crypto';

const BCRYPT_ROUNDS = 12;

/** Hashes a password with the current scheme (bcrypt, per-user salt). */
export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, BCRYPT_ROUNDS);

/**
 * Pre-migration scheme (static-pepper SHA-256), kept ONLY to verify hashes
 * created before the bcrypt migration. Never used to store a new hash.
 */
const legacyHash = (password: string, pepper: string): string =>
  createHash('sha256').update(password + pepper).digest('hex');

/** A legacy hash is a bare 64-char hex digest; bcrypt hashes start with "$2". */
export const isLegacyHash = (stored: string): boolean => /^[0-9a-f]{64}$/i.test(stored);

export interface PasswordCheck {
  valid: boolean;
  /** True when a valid legacy hash should be rewritten with the current scheme. */
  needsRehash: boolean;
}

export const verifyPassword = async (
  password: string,
  stored: string,
  legacyPepper: string
): Promise<PasswordCheck> => {
  if (isLegacyHash(stored)) {
    const candidate = Buffer.from(legacyHash(password, legacyPepper), 'hex');
    const expected = Buffer.from(stored, 'hex');
    const valid = candidate.length === expected.length && timingSafeEqual(candidate, expected);
    return { valid, needsRehash: valid };
  }
  return { valid: await bcrypt.compare(password, stored), needsRehash: false };
};
