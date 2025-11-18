import { Router } from 'express';
import {
  handleGetSubscription,
  handleGetAllSubscriptions,
  handleCreateSubscription,
  handleCancelSubscription,
} from '../controllers/subscriptionController';
import { requireAuth } from '../middlewares/authMiddleware';

const subscriptionsRouter = Router();

// All routes require authentication
subscriptionsRouter.use(requireAuth);

// Get all user subscriptions
subscriptionsRouter.get('/', handleGetAllSubscriptions);

// Get subscription for specific app
subscriptionsRouter.get('/:appSlug', handleGetSubscription);

// Create new subscription
subscriptionsRouter.post('/', handleCreateSubscription);

// Cancel subscription
subscriptionsRouter.delete('/:appSlug', handleCancelSubscription);

export { subscriptionsRouter };

