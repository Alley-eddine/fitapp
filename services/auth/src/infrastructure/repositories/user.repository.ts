import type { OAuthProvider, UserRole } from '@fitapp/shared';
import type { IUserRepository } from '../../domain/interfaces/user.repository.js';
import type { UserEntity, CreateUserData, CreateUserWithPasswordData } from '../../domain/entities/user.entity.js';
import { query } from '../config/database.js';

interface UserRow {
  id: string;
  email: string;
  email_verified: boolean;
  phone: string | null;
  role: UserRole;
  name: string | null;
  avatar_url: string | null;
  password_hash: string | null;
  provider: OAuthProvider;
  provider_id: string;
  subscription: UserEntity['subscription'];
  subscription_ends_at: Date | null;
  stripe_customer_id: string | null;
  theme_preference: 'light' | 'dark';
  created_at: Date;
  updated_at: Date;
}

const mapRowToEntity = (row: UserRow): UserEntity => ({
  id: row.id,
  email: row.email,
  emailVerified: row.email_verified,
  phone: row.phone,
  role: row.role,
  name: row.name,
  avatarUrl: row.avatar_url,
  passwordHash: row.password_hash,
  provider: row.provider,
  providerId: row.provider_id,
  subscription: row.subscription,
  subscriptionEndsAt: row.subscription_ends_at,
  stripeCustomerId: row.stripe_customer_id,
  themePreference: row.theme_preference,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    const result = await query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ? mapRowToEntity(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const result = await query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] ? mapRowToEntity(result.rows[0]) : null;
  }

  async findByProvider(provider: OAuthProvider, providerId: string): Promise<UserEntity | null> {
    const result = await query<UserRow>(
      'SELECT * FROM users WHERE provider = $1 AND provider_id = $2',
      [provider, providerId]
    );
    return result.rows[0] ? mapRowToEntity(result.rows[0]) : null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const result = await query<UserRow>(
      `INSERT INTO users (email, name, avatar_url, provider, provider_id, email_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING *`,
      [data.email, data.name, data.avatarUrl, data.provider, data.providerId]
    );
    const row = result.rows[0];
    if (!row) throw new Error('Failed to create user');
    return mapRowToEntity(row);
  }

  async updateSubscription(
    userId: string,
    subscription: UserEntity['subscription'],
    endsAt: Date | null
  ): Promise<UserEntity> {
    const result = await query<UserRow>(
      `UPDATE users
       SET subscription = $2, subscription_ends_at = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [userId, subscription, endsAt]
    );
    const row = result.rows[0];
    if (!row) throw new Error('User not found');
    return mapRowToEntity(row);
  }

  async createWithPassword(data: CreateUserWithPasswordData): Promise<UserEntity> {
    const result = await query<UserRow>(
      `INSERT INTO users (email, name, password_hash, phone, provider, provider_id)
       VALUES ($1, $2, $3, $4, 'email', $1)
       RETURNING *`,
      [data.email, data.name, data.passwordHash, data.phone ?? null]
    );
    const row = result.rows[0];
    if (!row) throw new Error('Failed to create user');
    return mapRowToEntity(row);
  }

  // --- Email verification ------------------------------------------------

  async saveVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await query(
      `INSERT INTO email_verification_tokens (token, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [token, userId, expiresAt]
    );
  }

  /** Returns the userId for a valid (non-expired) token, then deletes it. Null otherwise. */
  async consumeVerificationToken(token: string): Promise<string | null> {
    const result = await query<{ user_id: string; expires_at: Date }>(
      `DELETE FROM email_verification_tokens
       WHERE token = $1
       RETURNING user_id, expires_at`,
      [token]
    );
    const row = result.rows[0];
    if (!row) return null;
    if (row.expires_at.getTime() < Date.now()) return null;
    return row.user_id;
  }

  async markEmailVerified(userId: string): Promise<void> {
    await query(
      `UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1`,
      [userId]
    );
  }

  // --- Password reset (SMS code) ----------------------------------------

  async savePasswordResetCode(userId: string, code: string, expiresAt: Date): Promise<void> {
    await query(
      `INSERT INTO password_reset_codes (user_id, code, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, code, expiresAt]
    );
  }

  /** Returns the reset-code row id if a matching, unused, non-expired code exists. */
  async findValidResetCode(userId: string, code: string): Promise<string | null> {
    const result = await query<{ id: string }>(
      `SELECT id FROM password_reset_codes
       WHERE user_id = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, code]
    );
    return result.rows[0]?.id ?? null;
  }

  async markResetCodeUsed(id: string): Promise<void> {
    await query(`UPDATE password_reset_codes SET used = TRUE WHERE id = $1`, [id]);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await query(
      `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`,
      [userId, passwordHash]
    );
  }
}
