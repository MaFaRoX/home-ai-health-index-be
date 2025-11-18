import { AppError } from '../utils/errors';
import { hashPassword, verifyPassword } from '../utils/password';
import { signAccessToken } from '../utils/jwt';
import { addDays, generateRefreshToken } from '../utils/token';
import { createUser, findByUsername, findById, updateUser, UserRecord } from '../repositories/userRepository';
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
  username: string;
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
  username: string;
  password: string;
  sex?: 'male' | 'female' | 'other';
  preferredLanguage?: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface UpdateProfileInput {
  fullName: string;
  password?: string;
  preferredLanguage?: string;
  sex?: 'male' | 'female' | 'other' | null;
}

export function mapUser(record: UserRecord): AuthenticatedUser {
  return {
    id: record.id,
    fullName: record.full_name,
    username: record.username,
    preferredLanguage: record.preferred_language,
    sex: record.sex,
  };
}

export async function issueTokens(user: UserRecord): Promise<AuthTokens> {
  const refreshToken = generateRefreshToken();
  const refreshExpires = addDays(new Date(), REFRESH_TOKEN_TTL_DAYS);
  await createSession(user.id, refreshToken, refreshExpires);

  const accessToken = signAccessToken(user.id, user.username);

  return {
    accessToken,
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken,
    refreshTokenExpiresAt: refreshExpires.toISOString(),
  };
}

export async function register(input: RegisterInput): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
  const { fullName, username, password, sex = null, preferredLanguage = 'vi' } = input;

  if (!fullName || fullName.trim().length < 2) {
    throw new AppError(400, 'Full name must be at least 2 characters');
  }
  if (!username || username.trim().length < 3) {
    throw new AppError(400, 'Username must be at least 3 characters');
  }
  if (password.length < 8) {
    throw new AppError(400, 'Password must be at least 8 characters');
  }

  const existingUser = await findByUsername(username.trim());
  if (existingUser) {
    throw new AppError(409, 'Username already registered');
  }

  const passwordHash = await hashPassword(password);
  const userId = await createUser({
    fullName: fullName.trim(),
    username: username.trim(),
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
  const { username, password } = input;
  if (!username || !password) {
    throw new AppError(400, 'Username and password are required');
  }

  const user = await findByUsername(username.trim());
  if (!user) {
    throw new AppError(401, 'Invalid credentials');
  }

  if (!user.password_hash) {
    throw new AppError(401, 'This account uses Google sign-in. Please sign in with Google.');
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

export async function updateUserProfile(userId: number, input: UpdateProfileInput): Promise<AuthenticatedUser> {
  const existingUser = await findById(userId);
  if (!existingUser) {
    throw new AppError(404, 'User not found');
  }

  const updates: {
    fullName?: string;
    passwordHash?: string;
    preferredLanguage?: string;
    sex?: 'male' | 'female' | 'other' | null;
  } = {};

  if (input.fullName !== undefined) {
    const trimmedName = input.fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      throw new AppError(400, 'Full name must be at least 2 characters');
    }
    updates.fullName = trimmedName;
  }

  if (input.password) {
    if (input.password.length < 8) {
      throw new AppError(400, 'Password must be at least 8 characters');
    }
    updates.passwordHash = await hashPassword(input.password);
  }

  if (input.preferredLanguage !== undefined) {
    const allowedLanguages = ['vi', 'en'];
    if (!allowedLanguages.includes(input.preferredLanguage)) {
      throw new AppError(400, 'Preferred language is not supported');
    }
    updates.preferredLanguage = input.preferredLanguage;
  }

  if (input.sex !== undefined) {
    if (input.sex !== null && !['male', 'female', 'other'].includes(input.sex)) {
      throw new AppError(400, 'Invalid sex value');
    }
    updates.sex = input.sex;
  }

  if (Object.keys(updates).length === 0) {
    return mapUser(existingUser);
  }

  await updateUser(userId, updates);
  const updated = await findById(userId);
  if (!updated) {
    throw new AppError(500, 'Failed to retrieve updated user');
  }
  return mapUser(updated);
}

