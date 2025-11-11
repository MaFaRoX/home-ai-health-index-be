import { Router } from 'express';
import {
  handleRegister,
  handleLogin,
  handleRefresh,
  handleLogout,
  handleGetProfile,
  handleUpdateProfile,
} from '../controllers/authController';
import { requireAuth } from '../middlewares/authMiddleware';

const authRouter = Router();

authRouter.post('/register', handleRegister);
authRouter.post('/login', handleLogin);
authRouter.post('/refresh', handleRefresh);
authRouter.post('/logout', handleLogout);
authRouter.get('/me', requireAuth, handleGetProfile);
authRouter.put('/me', requireAuth, handleUpdateProfile);

export { authRouter };

