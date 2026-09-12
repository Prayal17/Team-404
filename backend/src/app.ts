import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Intelligent Academic Planner API',
    timestamp: new Date().toISOString()
  });
});

// Main API Route tree
app.use('/api', apiRouter);

// Centralized error handling
app.use(errorHandler);
