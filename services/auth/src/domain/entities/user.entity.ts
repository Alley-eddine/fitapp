import type { SubscriptionTier, OAuthProvider, UserRole } from '@fitapp/shared';

export interface UserEntity {
  id: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  role: UserRole;
  name: string | null;
  avatarUrl: string | null;
  passwordHash: string | null;
  provider: OAuthProvider;
  providerId: string;
  subscription: SubscriptionTier;
  subscriptionEndsAt: Date | null;
  stripeCustomerId: string | null;
  themePreference: 'light' | 'dark';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: OAuthProvider;
  providerId: string;
}

export interface CreateUserWithPasswordData {
  email: string;
  name: string;
  passwordHash: string;
  phone?: string | null;
}
