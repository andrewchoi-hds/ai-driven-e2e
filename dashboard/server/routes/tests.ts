import { Router, Request, Response } from 'express';
import { ResultMapper } from '../services/result-mapper.js';
import { TestRunner } from '../services/test-runner.js';

const router = Router();

// GET /api/tests - Get all test cases
router.get('/', async (req: Request, res: Response) => {
  try {
    const projectRoot = req.app.locals.projectRoot;
    const mapper = new ResultMapper(projectRoot);
    const tests = await mapper.getTests();
    res.json(tests);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// GET /api/tests/:module - Get tests by module
router.get('/module/:module', async (req: Request, res: Response) => {
  try {
    const projectRoot = req.app.locals.projectRoot;
    const mapper = new ResultMapper(projectRoot);
    const tests = await mapper.getTests();
    const filtered = tests.filter((t) => t.module === req.params.module);
    res.json(filtered);
  } catch (error) {
    console.error('Error fetching tests by module:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// POST /api/tests/run - Run selected tests
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { tests } = req.body;

    if (!tests || !Array.isArray(tests) || tests.length === 0) {
      return res.status(400).json({ error: 'No tests specified' });
    }

    const testRunner: TestRunner = req.app.locals.testRunner;

    if (testRunner.isRunning()) {
      return res.status(409).json({ error: 'A test run is already in progress' });
    }

    // Start test run asynchronously
    testRunner.runTests(tests).catch((err) => {
      console.error('Test run error:', err);
    });

    res.json({ status: 'started', testCount: tests.length });
  } catch (error) {
    console.error('Error starting test run:', error);
    res.status(500).json({ error: 'Failed to start test run' });
  }
});

// POST /api/tests/stop - Stop running tests
router.post('/stop', (req: Request, res: Response) => {
  try {
    const testRunner: TestRunner = req.app.locals.testRunner;
    testRunner.stop();
    res.json({ status: 'stopped' });
  } catch (error) {
    console.error('Error stopping tests:', error);
    res.status(500).json({ error: 'Failed to stop tests' });
  }
});

// GET /api/tests/status - Get test runner status
router.get('/status', (req: Request, res: Response) => {
  try {
    const testRunner: TestRunner = req.app.locals.testRunner;
    res.json({
      running: testRunner.isRunning(),
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;
