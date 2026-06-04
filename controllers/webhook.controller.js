const MessagingIntegration = require('../models/messagingIntegration.model');
const MessagingConversation = require('../models/messagingConversation.model');
const { deepseekChat } = require('../services/gemini.service');

const GRAPH = 'https://graph.facebook.com/v19.0';
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'doubleeight_webhook_2024';
const _fetch = (...a) => fetch(...a);

/* ── Webhook verification (GET) ── */
exports.verifyWebhook = (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  res.sendStatus(403);
};

/* ── Main event handler (POST) ── */
exports.handleWebhook = async (req, res) => {
  res.sendStatus(200); // always respond fast
  try {
    const body = req.body;
    if (!body) return;

    // ── Instagram / Facebook Messenger ──
    if (body.object === 'page' || body.object === 'instagram') {
      for (const entry of (body.entry || [])) {
        for (const event of (entry.messaging || [])) {
          if (!event.message || event.message.is_echo) continue;
          const platform = body.object === 'instagram' ? 'instagram' : 'facebook';
          await handleMessage({ platform, pageId: entry.id, senderId: event.sender.id, text: event.message.text || '' });
        }
        // Instagram comments on posts (basic reply)
        for (const change of (entry.changes || [])) {
          if (change.field === 'comments' && change.value?.text) {
            await handleMessage({ platform: 'instagram', pageId: entry.id, senderId: change.value.from?.id, text: change.value.text, commentId: change.value.id, isComment: true });
          }
        }
      }
    }

    // ── WhatsApp ──
    if (body.object === 'whatsapp_business_account') {
      for (const entry of (body.entry || [])) {
        for (const change of (entry.changes || [])) {
          if (change.field !== 'messages') continue;
          const val = change.value || {};
          const phoneNumberId = val.metadata?.phone_number_id;
          for (const msg of (val.messages || [])) {
            if (msg.type !== 'text') continue;
            const contact = (val.contacts || []).find(c => c.wa_id === msg.from);
            await handleMessage({ platform: 'whatsapp', phoneNumberId, senderId: msg.from, senderName: contact?.profile?.name, text: msg.text?.body || '' });
          }
        }
      }
    }
  } catch(e) { console.error('[webhook] error:', e.message); }
};

/* ── Core AI reply handler ── */
async function handleMessage({ platform, pageId, phoneNumberId, senderId, senderName, text, isComment, commentId }) {
  if (!text?.trim() || !senderId) return;

  // Find the business who owns this page/phone
  const query = platform === 'whatsapp'
    ? { 'whatsapp.connected': true, 'whatsapp.phoneNumberId': phoneNumberId }
    : platform === 'instagram'
    ? { 'instagram.connected': true, 'instagram.pageId': pageId }
    : { 'facebook.connected': true, 'facebook.pageId': pageId };

  const integration = await MessagingIntegration.findOne(query);
  if (!integration) return;

  const ai = integration.ai;
  if (!ai.enabled) return;
  if (platform === 'instagram' && !ai.replyInstagram) return;
  if (platform === 'facebook' && !ai.replyFacebook) return;
  if (platform === 'whatsapp' && !ai.replyWhatsapp) return;

  const token = platform === 'whatsapp' ? integration.whatsapp?.accessToken
    : platform === 'instagram' ? integration.instagram?.accessToken
    : integration.facebook?.accessToken;
  if (!token) return;

  // Load conversation history
  let convo = await MessagingConversation.findOne({ user: integration.user, platform, senderId });
  if (!convo) convo = new MessagingConversation({ user: integration.user, platform, senderId, senderName: senderName || null, messages: [] });

  const history = convo.messages.slice(-16).map(m => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`).join('\n\n');

  const langAdd = ai.language === 'ar' ? '\n\nCRITICAL: Always respond in Arabic (العربية).'
    : ai.language === 'auto' ? '\n\nDetect the customer language and always reply in the same language.'
    : '';
  const sys = (ai.systemPrompt || 'You are a helpful assistant.') + langAdd;

  const prompt = history
    ? `Previous conversation:\n${history}\n\nNew message: ${text}`
    : `Customer message: ${text}`;

  let reply;
  try { reply = await deepseekChat(prompt, sys, { temperature: 0.7, maxTokens: 500 }); }
  catch(e) { console.error('[webhook] AI error:', e.message); return; }
  if (!reply?.trim()) return;

  // Send reply
  let sent = false;
  if (platform === 'facebook' || (platform === 'instagram' && !isComment)) {
    sent = await sendMessengerMsg(senderId, reply, token);
  } else if (platform === 'instagram' && isComment) {
    sent = await replyToComment(commentId, reply, token, integration.instagram.pageId);
  } else if (platform === 'whatsapp') {
    sent = await sendWhatsappMsg(integration.whatsapp.phoneNumberId, senderId, reply, token);
  }
  if (!sent) return;

  // Save history
  convo.messages.push({ role: 'user', content: text });
  convo.messages.push({ role: 'assistant', content: reply });
  if (convo.messages.length > 40) convo.messages = convo.messages.slice(-40);
  convo.lastMessageAt = new Date();
  if (senderName && !convo.senderName) convo.senderName = senderName;
  await convo.save();

  // Update stats
  await MessagingIntegration.findByIdAndUpdate(integration._id, {
    $inc: { 'stats.totalReplies': 1, [`stats.${platform}Replies`]: 1 },
    $set: { 'stats.lastReplyAt': new Date() },
  });
}

async function sendMessengerMsg(recipientId, text, token) {
  try {
    const r = await _fetch(`${GRAPH}/me/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text: text.slice(0, 2000) }, messaging_type: 'RESPONSE', access_token: token }),
    });
    const d = await r.json();
    return !d.error;
  } catch { return false; }
}

async function replyToComment(commentId, text, token, pageId) {
  try {
    const r = await _fetch(`${GRAPH}/${commentId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text.slice(0, 2000), access_token: token }),
    });
    const d = await r.json();
    return !d.error;
  } catch { return false; }
}

async function sendWhatsappMsg(phoneNumberId, to, text, token) {
  try {
    const r = await _fetch(`${GRAPH}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body: text.slice(0, 4096) } }),
    });
    const d = await r.json();
    return !d.error;
  } catch { return false; }
}
