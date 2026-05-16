const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

const limiter = rateLimit({ windowMs:15*60*1000, max:100, message:{error:'Too many requests.'} });
const aiLimiter = rateLimit({ windowMs:60*1000, max:20, message:{error:'AI rate limit exceeded.'} });

app.use(cors({
  origin:[
    'http://doubleeight.online','https://doubleeight.online',
    'http://www.doubleeight.online','https://www.doubleeight.online',
    'http://localhost:3000','http://localhost:5500','http://127.0.0.1:5500',
  ],
  credentials:true
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

app.get('/api/health', (req,res) => res.json({ status:'OK', service:'Double Eight AI', timestamp:new Date().toISOString() }));

app.use((err,req,res,next) => {
  console.error('Unhandled error:', err.stack);
  const status = err.status || 500;
  // Never expose internal error details to clients
  const message = status < 500 ? err.message : 'Something went wrong. Please try again.';
  res.status(status).json({ error: message });
});

if(process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}
module.exports = app;
