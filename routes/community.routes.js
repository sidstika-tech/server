const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/community.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/posts', protect, ctrl.getPosts);
router.post('/posts', protect, ctrl.createPost);
router.delete('/posts/:id', protect, ctrl.deletePost);
router.post('/posts/:id/like', protect, ctrl.toggleLike);
router.post('/posts/:id/reply', protect, ctrl.addReply);
router.get('/stats', protect, ctrl.getStats);

module.exports = router;
