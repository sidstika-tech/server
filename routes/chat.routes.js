const express = require('express');
const router = express.Router();
const { getSessions, createSession, getSession, sendMessage, deleteSession } = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkChat } = require('../middleware/usageLimit.middleware');

router.use(protect);
router.get('/sessions', getSessions);
router.post('/sessions', createSession);
router.get('/sessions/:id', getSession);
router.delete('/sessions/:id', deleteSession);
router.post('/message', checkChat, sendMessage);

module.exports = router;
