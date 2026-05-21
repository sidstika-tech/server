const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
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
   To allow extra production origins, set EXTRA_ORIGINS env var as a comma-separated list. */
const PROD_ORIGINS = [
  'http://doubleeight.online','https://doubleeight.online',
  'http://www.doubleeight.online','https://www.doubleeight.online',
];
const EXTRA_ORIGINS = (process.env.EXTRA_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // file:// pages send Origin: null. curl/server-to-server sends no Origin at all.
    if (!origin || origin === 'null') return cb(null, true);
    // Localhost / 127.0.0.1 / 0.0.0.0 on any port = dev → allow
    if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin)) return cb(null, true);
    // Production allow-list
    if (PROD_ORIGINS.includes(origin) || EXTRA_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
}));
app.use(express.json({ limit:'10mb' }));
app.use(morgan('dev'));
app.use('/api/', limiter);
app.use('/api/chat', aiLimiter);
app.use('/api/generator', aiLimiter);
app.use('/api/market-research', aiLimiter);
app.use('/api/marketing', aiLimiter);
app.use('/api/tools', aiLimiter);
app.use('/api/academy', aiLimiter);

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
