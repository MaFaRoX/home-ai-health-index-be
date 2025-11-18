import { Router } from 'express';
import { authRouter } from './auth';
import { indicatorsRouter } from './indicators';
import { testSessionsRouter } from './testSessions';
import { subscriptionsRouter } from './subscriptions';
import { cvRouter } from './cvs';

export const router = Router();

router.get('/status', (_req, res) => {
  res.json({ message: 'API is running' });
});

router.use('/auth', authRouter);
router.use('/indicators', indicatorsRouter);
router.use('/test-sessions', testSessionsRouter);
router.use('/subscriptions', subscriptionsRouter);
router.use('/cvs', cvRouter);

