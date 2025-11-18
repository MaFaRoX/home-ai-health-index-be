import { Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { AuthenticatedRequest } from './authMiddleware';
import { isPremium, checkFeatureAccess } from '../services/subscriptionService';

export function requirePremium(appSlug: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new AppError(401, 'Unauthorized'));
    }

    try {
      const premium = await isPremium(req.user.id, appSlug);
      if (!premium) {
        return next(new AppError(403, 'Premium subscription required'));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireFeature(appSlug: string, feature: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new AppError(401, 'Unauthorized'));
    }

    try {
      const hasAccess = await checkFeatureAccess(req.user.id, appSlug, feature);
      if (!hasAccess) {
        return next(new AppError(403, `Feature '${feature}' is not available in your plan`));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

