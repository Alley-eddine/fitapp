import type { OAuthProvider } from '@fitapp/shared';
import type { IUserRepository } from '../../domain/interfaces/user.repository.js';
import type { UserEntity, CreateUserData } from '../../domain/entities/user.entity.js';
import { query } from '../config/database.js';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
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
  name: row.name,
  avatarUrl: row.avatar_url,
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
      `INSERT INTO users (email, name, avatar_url, provider, provider_id)
       VALUES ($1, $2, $3, $4, $5)
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
}
