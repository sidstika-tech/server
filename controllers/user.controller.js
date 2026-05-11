const User = require('../models/user.model');
const Report = require('../models/report.model');
const ChatSession = require('../models/chatSession.model');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const reportCount = await Report.countDocuments({ user: req.user._id });
    const chatCount = await ChatSession.countDocuments({ user: req.user._id, isActive: true });
    res.json({ success: true, user, stats: { reports: reportCount, chats: chatCount } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, settings } = req.body;
    const update = {};
    if (name) update.name = name;
    if (settings) update.settings = { ...req.user.settings, ...settings };

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'All fields required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = await User.findById(req.user._id);
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    res.json({ success: true, message: 'Account deactivated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
