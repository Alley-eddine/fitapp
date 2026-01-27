import type { OAuthProvider } from '@fitapp/shared';
import type { UserEntity, CreateUserData } from '../entities/user.entity.js';

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByProvider(provider: OAuthProvider, providerId: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  updateSubscription(
    userId: string,
    subscription: UserEntity['subscription'],
    endsAt: Date | null
  ): Promise<UserEntity>;
}
