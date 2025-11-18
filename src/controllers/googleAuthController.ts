import { Request, Response, NextFunction } from 'express';
import { authenticateWithGoogle } from '../services/googleAuthService';

export async function handleGoogleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ message: 'Google ID token is required' });
      return;
    }

    const { user, tokens, isNewUser } = await authenticateWithGoogle(idToken);
    res.status(isNewUser ? 201 : 200).json({ user, tokens, isNewUser });
  } catch (error) {
    next(error);
  }
}

