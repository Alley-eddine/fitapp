import * as jose from 'jose';
import type { ITokenService, TokenPayload } from '../../domain/interfaces/token.service.js';
import type { UserEntity } from '../../domain/entities/user.entity.js';
import { env } from '../config/env.js';

export class TokenService implements ITokenService {
  private readonly secret: Uint8Array;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.secret = new TextEncoder().encode(env.JWT_SECRET);
    this.accessTokenExpiry = env.JWT_EXPIRES_IN;
    this.refreshTokenExpiry = '30d';
  }

  async generateAccessToken(user: UserEntity): Promise<string> {
    return new jose.SignJWT({
      sub: user.id,
      email: user.email,
      subscription: user.subscription,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.accessTokenExpiry)
      .setIssuer('fitapp:auth')
      .setAudience('fitapp:api')
      .sign(this.secret);
  }

  async generateRefreshToken(user: UserEntity): Promise<string> {
    return new jose.SignJWT({
      sub: user.id,
      email: user.email,
      subscription: user.subscription,
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.refreshTokenExpiry)
      .setIssuer('fitapp:auth')
      .setAudience('fitapp:auth')
      .sign(this.secret);
  }

  async generateTokens(user: UserEntity): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);
    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    const { payload } = await jose.jwtVerify(token, this.secret, {
      issuer: 'fitapp:auth',
      audience: 'fitapp:api',
    });

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      subscription: payload.subscription as UserEntity['subscription'],
    };
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    const { payload } = await jose.jwtVerify(token, this.secret, {
      issuer: 'fitapp:auth',
      audience: 'fitapp:auth',
    });

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      subscription: payload.subscription as UserEntity['subscription'],
    };
  }
}
