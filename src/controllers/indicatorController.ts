import { Request, Response, NextFunction } from 'express';
import { getIndicatorCatalog } from '../services/indicatorService';

export async function handleGetIndicatorCatalog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const language = typeof req.query.language === 'string' ? req.query.language : 'vi';
    const categories = await getIndicatorCatalog(language);
    res.status(200).json({ categories });
  } catch (error) {
    next(error);
  }
}

