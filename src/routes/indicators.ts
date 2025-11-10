import { Router } from 'express';
import { handleGetIndicatorCatalog } from '../controllers/indicatorController';

const indicatorsRouter = Router();

indicatorsRouter.get('/', handleGetIndicatorCatalog);

export { indicatorsRouter };

