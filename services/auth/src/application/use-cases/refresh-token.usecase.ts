import type { IUserRepository } from '../../domain/interfaces/user.repository.js';
import type { ITokenService } from '../../domain/interfaces/token.service.js';

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService
  ) {}

  async execute(refreshToken: string): Promise<RefreshResult> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new Error('User not found');
    }

    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.tokenService.generateAccessToken(user),
      this.tokenService.generateRefreshToken(user),
    ]);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}
