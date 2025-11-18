import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import {
  getUserSubscriptionForApp,
  getAllUserSubscriptions,
  createUserSubscription,
  cancelSubscription,
} from '../services/subscriptionService';

export async function handleGetSubscription(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { appSlug } = req.params;
    if (!appSlug || typeof appSlug !== 'string') {
      res.status(400).json({ message: 'appSlug is required' });
      return;
    }

    const subscription = await getUserSubscriptionForApp(req.user.id, appSlug);

    if (!subscription) {
      res.status(404).json({ message: 'No subscription found' });
      return;
    }

    res.status(200).json({ subscription });
  } catch (error) {
    next(error);
  }
}

export async function handleGetAllSubscriptions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const subscriptions = await getAllUserSubscriptions(req.user.id);
    res.status(200).json({ subscriptions });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateSubscription(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { appSlug, planSlug, durationDays, paymentMethod } = req.body;

    if (!appSlug || !planSlug || !durationDays) {
      res.status(400).json({ message: 'appSlug, planSlug, and durationDays are required' });
      return;
    }

    if (typeof durationDays !== 'number' || durationDays < 1) {
      res.status(400).json({ message: 'durationDays must be a positive number' });
      return;
    }

    const subscription = await createUserSubscription(
      req.user.id,
      appSlug,
      planSlug,
      durationDays,
      paymentMethod || null,
    );

    res.status(201).json({ subscription });
  } catch (error) {
    next(error);
  }
}

export async function handleCancelSubscription(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { appSlug } = req.params;
    if (!appSlug || typeof appSlug !== 'string') {
      res.status(400).json({ message: 'appSlug is required' });
      return;
    }

    await cancelSubscription(req.user.id, appSlug);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

