const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'AI rate limit exceeded, please wait a moment.' }
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
app.use('/api/market-research', aiLimiter);
app.use('/api/marketing', aiLimiter);

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/generator', require('./routes/generator.routes'));
app.use('/api/market-research', require('./routes/marketResearch.routes'));
app.use('/api/marketing', require('./routes/marketing.routes'));
app.use('/api/user', require('./routes/user.routes'));
app.use('/api/membership', require('./routes/membership.routes'));
app.use('/api/prompt-writer', require('./routes/promptWriter.routes'));
app.use('/api/tools', require('./routes/tools.routes'));
app.use('/api/tools', aiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'Double Eight AI' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// MongoDB connection configuration
const mongooseOptions = {
  bufferCommands: false, 
  autoIndex: true,       
};

// 1. Define a function to connect and then start the server
const startServer = async () => {
  try {
    // Wait for the DB to be ready before moving to the next line
    await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
    console.log('✅ MongoDB connected');

    // 2. Only start listening for requests AFTER the DB is connected
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Double Eight AI Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV}`);
    });

  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    // If DB fails, we don't start the server at all
    process.exit(1);
  }
};

// 3. Run the function
startServer();

// Keep your export for Vercel
module.exports = app;
