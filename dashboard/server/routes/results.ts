import { Router, Request, Response } from 'express';
import { TestRunner } from '../services/test-runner.js';
import { ResultMapper } from '../services/result-mapper.js';

const router = Router();

// GET /api/results/latest - Get the latest run summary
router.get('/latest', (req: Request, res: Response) => {
  try {
    const testRunner: TestRunner = req.app.locals.testRunner;
    const latest = testRunner.getLatestRun();

    if (!latest) {
      return res.status(404).json({ error: 'No test runs found' });
    }

    res.json(latest);
  } catch (error) {
    console.error('Error fetching latest results:', error);
    res.status(500).json({ error: 'Failed to fetch latest results' });
  }
});

// GET /api/results/history - Get run history
router.get('/history', (req: Request, res: Response) => {
  try {
    const testRunner: TestRunner = req.app.locals.testRunner;
    const history = testRunner.getHistory();
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// DELETE /api/results/history - Clear run history
router.delete('/history', (req: Request, res: Response) => {
  try {
    const testRunner: TestRunner = req.app.locals.testRunner;
    testRunner.clearHistory();
    res.json({ status: 'cleared' });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// GET /api/results/stats - Get module statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const projectRoot = req.app.locals.projectRoot;
    const mapper = new ResultMapper(projectRoot);
    const stats = await mapper.getModuleStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
