import { Request, Response, NextFunction } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getUserProfile,
} from '../services/authService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export async function handleRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user, tokens } = await register(req.body);
    res.status(201).json({ user, tokens });
  } catch (error) {
    next(error);
  }
}

export async function handleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user, tokens } = await login(req.body);
    res.status(200).json({ user, tokens });
  } catch (error) {
    next(error);
  }
}

export async function handleRefresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const { user, tokens } = await refresh(refreshToken);
    res.status(200).json({ user, tokens });
  } catch (error) {
    next(error);
  }
}

export async function handleLogout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    await logout(refreshToken);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function handleGetProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const user = await getUserProfile(req.user.id);
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

