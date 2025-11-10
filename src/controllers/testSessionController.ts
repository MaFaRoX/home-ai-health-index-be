import { Response, NextFunction } from 'express';
import {
  createTestSession,
  getTestSessionDetail,
  listTestSessions,
  removeTestSession,
  updateTestSessionDetails,
} from '../services/testSessionService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export async function handleListTestSessions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const language = typeof req.query.language === 'string' ? req.query.language : 'vi';
    const userId = req.user!.id;
    const sessions = await listTestSessions(userId, language);
    res.status(200).json({ sessions });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateTestSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const language = typeof req.query.language === 'string' ? req.query.language : 'vi';
    const userId = req.user!.id;
    const session = await createTestSession(userId, req.body, language);
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
}

export async function handleGetTestSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const language = typeof req.query.language === 'string' ? req.query.language : 'vi';
    const userId = req.user!.id;
    const sessionId = Number(req.params.id);
    if (Number.isNaN(sessionId)) {
      res.status(400).json({ message: 'Invalid session id' });
      return;
    }
    const session = await getTestSessionDetail(userId, sessionId, language);
    res.status(200).json({ session });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateTestSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const language = typeof req.query.language === 'string' ? req.query.language : 'vi';
    const userId = req.user!.id;
    const sessionId = Number(req.params.id);
    if (Number.isNaN(sessionId)) {
      res.status(400).json({ message: 'Invalid session id' });
      return;
    }
    const session = await updateTestSessionDetails(userId, sessionId, req.body, language);
    res.status(200).json({ session });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteTestSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const sessionId = Number(req.params.id);
    if (Number.isNaN(sessionId)) {
      res.status(400).json({ message: 'Invalid session id' });
      return;
    }
    await removeTestSession(userId, sessionId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

