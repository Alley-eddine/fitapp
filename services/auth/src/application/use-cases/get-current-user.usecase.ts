import type { IUserRepository } from '../../domain/interfaces/user.repository.js';
import type { ITokenService } from '../../domain/interfaces/token.service.js';

interface UserResult {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  subscription: string;
  themePreference: string;
}

export class GetCurrentUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService
  ) {}

  async execute(accessToken: string): Promise<UserResult> {
    const payload = await this.tokenService.verifyAccessToken(accessToken);

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      subscription: user.subscription,
      themePreference: user.themePreference,
    };
  }
}
