import { Router } from 'express';
import {
  handleCreateTestSession,
  handleDeleteTestSession,
  handleGetTestSession,
  handleListTestSessions,
  handleUpdateTestSession,
} from '../controllers/testSessionController';
import { requireAuth } from '../middlewares/authMiddleware';

const testSessionsRouter = Router();

testSessionsRouter.use(requireAuth);
testSessionsRouter.get('/', handleListTestSessions);
testSessionsRouter.post('/', handleCreateTestSession);
testSessionsRouter.get('/:id', handleGetTestSession);
testSessionsRouter.put('/:id', handleUpdateTestSession);
testSessionsRouter.delete('/:id', handleDeleteTestSession);

export { testSessionsRouter };

