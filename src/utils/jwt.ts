import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: number;
  username: string;
  iat: number;
  exp: number;
}

const ACCESS_TOKEN_TTL = '15m';

export function signAccessToken(userId: number, username: string): string {
  return jwt.sign({ sub: userId, username }, env.jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.jwtSecret);
  if (typeof payload === 'string') {
    throw new Error('Invalid token payload');
  }
  const { sub, username, iat, exp } = payload as JwtPayload & { username?: unknown };
  if (typeof sub !== 'number' || typeof username !== 'string' || typeof iat !== 'number' || typeof exp !== 'number') {
    throw new Error('Invalid token payload');
  }
  return {
    sub,
    username,
    iat,
    exp,
  };
}

