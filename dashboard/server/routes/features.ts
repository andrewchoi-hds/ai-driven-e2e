import { Router, Request, Response } from 'express';
import { FeatureParser } from '../services/feature-parser.js';
import { ResultMapper } from '../services/result-mapper.js';

const router = Router();

// GET /api/features - Get all feature files
router.get('/', async (req: Request, res: Response) => {
  try {
    const projectRoot = req.app.locals.projectRoot;
    const parser = new FeatureParser(projectRoot);
    const features = await parser.getFeatures();
    res.json(features);
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

// GET /api/features/:id - Get feature by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const projectRoot = req.app.locals.projectRoot;
    const parser = new FeatureParser(projectRoot);
    const features = await parser.getFeatures();
    const feature = features.find((f) => f.id === req.params.id);

    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }

    res.json(feature);
  } catch (error) {
    console.error('Error fetching feature:', error);
    res.status(500).json({ error: 'Failed to fetch feature' });
  }
});

// GET /api/mappings - Get test-feature mappings
router.get('/mappings', async (req: Request, res: Response) => {
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
