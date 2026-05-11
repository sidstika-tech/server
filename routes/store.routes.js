// store.routes.js
const express = require('express');
const r = express.Router();
const { auth } = require('../middleware/auth.middleware');
r.get('/templates', auth, (req, res) => res.json({ success: true, templates: [
  { id: 'minimal', name: 'Minimal Dark', preview: '🖤', tags: ['clean','modern'] },
  { id: 'luxury', name: 'Luxury Gold', preview: '✨', tags: ['premium','elegant'] },
  { id: 'tech', name: 'Tech Bold', preview: '⚡', tags: ['tech','startup'] },
  { id: 'organic', name: 'Organic Natural', preview: '🌿', tags: ['eco','wellness'] },
]}));
module.exports = r;
