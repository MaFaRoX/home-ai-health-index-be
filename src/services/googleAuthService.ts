import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import {
  findByGoogleId,
  findByEmail,
  createGoogleUser,
  linkGoogleAccount,
  findById,
} from '../repositories/userRepository';
import { issueTokens, mapUser, AuthenticatedUser, AuthTokens } from './authService';

const client = new OAuth2Client(env.google.clientId);

export interface GoogleTokenPayload {
  sub: string; // Google user ID
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

export async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.google.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      throw new AppError(401, 'Invalid Google token');
    }
    return {
      sub: payload.sub,
      email: payload.email!,
      name: payload.name!,
      picture: payload.picture,
      email_verified: payload.email_verified === true,
    };
  } catch (error) {
    throw new AppError(401, 'Failed to verify Google token');
  }
}

export async function authenticateWithGoogle(idToken: string): Promise<{
  user: AuthenticatedUser;
  tokens: AuthTokens;
  isNewUser: boolean;
}> {
  const googleUser = await verifyGoogleToken(idToken);

  // Check if user exists with this Google ID
  let user = await findByGoogleId(googleUser.sub);
  let isNewUser = false;

  if (!user) {
    // Check if user exists with this email (account linking)
    const existingUser = await findByEmail(googleUser.email);

    if (existingUser) {
      // Link Google account to existing user
      await linkGoogleAccount(
        existingUser.id,
        googleUser.sub,
        googleUser.email,
        googleUser.picture,
      );
      user = await findById(existingUser.id);
      if (!user) throw new AppError(500, 'Failed to link account');
    } else {
      // Create new user
      const userId = await createGoogleUser({
        fullName: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.sub,
        avatarUrl: googleUser.picture,
      });
      user = await findById(userId);
      if (!user) throw new AppError(500, 'Failed to create user');
      isNewUser = true;
    }
  }

  const tokens = await issueTokens(user);
  return {
    user: mapUser(user),
    tokens,
    isNewUser,
  };
}

