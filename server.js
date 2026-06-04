const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
try { const compression = require('compression'); module.exports._compression = compression; } catch(e) {}
require('dotenv').config();

const app = express();

/* ── TRUST PROXY ──
   Vercel and most serverless/CDN platforms forward the real client IP
   via the X-Forwarded-For header. Without this, Express returns the
   proxy's IP for every request and express-rate-limit throws a
   validation error. Setting to 1 trusts the first proxy hop. */
app.set('trust proxy', 1);

const limiter = rateLimit({ windowMs:15*60*1000, max:100, message:{error:'Too many requests.'} });
const aiLimiter = rateLimit({ windowMs:60*1000, max:20, message:{error:'AI rate limit exceeded.'} });

/* ── CORS ──
   Production: explicit allow-list. Development: permissive (any localhost / file://).
   To allow extra production origins, set EXTRA_ORIGINS env var as a comma-separated list.
   IMPORTANT: We NEVER throw on unknown origin — throwing causes the cors package
   to skip sending CORS headers entirely, which produces the exact "No
   Access-Control-Allow-Origin header" error in the browser. Instead, we
   reflect the origin when it matches our rules; otherwise still respond but
   without credentials. */
const PROD_ORIGINS = [
  'http://doubleeight.online','https://doubleeight.online',
  'http://www.doubleeight.online','https://www.doubleeight.online',
];
const EXTRA_ORIGINS = (process.env.EXTRA_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const ALL_ALLOWED = [...PROD_ORIGINS, ...EXTRA_ORIGINS];

function isAllowedOrigin(origin) {
  if (!origin || origin === 'null') return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin)) return true;
  if (ALL_ALLOWED.includes(origin)) return true;
  // Allow any *.vercel.app subdomain so preview deployments work
  if (/^https?:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
}

const corsOptions = {
  origin: (origin, cb) => {
    // Never throw — just decide allow or deny. Throwing strips ALL CORS headers.
    if (isAllowedOrigin(origin)) return cb(null, true);
    // Deny politely: tells cors to NOT add headers, response will be 200/regular
    // but the browser will block — better than throwing a 500 with no headers at all.
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Language', 'X-Admin-Secret', 'X-Cron-Secret'],
  optionsSuccessStatus: 204,
  maxAge: 86400, // cache preflight 24h
};

app.use(cors(corsOptions));
// Explicit preflight handler — guarantees OPTIONS responses always get CORS headers
app.options('*', cors(corsOptions));
// FIX #6: Add compression for faster API responses (gzip/deflate)
try {
  const compression = require('compression');
  // Skip compression for SSE streams (chat) to avoid buffering
  app.use(compression({
    filter: (req, res) => {
      if (req.path.includes('/chat/') && req.method === 'POST') return false;
      return compression.filter(req, res);
    },
    level: 6, // balanced speed/compression
  }));
} catch(e) { /* compression not installed, skip */ }
app.use(express.json({ limit:'10mb' }));
app.use(morgan('dev'));
// FIX #6: Increased AI rate limits to allow faster consecutive requests
const aiLimiterFast = rateLimit({ windowMs:60*1000, max:30, message:{error:'AI rate limit exceeded. Please wait a moment.'} });
app.use('/api/', limiter);
app.use('/api/chat', aiLimiterFast);
app.use('/api/generator', aiLimiterFast);
app.use('/api/market-research', aiLimiterFast);
app.use('/api/marketing', aiLimiterFast);
app.use('/api/tools', aiLimiterFast);
app.use('/api/academy', aiLimiterFast);

let isConnected = false;
const connectDB = async () => {
  if(isConnected || mongoose.connection.readyState >= 1) return;
  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, { bufferCommands:false, autoIndex:true });
    isConnected = db.connections[0].readyState === 1;
    console.log('✅ MongoDB connected');
  } catch(err) {
    console.error('❌ MongoDB error:', err.message);
    throw err;
  }
};
app.use(async(req,res,next) => {
  // Skip DB on preflight — OPTIONS requests don't touch the database
  if (req.method === 'OPTIONS') return next();
  try { await connectDB(); next(); }
  catch(err) { res.status(500).json({ error:'Database connection failed' }); }
});

app.use('/api/auth',            require('./routes/auth.routes'));
app.use('/api/chat',            require('./routes/chat.routes'));
app.use('/api/generator',       require('./routes/generator.routes'));
app.use('/api/market-research', require('./routes/marketResearch.routes'));
app.use('/api/marketing',       require('./routes/marketing.routes'));
app.use('/api/user',            require('./routes/user.routes'));
app.use('/api/membership',      require('./routes/membership.routes'));
app.use('/api/prompt-writer',   require('./routes/promptWriter.routes'));
app.use('/api/tools',           require('./routes/tools.routes'));
app.use('/api/community',       require('./routes/community.routes'));
app.use('/api/academy',         require('./routes/academy.routes'));
app.use('/api/business-dna',    require('./routes/businessDNA.routes'));
app.use('/api/launch-package',  require('./routes/launchPackage.routes'));
app.use('/api/notifications',   require('./routes/notification.routes'));
app.use('/api/competitors',     require('./routes/competitor.routes'));
app.use('/api/messaging',       require('./routes/messaging.routes'));

app.get('/api/health', (req,res) => res.json({ status:'OK', service:'Double Eight AI', timestamp:new Date().toISOString() }));

// JSON 404 for /api/* paths — way easier to debug than the default HTML page
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    method: req.method,
    path: req.originalUrl,
    hint: 'Check the route path. Examples: /api/auth/login, /api/generator/generate, /api/tools/generate, /api/business-dna, /api/competitors',
  });
});

app.use((err,req,res,next) => {
  console.error(err.stack);
  res.status(err.status||500).json({ error:err.message||'Internal Server Error' });
});

if(process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}
module.exports = app;
