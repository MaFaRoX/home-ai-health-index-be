import { Router } from 'express';
import {
  handleCreateCV,
  handleGetCVs,
  handleGetCV,
  handleGetSharedCV,
  handleUpdateCV,
  handleDeleteCV,
  handleShareCV,
  handleUploadImage,
  handleDeleteImage,
} from '../controllers/cvController';
import { requireAuth } from '../middlewares/authMiddleware';
import { upload } from '../utils/fileUpload';

const cvRouter = Router();

// Public route for shared CVs (no auth required) - must be before /:id route
cvRouter.get('/shared/:token', handleGetSharedCV);

// All other routes require authentication
cvRouter.use(requireAuth);

// Create CV
cvRouter.post('/', handleCreateCV);

// Get all user's CVs
cvRouter.get('/', handleGetCVs);

// Upload image (single file)
cvRouter.post('/upload-image', upload.single('image'), handleUploadImage);

// Delete image
cvRouter.delete('/delete-image', handleDeleteImage);

// Get specific CV
cvRouter.get('/:id', handleGetCV);

// Update CV
cvRouter.put('/:id', handleUpdateCV);

// Delete CV
cvRouter.delete('/:id', handleDeleteCV);

// Share/unshare CV
cvRouter.post('/:id/share', handleShareCV);

export { cvRouter };

