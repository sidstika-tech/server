const ChatSession = require('../models/chatSession.model');
const User = require('../models/user.model');
const { streamChat } = require('../services/ai.service');

exports.getSessions = async (req, res) => {
  try {
    const sessions = await ChatSession.find({ user: req.user._id, isActive: true })
      .select('title createdAt updatedAt')
      .sort('-updatedAt')
      .limit(50);
    res.json({ success: true, sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createSession = async (req, res) => {
  try {
    const session = await ChatSession.create({ user: req.user._id, messages: [] });
    res.status(201).json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSession = async (req, res) => {
  try {
    const session = await ChatSession.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    let session;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, user: req.user._id });
    }
    if (!session) {
      session = await ChatSession.create({ user: req.user._id, messages: [] });
    }

    session.messages.push({ role: 'user', content: message });

    const chatHistory = session.messages.slice(-20).map(m => ({ role: m.role, content: m.content }));

    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullResponse = '';
    await streamChat(chatHistory, 'chat', (chunk) => {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });

    session.messages.push({ role: 'assistant', content: fullResponse });

    // Auto-title from first message
    if (session.messages.length <= 3) {
      session.title = message.slice(0, 60) + (message.length > 60 ? '...' : '');
    }

    await session.save();

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'usage.chatMessages': 1 } });

    res.write(`data: ${JSON.stringify({ done: true, sessionId: session._id })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
};

exports.deleteSession = async (req, res) => {
  try {
    await ChatSession.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isActive: false }
    );
    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
