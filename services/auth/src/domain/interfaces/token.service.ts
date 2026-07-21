import type { UserEntity } from '../entities/user.entity.js';

export interface TokenPayload {
  sub: string;
  email: string;
  subscription: UserEntity['subscription'];
  role: UserEntity['role'];
}

export interface ITokenService {
  generateAccessToken(user: UserEntity): Promise<string>;
  generateRefreshToken(user: UserEntity): Promise<string>;
  verifyAccessToken(token: string): Promise<TokenPayload>;
  verifyRefreshToken(token: string): Promise<TokenPayload>;
}
