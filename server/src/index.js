import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, testConnection } from './db/connection.js';
import promptsRouter from './routes/prompts.js';
import testCasesRouter from './routes/testCases.js';
import evaluatorRouter from './routes/evaluator.js';
import knowledgeBaseRouter from './routes/knowledgeBase.js';
import generatorRouter from './routes/generator.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/prompts', promptsRouter);
app.use('/api/test-cases', testCasesRouter);
app.use('/api/evaluator', evaluatorRouter);
app.use('/api/knowledge-base', knowledgeBaseRouter);
app.use('/api/generator', generatorRouter);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({ 
      status: 'ok', 
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

const server = app.listen(0, () => {
  const port = server.address().port;
  console.log(`Server running on http://localhost:${port}`);
});
