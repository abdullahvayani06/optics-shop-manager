import express from 'express';
import cors from 'cors';
import { initDatabase } from './config/database.js';
import { seedDatabase } from './seed/seedData.js';
import { authRouter } from './routes/auth.js';
import { customersRouter } from './routes/customers.js';
import { prescriptionsRouter } from './routes/prescriptions.js';
import { productsRouter } from './routes/products.js';
import { salesRouter } from './routes/sales.js';
import { paymentsRouter } from './routes/payments.js';
import { expensesRouter } from './routes/expenses.js';
import { investmentsRouter } from './routes/investments.js';
import { financeRouter } from './routes/finance.js';
import { dashboardRouter } from './routes/dashboard.js';
import { reportsRouter } from './routes/reports.js';
import { settingsRouter } from './routes/settings.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const isProduction = process.env.NODE_ENV === 'production';
const corsOriginEnv = process.env.CORS_ORIGIN;

if (isProduction && !corsOriginEnv) {
  console.error('FATAL: CORS_ORIGIN environment variable is required in production mode. Refusing to start.');
  process.exit(1);
}

// In production, split comma-separated origins if provided (normalizing trailing slashes)
const allowedOrigins = corsOriginEnv
  ? corsOriginEnv.split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean)
  : '*';

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (tools, curl, server-to-server) where origin is undefined
    if (!origin) {
      return callback(null, true);
    }
    if (!isProduction || allowedOrigins === '*') {
      return callback(null, true);
    }
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (Array.isArray(allowedOrigins) && (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes('*'))) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy violation: Origin ${origin} not allowed.`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Initialize SQLite database and seed demo data if empty
initDatabase();
seedDatabase(false);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/prescriptions', prescriptionsRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/investments', investmentsRouter);
app.use('/api/finance', financeRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Optics Shop Manager API',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static build if present
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Always log complete error details on server side
  console.error(`[${new Date().toISOString()}] Unhandled server error:`, err);

  if (isProduction) {
    // Production clients receive a generic error message
    res.status(500).json({ error: 'Internal server error' });
  } else {
    // Development mode provides full exception message for debugging
    res.status(500).json({ error: 'Internal server error: ' + (err.message || 'Unknown error') });
  }
});

app.listen(PORT, () => {
  console.log(`Optics Shop Manager API Server running on port ${PORT}`);
});
