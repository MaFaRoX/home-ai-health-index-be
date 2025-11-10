import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: number;
  phone: string;
  iat: number;
  exp: number;
}

const ACCESS_TOKEN_TTL = '15m';

export function signAccessToken(userId: number, phone: string): string {
  return jwt.sign({ sub: userId, phone }, env.jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.jwtSecret);
  if (typeof payload === 'string') {
    throw new Error('Invalid token payload');
  }
  const { sub, phone, iat, exp } = payload as JwtPayload & { phone?: unknown };
  if (typeof sub !== 'number' || typeof phone !== 'string' || typeof iat !== 'number' || typeof exp !== 'number') {
    throw new Error('Invalid token payload');
  }
  return {
    sub,
    phone,
    iat,
    exp,
  };
}

