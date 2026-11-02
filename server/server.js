require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connectDatabase, prisma } = require('./services/database');
const analyzeRoutes = require('./routes/analyze');
const meetingsRoutes = require('./routes/meetings');
const { apiLimiter, errorHandler, requestLogger } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// ─── CORS Configuration ──────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://localhost:8080',
  // Allow file:// protocol for direct HTML file access
  'null'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any localhost in development
    if (process.env.NODE_ENV === 'development' && 
        (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
      return callback(null, true);
    }
    return callback(null, true); // Open in dev - restrict in production
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbMessage = '';
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
    dbMessage = 'PostgreSQL connected successfully';
  } catch (error) {
    dbMessage = error.message;
  }

  const healthy = dbStatus === 'connected';
  
  return res.status(healthy ? 200 : 503).json({
    success: healthy,
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'),
    database: {
      status: dbStatus,
      message: dbMessage
    }
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/analyze', analyzeRoutes);
app.use('/api/meetings', meetingsRoutes);
app.get('/api/search', require('./controllers/meetingsController').searchMeetings);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
async function startServer() {
  // Try to connect to database (non-blocking - server still starts)
  const dbConnected = await connectDatabase();
  
  if (!dbConnected) {
    console.warn('⚠️  Server starting without database. Some features will not work.');
    console.warn('   Please configure DATABASE_URL in server/.env and run: npm run db:push');
  }

  app.listen(PORT, () => {
    console.log('\n================================================');
    console.log('  🚀 MeetNotes AI Server is running!');
    console.log('================================================');
    console.log(`  📡 Server URL:    http://localhost:${PORT}`);
    console.log(`  🏥 Health Check:  http://localhost:${PORT}/api/health`);
    console.log(`  🌍 Environment:   ${process.env.NODE_ENV || 'development'}`);
    console.log(`  🤖 Gemini Model:  ${process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'}`);
    console.log(`  🔑 Gemini API:    ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`  🗄️  Database:      ${dbConnected ? '✅ Connected' : '❌ Not connected'}`);
    console.log('================================================\n');
  });
}

startServer();

module.exports = app;
