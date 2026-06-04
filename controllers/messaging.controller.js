const MessagingIntegration = require('../models/messagingIntegration.model');
const MessagingConversation = require('../models/messagingConversation.model');
const ScheduledPost = require('../models/scheduledPost.model');

const GRAPH = 'https://graph.facebook.com/v19.0';
const _fetch = (...a) => fetch(...a);

/* ─── Graph API helper ─── */
async function gGet(path, token) {
  const r = await _fetch(`${GRAPH}${path}${path.includes('?')?'&':'?'}access_token=${token}`);
  return r.json();
}
async function gPost(path, token, body) {
  const r = await _fetch(`${GRAPH}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return r.json();
}

/* ══════════════════════════════════════
   GET STATUS
══════════════════════════════════════ */
exports.getStatus = async (req, res) => {
  try {
    let ig = await MessagingIntegration.findOne({ user: req.user._id });
    if (!ig) ig = await MessagingIntegration.create({ user: req.user._id });
    const d = ig.toObject();
    if (d.instagram?.accessToken) d.instagram.accessToken = '••••';
    if (d.facebook?.accessToken) d.facebook.accessToken = '••••';
    if (d.whatsapp?.accessToken) d.whatsapp.accessToken = '••••';
    res.json({ success: true, integration: d });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

/* ══════════════════════════════════════
   OAUTH — STEP 1: build auth URL
   Called when user clicks "Connect"
══════════════════════════════════════ */
exports.getOAuthUrl = async (req, res) => {
  try {
    const { platform } = req.params;
    const appId = process.env.META_APP_ID;
    if (!appId) return res.status(500).json({ error: 'META_APP_ID not configured on server.' });

    const redirectUri = encodeURIComponent(`${process.env.SERVER_URL || 'https://api.doubleeight.online'}/api/messaging/oauth/callback`);
    const state = encodeURIComponent(JSON.stringify({ userId: req.user._id.toString(), platform }));

    // Permissions needed for all 3 platforms
    const scopes = [
      'pages_show_list',
      'pages_manage_metadata',
      'pages_messaging',
      'pages_read_engagement',
      'pages_manage_posts',
      'instagram_basic',
      'instagram_manage_messages',
      'instagram_content_publish',
      'whatsapp_business_management',
      'whatsapp_business_messaging',
      'business_management',
    ].join(',');

    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scopes}&state=${state}&response_type=code`;
    res.json({ success: true, url });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

/* ══════════════════════════════════════
   OAUTH — STEP 2: callback
   Meta redirects here after user approves
══════════════════════════════════════ */
exports.oauthCallback = async (req, res) => {
  const SERVER_URL = process.env.SERVER_URL || 'https://api.doubleeight.online';
  const CLIENT_URL = process.env.CLIENT_URL || 'https://doubleeight.online';

  try {
    const { code, state, error } = req.query;
    if (error) return res.redirect(`${CLIENT_URL}/pages/messaging.html?error=${encodeURIComponent(error)}`);
    if (!code || !state) return res.redirect(`${CLIENT_URL}/pages/messaging.html?error=missing_code`);

    let parsed;
    try { parsed = JSON.parse(decodeURIComponent(state)); }
    catch { return res.redirect(`${CLIENT_URL}/pages/messaging.html?error=invalid_state`); }

    const { userId, platform } = parsed;

    // Exchange code for short-lived token
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = `${SERVER_URL}/api/messaging/oauth/callback`;

    const tokenRes = await _fetch(
      `${GRAPH}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (tokenData.error) return res.redirect(`${CLIENT_URL}/pages/messaging.html?error=${encodeURIComponent(tokenData.error.message)}`);

    // Exchange for long-lived token (60 days)
    const llRes = await _fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    );
    const llData = await llRes.json();
    const longToken = llData.access_token || tokenData.access_token;

    // Get all pages the user manages
    const pagesData = await gGet('/me/accounts', longToken);
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return res.redirect(`${CLIENT_URL}/pages/messaging.html?error=no_pages_found`);
    }

    // For simplicity, use the first page (user can switch later)
    const page = pages[0];
    const pageToken = page.access_token; // never-expiring page token

    const update = {};

    // Always connect Facebook when OAuth completes (they authorized a Page)
    update['facebook.connected'] = true;
    update['facebook.pageId'] = page.id;
    update['facebook.pageName'] = page.name;
    update['facebook.accessToken'] = pageToken;
    update['facebook.connectedAt'] = new Date();

    // Subscribe page to webhook
    await gPost(`/${page.id}/subscribed_apps`, pageToken, {
      subscribed_fields: ['messages', 'messaging_postbacks', 'feed'],
    });

    // Connect Instagram if linked to this page
    const igData = await gGet(`/${page.id}?fields=instagram_business_account`, pageToken);
    if (igData.instagram_business_account?.id) {
      const igId = igData.instagram_business_account.id;
      const igInfo = await gGet(`/${igId}?fields=name,username,profile_picture_url`, pageToken);
      update['instagram.connected'] = true;
      update['instagram.pageId'] = igId;
      update['instagram.pageName'] = igInfo.name || igInfo.username || 'Instagram';
      update['instagram.pageAvatar'] = igInfo.profile_picture_url || null;
      update['instagram.accessToken'] = pageToken;
      update['instagram.connectedAt'] = new Date();
    }

    // Connect WhatsApp if linked to this business
    const wabaRes = await gGet(`/me?fields=id`, longToken);
    const wabaData = await _fetch(`${GRAPH}/me/whatsapp_business_accounts?access_token=${longToken}`);
    const wabaJson = await wabaData.json();
    if (wabaJson.data?.length > 0) {
      const waba = wabaJson.data[0];
      const pnRes = await gGet(`/${waba.id}/phone_numbers`, longToken);
      if (pnRes.data?.length > 0) {
        const pn = pnRes.data[0];
        update['whatsapp.connected'] = true;
        update['whatsapp.phoneNumberId'] = pn.id;
        update['whatsapp.phoneNumber'] = pn.display_phone_number;
        update['whatsapp.accessToken'] = longToken;
        update['whatsapp.wabaId'] = waba.id;
        update['whatsapp.connectedAt'] = new Date();
      }
    }

    await MessagingIntegration.findOneAndUpdate(
      { user: userId },
      { $set: update },
      { upsert: true, new: true }
    );

    return res.redirect(`${CLIENT_URL}/pages/messaging.html?connected=1`);
  } catch(e) {
    console.error('OAuth callback error:', e);
    return res.redirect(`${process.env.CLIENT_URL || 'https://doubleeight.online'}/pages/messaging.html?error=${encodeURIComponent(e.message)}`);
  }
};

/* ══════════════════════════════════════
   DISCONNECT
══════════════════════════════════════ */
exports.disconnect = async (req, res) => {
  try {
    const { platform } = req.params;
    if (!['instagram','facebook','whatsapp'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }
    const update = {};
    update[`${platform}.connected`] = false;
    update[`${platform}.pageId`] = null;
    update[`${platform}.pageName`] = null;
    update[`${platform}.accessToken`] = null;
    update[`${platform}.connectedAt`] = null;
    if (platform === 'whatsapp') { update['whatsapp.phoneNumberId'] = null; update['whatsapp.phoneNumber'] = null; update['whatsapp.wabaId'] = null; }
    await MessagingIntegration.findOneAndUpdate({ user: req.user._id }, { $set: update }, { upsert: true });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

/* ══════════════════════════════════════
   UPDATE AI SETTINGS
══════════════════════════════════════ */
exports.updateAiSettings = async (req, res) => {
  try {
    const { enabled, systemPrompt, replyInstagram, replyFacebook, replyWhatsapp, language, autoPost } = req.body;
    const u = {};
    if (typeof enabled === 'boolean') u['ai.enabled'] = enabled;
    if (typeof systemPrompt === 'string') u['ai.systemPrompt'] = systemPrompt.slice(0, 3000);
    if (typeof replyInstagram === 'boolean') u['ai.replyInstagram'] = replyInstagram;
    if (typeof replyFacebook === 'boolean') u['ai.replyFacebook'] = replyFacebook;
    if (typeof replyWhatsapp === 'boolean') u['ai.replyWhatsapp'] = replyWhatsapp;
    if (typeof autoPost === 'boolean') u['ai.autoPost'] = autoPost;
    if (['en','ar','auto'].includes(language)) u['ai.language'] = language;
    await MessagingIntegration.findOneAndUpdate({ user: req.user._id }, { $set: u }, { upsert: true });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

/* ══════════════════════════════════════
   GET CONVERSATIONS
══════════════════════════════════════ */
exports.getConversations = async (req, res) => {
  try {
    const convos = await MessagingConversation.find({ user: req.user._id })
      .sort({ lastMessageAt: -1 }).limit(30)
      .select('platform senderName senderId messages lastMessageAt');
    res.json({ success: true, conversations: convos });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

/* ══════════════════════════════════════
   SCHEDULE / PUBLISH POST
══════════════════════════════════════ */
exports.publishPost = async (req, res) => {
  try {
    const { content, platforms, scheduledAt, mediaUrl } = req.body;
    if (!content || !platforms?.length) return res.status(400).json({ error: 'content and platforms required' });

    const ig = await MessagingIntegration.findOne({ user: req.user._id });
    if (!ig) return res.status(404).json({ error: 'No integration found' });

    const postTime = scheduledAt ? new Date(scheduledAt) : null;

    // If no scheduledAt or it's now — publish immediately
    if (!postTime || postTime <= new Date()) {
      const results = {};
      for (const platform of platforms) {
        try {
          if (platform === 'facebook' && ig.facebook?.connected && ig.facebook?.accessToken) {
            const r = await gPost(`/${ig.facebook.pageId}/feed`, ig.facebook.accessToken, { message: content });
            results.facebook = r.id ? { success: true, postId: r.id } : { success: false, error: r.error?.message };
          }
          if (platform === 'instagram' && ig.instagram?.connected && ig.instagram?.accessToken) {
            // Step 1: create media container
            const containerBody = { caption: content, access_token: ig.instagram.accessToken };
            if (mediaUrl) containerBody.image_url = mediaUrl;
            else containerBody.media_type = 'REELS'; // text-only not supported — skip or use image
            if (mediaUrl) {
              const container = await gPost(`/${ig.instagram.pageId}/media`, ig.instagram.accessToken, containerBody);
              if (container.id) {
                const publish = await gPost(`/${ig.instagram.pageId}/media_publish`, ig.instagram.accessToken, { creation_id: container.id });
                results.instagram = publish.id ? { success: true, postId: publish.id } : { success: false, error: 'publish failed' };
              }
            } else {
              results.instagram = { success: false, error: 'Instagram requires an image or video' };
            }
          }
          if (platform === 'whatsapp') {
            results.whatsapp = { success: false, error: 'WhatsApp broadcasts not supported in this version' };
          }
        } catch(e) { results[platform] = { success: false, error: e.message }; }
      }
      // Update stats
      const published = Object.values(results).filter(r => r.success).length;
      if (published > 0) {
        await MessagingIntegration.findOneAndUpdate({ user: req.user._id }, { $inc: { 'stats.postsPublished': published } });
      }
      return res.json({ success: true, immediate: true, results });
    }

    // Schedule for later
    const post = await ScheduledPost.create({
      user: req.user._id, platforms, content, mediaUrl: mediaUrl || null, scheduledAt: postTime,
    });
    res.json({ success: true, scheduled: true, post });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

/* GET scheduled posts */
exports.getScheduledPosts = async (req, res) => {
  try {
    const posts = await ScheduledPost.find({ user: req.user._id }).sort({ scheduledAt: 1 }).limit(50);
    res.json({ success: true, posts });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

/* DELETE scheduled post */
exports.deleteScheduledPost = async (req, res) => {
  try {
    await ScheduledPost.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
};
