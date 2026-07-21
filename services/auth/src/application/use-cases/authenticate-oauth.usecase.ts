import type { OAuthProvider } from '@fitapp/shared';
import type { IUserRepository } from '../../domain/interfaces/user.repository.js';
import type { ITokenService } from '../../domain/interfaces/token.service.js';

interface OAuthUserData {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    subscription: string;
  };
  isNewUser: boolean;
}

export class AuthenticateOAuthUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService
  ) {}

  async execute(data: OAuthUserData): Promise<AuthResult> {
    let user = await this.userRepository.findByProvider(data.provider, data.providerId);
    let isNewUser = false;

    if (!user) {
      // Account linking: an account may already exist with this email (e.g.
      // created via email/password). Reuse it instead of inserting a duplicate,
      // which would violate the UNIQUE(email) constraint. Google emails are
      // verified, so linking on a matching address is safe.
      const existing = await this.userRepository.findByEmail(data.email);
      if (existing) {
        user = existing;
      } else {
        user = await this.userRepository.create({
          email: data.email,
          name: data.name,
          avatarUrl: data.avatarUrl,
          provider: data.provider,
          providerId: data.providerId,
        });
        isNewUser = true;
      }
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.generateAccessToken(user),
      this.tokenService.generateRefreshToken(user),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        subscription: user.subscription,
      },
      isNewUser,
    };
  }
}
