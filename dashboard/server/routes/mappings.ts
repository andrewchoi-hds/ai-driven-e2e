import { Router, Request, Response } from 'express';
import { ResultMapper } from '../services/result-mapper.js';

const router = Router();

// GET /api/mappings - Get test-feature mappings
router.get('/', async (req: Request, res: Response) => {
  try {
    const projectRoot = req.app.locals.projectRoot;
    const mapper = new ResultMapper(projectRoot);
    const mappings = await mapper.getMappings();
    res.json(mappings);
  } catch (error) {
    console.error('Error fetching mappings:', error);
    res.status(500).json({ error: 'Failed to fetch mappings' });
  }
});

export default router;
