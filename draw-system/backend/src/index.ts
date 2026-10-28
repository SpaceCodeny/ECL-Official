import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { authRouter } from './api/v1/auth';
import { tournamentsRouter } from './api/v1/tournaments';
import { drawRouter } from './api/v1/draw';
import { teamsRouter } from './api/v1/teams';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ 
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'ECL Draw System API',
  });
});

// API Routes v1
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/tournaments', tournamentsRouter);
app.use('/api/v1/draw', drawRouter);
app.use('/api/v1/teams', teamsRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 ECL Draw System API`);
  console.log(`📡 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 API v1: http://localhost:${PORT}/api/v1\n`);
});
