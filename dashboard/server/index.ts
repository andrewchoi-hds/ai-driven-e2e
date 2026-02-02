import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import testsRouter from './routes/tests.js';
import featuresRouter from './routes/features.js';
import resultsRouter from './routes/results.js';
import mappingsRouter from './routes/mappings.js';
import { TestRunner } from './services/test-runner.js';

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: ['http://localhost:3010'],
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3011;

// Middleware
app.use(cors());
app.use(express.json());

// Root path for API context
const projectRoot = path.resolve(process.cwd(), '..');

// Initialize test runner with socket.io
const testRunner = new TestRunner(io, projectRoot);

// Make testRunner available to routes
app.locals.testRunner = testRunner;
app.locals.projectRoot = projectRoot;
app.locals.io = io;

// Routes
app.use('/api/tests', testsRouter);
app.use('/api/features', featuresRouter);
app.use('/api/results', resultsRouter);
app.use('/api/mappings', mappingsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Test Dashboard API running on http://localhost:${PORT}`);
  console.log(`📁 Project root: ${projectRoot}`);
});
