import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import {
  createUserCV,
  getUserCVs,
  getCV,
  getSharedCV,
  updateUserCV,
  deleteUserCV,
  shareCV,
} from '../services/cvService';
import { getFileUrl, deleteFile } from '../utils/fileUpload';

export async function handleCreateCV(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { appSlug, title, cvData, templateId } = req.body;

    if (!appSlug || !title || !cvData) {
      res.status(400).json({ message: 'appSlug, title, and cvData are required' });
      return;
    }

    const cv = await createUserCV(req.user.id, appSlug, title, cvData, templateId);
    res.status(201).json({ cv });
  } catch (error) {
    next(error);
  }
}

export async function handleGetCVs(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { appSlug } = req.query;

    if (!appSlug || typeof appSlug !== 'string') {
      res.status(400).json({ message: 'appSlug query parameter is required' });
      return;
    }

    const cvs = await getUserCVs(req.user.id, appSlug);
    res.status(200).json({ cvs });
  } catch (error) {
    next(error);
  }
}

export async function handleGetCV(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const cvId = Number(req.params.id);
    if (isNaN(cvId)) {
      res.status(400).json({ message: 'Invalid CV ID' });
      return;
    }

    const cv = await getCV(cvId, req.user.id);
    res.status(200).json({ cv });
  } catch (error) {
    next(error);
  }
}

export async function handleGetSharedCV(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ message: 'Share token is required' });
      return;
    }

    const cv = await getSharedCV(token);
    res.status(200).json({ cv });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateCV(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const cvId = Number(req.params.id);
    if (isNaN(cvId)) {
      res.status(400).json({ message: 'Invalid CV ID' });
      return;
    }

    const { title, cvData, templateId } = req.body;
    const updates: { title?: string; cvData?: unknown; templateId?: number } = {};

    if (title !== undefined) updates.title = title;
    if (cvData !== undefined) updates.cvData = cvData;
    if (templateId !== undefined) updates.templateId = templateId;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: 'No fields to update' });
      return;
    }

    const cv = await updateUserCV(cvId, req.user.id, updates);
    res.status(200).json({ cv });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteCV(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const cvId = Number(req.params.id);
    if (isNaN(cvId)) {
      res.status(400).json({ message: 'Invalid CV ID' });
      return;
    }

    await deleteUserCV(cvId, req.user.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function handleShareCV(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const cvId = Number(req.params.id);
    if (isNaN(cvId)) {
      res.status(400).json({ message: 'Invalid CV ID' });
      return;
    }

    const { isPublic } = req.body;
    if (typeof isPublic !== 'boolean') {
      res.status(400).json({ message: 'isPublic must be a boolean' });
      return;
    }

    const shareToken = await shareCV(cvId, req.user.id, isPublic);
    res.status(200).json({ shareToken, isPublic });
  } catch (error) {
    next(error);
  }
}

export async function handleUploadImage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const fileUrl = getFileUrl(req.file.filename);
    res.status(200).json({
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteImage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { filename } = req.body;

    if (!filename || typeof filename !== 'string') {
      res.status(400).json({ message: 'filename is required' });
      return;
    }

    // Extract filename from URL if full URL is provided
    // e.g., "/uploads/cv/image-123.jpg" or "http://localhost:4000/uploads/cv/image-123.jpg"
    let actualFilename = filename;
    if (filename.includes('/')) {
      actualFilename = filename.split('/').pop() || filename;
    }

    // Security: Ensure filename doesn't contain path traversal
    if (actualFilename.includes('..') || actualFilename.includes('/') || actualFilename.includes('\\')) {
      res.status(400).json({ message: 'Invalid filename' });
      return;
    }

    deleteFile(actualFilename);
    res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    next(error);
  }
}

