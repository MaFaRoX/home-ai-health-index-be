import { AppError } from '../utils/errors';
import { hashPassword, verifyPassword } from '../utils/password';
import { signAccessToken } from '../utils/jwt';
import { addDays, generateRefreshToken } from '../utils/token';
import { createUser, findByPhone, findById, UserRecord } from '../repositories/userRepository';
import {
  createSession,
  deleteSessionByToken,
  findSessionByToken,
} from '../repositories/sessionRepository';

const REFRESH_TOKEN_TTL_DAYS = 30;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export interface AuthenticatedUser {
  id: number;
  fullName: string;
  phone: string;
  preferredLanguage: string;
  sex: 'male' | 'female' | 'other' | null;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface RegisterInput {
  fullName: string;
  phone: string;
  password: string;
  sex?: 'male' | 'female' | 'other';
  preferredLanguage?: string;
}

export interface LoginInput {
  phone: string;
  password: string;
}

function mapUser(record: UserRecord): AuthenticatedUser {
  return {
    id: record.id,
    fullName: record.full_name,
    phone: record.phone,
    preferredLanguage: record.preferred_language,
    sex: record.sex,
  };
}

async function issueTokens(user: UserRecord): Promise<AuthTokens> {
  const refreshToken = generateRefreshToken();
  const refreshExpires = addDays(new Date(), REFRESH_TOKEN_TTL_DAYS);
  await createSession(user.id, refreshToken, refreshExpires);

  const accessToken = signAccessToken(user.id, user.phone);

  return {
    accessToken,
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken,
    refreshTokenExpiresAt: refreshExpires.toISOString(),
  };
}

export async function register(input: RegisterInput): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
  const { fullName, phone, password, sex = null, preferredLanguage = 'vi' } = input;

  if (!fullName || fullName.trim().length < 2) {
    throw new AppError(400, 'Full name must be at least 2 characters');
  }
  if (!/^[0-9+]{8,15}$/.test(phone)) {
    throw new AppError(400, 'Phone number must contain 8-15 digits or +');
  }
  if (password.length < 8) {
    throw new AppError(400, 'Password must be at least 8 characters');
  }

  const existingUser = await findByPhone(phone);
  if (existingUser) {
    throw new AppError(409, 'Phone number already registered');
  }

  const passwordHash = await hashPassword(password);
  const userId = await createUser({
    fullName: fullName.trim(),
    phone,
    passwordHash,
    sex,
    preferredLanguage,
  });

  const userRecord = await findById(userId);
  if (!userRecord) {
    throw new AppError(500, 'Failed to retrieve created user');
  }

  const tokens = await issueTokens(userRecord);
  return {
    user: mapUser(userRecord),
    tokens,
  };
}

export async function login(input: LoginInput): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
  const { phone, password } = input;
  if (!phone || !password) {
    throw new AppError(400, 'Phone and password are required');
  }

  const user = await findByPhone(phone);
  if (!user) {
    throw new AppError(401, 'Invalid credentials');
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw new AppError(401, 'Invalid credentials');
  }

  const tokens = await issueTokens(user);
  return { user: mapUser(user), tokens };
}

export async function refresh(refreshToken: string): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
  if (!refreshToken) {
    throw new AppError(400, 'Refresh token is required');
  }

  const session = await findSessionByToken(refreshToken);
  if (!session) {
    throw new AppError(401, 'Invalid refresh token');
  }

  if (session.expires_at.getTime() < Date.now()) {
    await deleteSessionByToken(refreshToken);
    throw new AppError(401, 'Refresh token expired');
  }

  const user = await findById(session.user_id);
  if (!user) {
    await deleteSessionByToken(refreshToken);
    throw new AppError(401, 'User no longer exists');
  }

  await deleteSessionByToken(refreshToken);
  const tokens = await issueTokens(user);

  return { user: mapUser(user), tokens };
}

export async function logout(refreshToken: string): Promise<void> {
  if (!refreshToken) {
    throw new AppError(400, 'Refresh token is required');
  }
  await deleteSessionByToken(refreshToken);
}

export async function getUserProfile(userId: number): Promise<AuthenticatedUser> {
  const user = await findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return mapUser(user);
}

