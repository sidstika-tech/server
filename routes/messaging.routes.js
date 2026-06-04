const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const m = require('../controllers/messaging.controller');
const wh = require('../controllers/webhook.controller');

/* Public — Meta webhook */
router.get('/webhook', wh.verifyWebhook);
router.post('/webhook', wh.handleWebhook);

/* Public — OAuth callback (Meta redirects here) */
router.get('/oauth/callback', m.oauthCallback);

/* Protected */
router.use(protect);
router.get('/oauth/:platform', m.getOAuthUrl);
router.get('/status', m.getStatus);
router.delete('/disconnect/:platform', m.disconnect);
router.put('/ai-settings', m.updateAiSettings);
router.get('/conversations', m.getConversations);
router.post('/publish', m.publishPost);
router.get('/posts', m.getScheduledPosts);
router.delete('/posts/:id', m.deleteScheduledPost);

module.exports = router;
