const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

// Rate limiting (Fixed to use "message" format)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: 'AI rate limit exceeded, please wait a moment.' }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'https://doubleeight.online',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/api/', limiter);
app.use('/api/chat', aiLimiter);
app.use('/api/generator', aiLimiter);
app.use('/api/market', aiLimiter); // Updated path
app.use('/api/marketing', aiLimiter);
app.use('/api/tools', aiLimiter); // Moved up to group limiters

// --- VERCEL DATABASE CONNECTION FIX ---
const mongooseOptions = {
  bufferCommands: false, 
  autoIndex: true,       
};

let isConnected = false;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return; // Already connected
  }
  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
    isConnected = db.connections[0].readyState === 1;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
};

// CRITICAL: This middleware forces Vercel to wait for the DB BEFORE hitting any routes
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Database connection failed' }); // Fixed
  }
});
// --------------------------------------

// Core Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/generator', require('./routes/generator.routes'));
app.use('/api/marketing', require('./routes/marketing.routes'));
app.use('/api/tools', require('./routes/tools.routes'));
app.use('/api/user', require('./routes/user.routes'));

// Updated Route Paths to match the New React Frontend
app.use('/api/market', require('./routes/marketResearch.routes'));
app.use('/api/billing', require('./routes/membership.routes'));
app.use('/api/content', require('./routes/promptWriter.routes'));

// Added missing routes required by the frontend
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/vault', require('./routes/vault.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'Double Eight AI' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error', // Fixed
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Local Development Server (Ignored by Vercel, used for local testing)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Double Eight AI Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV}`);
  });
}

// Keep export for Vercel Serverless
module.exports = app;
