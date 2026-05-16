const User = require('../models/user.model');
const Report = require('../models/report.model');
const ChatSession = require('../models/chatSession.model');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const reportCount = await Report.countDocuments({ user: req.user._id });
    const chatCount = await ChatSession.countDocuments({ user: req.user._id, isActive: true });
    res.json({ success: true, user, stats: { reports: reportCount, chats: chatCount } });
  } catch (error) {
    console.error('getProfile error:', error);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, settings } = req.body;
    const update = {};
    if (name) update.name = String(name).trim().slice(0, 100);
    if (settings && typeof settings === 'object') {
      update.settings = { ...req.user.settings, ...settings };
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
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
    console.error('changePassword error:', error);
    res.status(500).json({ error: 'Failed to update password.' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    res.json({ success: true, message: 'Account deactivated' });
  } catch (error) {
    console.error('deleteAccount error:', error);
    res.status(500).json({ error: 'Failed to deactivate account.' });
  }
};
