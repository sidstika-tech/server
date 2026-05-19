const Notification = require('../models/notification.model');

/* ──────────────────────────────────────────────────────────────────
   NOTIFICATION CONTROLLER
   Endpoints used by the bell icon + notification drawer.
   Internal modules (Competitor cron, Academy milestone hook)
   call `createNotification` directly — not exposed via HTTP.
──────────────────────────────────────────────────────────────────── */

// Internal helper — used by competitor cron, academy, etc.
async function createNotification({ user, type, title, body, icon, actionUrl, actionLabel, meta, sendEmail }) {
  return Notification.create({
    user, type,
    title: String(title || '').slice(0, 140),
    body:  String(body  || '').slice(0, 2000),
    icon:  icon || '◎',
    actionUrl: actionUrl || null,
    actionLabel: actionLabel || null,
    meta: meta || {},
    channels: {
      inApp: true,
      email: !!sendEmail,
      emailSentAt: null,   // set by email worker when delivered
    },
  });
}

// GET /api/notifications — list user's notifications (newest first)
exports.list = async (req, res) => {
  try {
    const { unread, limit = 30 } = req.query;
    const filter = { user: req.user._id };
    if (unread === 'true') filter.read = false;

    const notifications = await Notification.find(filter)
      .sort('-createdAt')
      .limit(Math.min(Number(limit) || 30, 100))
      .lean();

    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });

    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    console.error('notification.list error:', err);
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
};

// GET /api/notifications/unread-count — lightweight badge poll
exports.unreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: 'Failed.' });
  }
};

// PUT /api/notifications/:id/read — mark one as read
exports.markRead = async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, notification: n });
  } catch (err) {
    console.error('notification.markRead error:', err);
    res.status(500).json({ error: 'Failed to mark as read.' });
  }
};

// PUT /api/notifications/read-all — mark every notification as read
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    console.error('notification.markAllRead error:', err);
    res.status(500).json({ error: 'Failed.' });
  }
};

// DELETE /api/notifications/:id — dismiss
exports.dismiss = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    console.error('notification.dismiss error:', err);
    res.status(500).json({ error: 'Failed to dismiss.' });
  }
};

// DELETE /api/notifications — clear all (read + unread)
exports.clearAll = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    console.error('notification.clearAll error:', err);
    res.status(500).json({ error: 'Failed.' });
  }
};

// Expose the internal helper for cron jobs + other controllers
exports.createNotification = createNotification;
