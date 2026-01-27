import type { SubscriptionTier, OAuthProvider } from '@fitapp/shared';

export interface UserEntity {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
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
