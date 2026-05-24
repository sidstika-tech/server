const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const { withKeyFallback } = require('./keyManager');

/* ══════════════════════════════════════════════════════════════════
   TWO CLIENTS — NOW WITH KEY POOL FALLBACK (up to 5 keys each)
   ─────────────────────────────────────────────────────────────────
   1. OPENROUTER  → DeepSeek, Claude Haiku, GPT-4o-mini, Grok image
   2. GEMINI      → Academy daily + Founder Path + VISION

   ENV VARS (Vercel):
     OPENROUTER_API_KEYS = sk-or-key1,sk-or-key2,sk-or-key3,sk-or-key4,sk-or-key5
     GEMINI_API_KEYS     = AIzaSy-key1,AIzaSy-key2,AIzaSy-key3,AIzaSy-key4,AIzaSy-key5

   Single-key fallback still works:
     OPENROUTER_API_KEY = sk-or-key1
     GEMINI_API_KEY     = AIzaSy-key1
══════════════════════════════════════════════════════════════════ */

// Create a fresh OpenRouter client per key (no singleton — pool needs per-key clients)
function makeOR(apiKey) {
  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: { 'HTTP-Referer': 'https://doubleeight.online', 'X-Title': 'Double Eight AI' },
  });
}

const MASTER_IDENTITY = `You are the AI core of Double Eight AI — the first business intelligence platform built for Arab and MENA entrepreneurs.
Your users are first-generation entrepreneurs with limited budgets and unlimited ambition.
Principles: Specificity, Respect, Cultural Awareness, Always Actionable, Honest.`;

function arabicDirective(lang) {
  if (lang !== 'ar') return '';
  return `\n\nCRITICAL: Write ENTIRE response in Modern Standard Arabic (الفصحى). Keep proper nouns in original. Never respond in English.`;
}

/* ══════════════════════════════════════════════════════════════════
   CORE OPENROUTER CALL — tries each key until one succeeds
══════════════════════════════════════════════════════════════════ */
function orChat(model, prompt, sys, opts) {
  return withKeyFallback('openrouter', async (apiKey) => {
    const client = makeOR(apiKey);
    let sysMsg = sys || MASTER_IDENTITY;
    if (opts?.language === 'ar') sysMsg += arabicDirective('ar');
    if (opts?.json) sysMsg += '\n\nReturn ONLY valid JSON. No markdown, no backticks.';
    const params = {
      model,
      messages: [{ role: 'system', content: sysMsg }, { role: 'user', content: prompt }],
      temperature: opts?.temperature ?? 0.7,
      top_p: opts?.topP ?? 0.95,
      max_tokens: opts?.maxTokens || 4096,
    };
    if (opts?.json && !model.startsWith('anthropic/')) params.response_format = { type: 'json_object' };
    const c = await client.chat.completions.create(params);
    return c.choices?.[0]?.message?.content || '';
  });
}

/* ═══ 1. DEEPSEEK — Chat Advisor ═══ */
async function deepseekChat(prompt, sys, opts) {
  return orChat('deepseek/deepseek-chat-v3-0324', prompt, sys, opts);
}

/* ═══ 1b. DEEPSEEK STREAM — Chat Advisor streaming ═══
   Stream doesn't retry mid-stream, but picks the best available key upfront.
   If the chosen key fails before stream starts, fallback kicks in. */
async function deepseekStream(messages, sys, onChunk) {
  return withKeyFallback('openrouter', async (apiKey) => {
    const client = makeOR(apiKey);
    const stream = await client.chat.completions.create({
      model: 'deepseek/deepseek-chat-v3-0324',
      messages: [{ role: 'system', content: sys || MASTER_IDENTITY }, ...messages],
      temperature: 0.65,
      top_p: 0.9,
      max_tokens: 3000,
      stream: true,
    });
    let full = '';
    for await (const chunk of stream) {
      const t = chunk.choices?.[0]?.delta?.content || '';
      if (t) { full += t; if (onChunk) onChunk(t); }
    }
    return full;
  });
}

/* ═══ 2. CLAUDE 3 HAIKU — DNA + Launch Package ═══ */
async function openrouterChat(prompt, sys, opts) {
  return orChat(opts?.model || 'anthropic/claude-3-haiku', prompt, sys, { ...opts, maxTokens: opts?.maxTokens || 6000 });
}

/* ═══ 3. GPT-4o-mini — AI Tools ═══ */
async function openaiChat(prompt, sys, opts) {
  return orChat(opts?.model || 'openai/gpt-4o-mini', prompt, sys, opts);
}

/* ═══ 4. GEMINI FLASH — Academy + general Gemini tasks ═══ */
async function geminiChat(prompt, sys, opts) {
  return withKeyFallback('gemini', async (apiKey) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    let s = sys || MASTER_IDENTITY;
    let p = prompt;
    if (opts?.language === 'ar') { s += arabicDirective('ar'); p = `[ARABIC]\n\n${prompt}`; }
    const model = genAI.getGenerativeModel({
      model: opts?.model || 'gemini-2.0-flash',
      systemInstruction: s,
      generationConfig: {
        temperature: opts?.temperature ?? 0.7,
        topP: opts?.topP ?? 0.95,
        maxOutputTokens: opts?.maxTokens || 4096,
        ...(opts?.json ? { responseMimeType: 'application/json' } : {}),
      },
    });
    const result = await model.generateContent(p);
    return result.response.text();
  });
}

/* ═══ 4b. GEMINI VISION — image analysis in chat ═══
   DeepSeek V3 is text-only. Images route here. */
async function geminiVision(textPrompt, base64Image, sys) {
  return withKeyFallback('gemini', async (apiKey) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: sys || MASTER_IDENTITY,
      generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 4096 },
    });

    // Extract base64 data and mime type from data URL
    let mimeType = 'image/jpeg';
    let rawBase64 = base64Image;
    if (typeof base64Image === 'string' && base64Image.startsWith('data:')) {
      const parts = base64Image.split(',');
      if (parts.length > 1) {
        rawBase64 = parts[1];
        const mimeMatch = parts[0].match(/:(.*?);/);
        if (mimeMatch) mimeType = mimeMatch[1];
      }
    }

    const parts = [
      { inlineData: { mimeType, data: rawBase64 } },
      { text: textPrompt || 'Analyze this image and provide actionable business feedback.' },
    ];

    const result = await model.generateContent(parts);
    return result.response.text();
  });
}

/* ═══ 5. IMAGE GENERATION — Grok via OpenRouter ═══ */
async function generateImage(prompt, options = {}) {
  return withKeyFallback('openrouter', async (apiKey) => {
    const client = makeOR(apiKey);
    const imageData = options.imageData;

    const content = [];
    if (imageData) {
      let base64Url = imageData;
      if (typeof imageData === 'string' && !imageData.startsWith('data:')) {
        base64Url = `data:image/jpeg;base64,${imageData}`;
      }
      content.push({ type: 'image_url', image_url: { url: base64Url } });
      content.push({ type: 'text', text: `Analyze or edit this image based on this instruction: ${prompt}` });
    } else {
      content.push({ type: 'text', text: `Generate an image: ${prompt}. Professional quality, high resolution, detailed, visually striking.` });
    }

    const response = await client.chat.completions.create({
      model: 'x-ai/grok-imagine-image-quality',
      messages: [{ role: 'user', content }],
      modalities: ['image'],
      max_tokens: 1024,
    });

    const message = response.choices?.[0]?.message;
    const urls = [];

    if (message?.images) {
      message.images.forEach(img => {
        if (img.image_url?.url) urls.push(img.image_url.url);
        else if (img.url) urls.push(img.url);
      });
    }

    if (!urls.length && message?.content && Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === 'image_url' && part.image_url?.url) {
          urls.push(part.image_url.url);
        }
      }
    }

    if (!urls.length && typeof message?.content === 'string') {
      const urlMatch = message.content.match(/https?:\/\/[^\s"'<>]+\.(png|jpg|jpeg|webp|gif)/gi);
      if (urlMatch) urls.push(...urlMatch);
    }

    if (!urls.length) {
      // Gemini image fallback — also uses key pool
      const geminiUrls = await withKeyFallback('gemini', async (geminiKey) => {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const gModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await gModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: `Generate an image: ${prompt}` }] }],
        });
        const parts = result.response.candidates?.[0]?.content?.parts || [];
        return parts
          .filter(p => p.inlineData?.mimeType?.startsWith('image/'))
          .map(p => `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`);
      });
      if (geminiUrls?.length) return geminiUrls;
      throw new Error('Image generation failed. No images returned from any provider.');
    }

    return urls;
  });
}

/* ═══ DAILY ACADEMY NEWS — Gemini Flash ═══ */
async function generateAcademyDaily() {
  return withKeyFallback('gemini', async (apiKey) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const today = new Date().toISOString().slice(0, 10);
    const todayHuman = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const prompt = `Today is ${todayHuman}. Generate 3 MENA-only business intelligence cards.
CARD 1: MENA Markets. CARD 2: MENA Founder story. CARD 3: MENA Opportunity this week.
All MENA. Real URLs from arabnews.com/gulfnews.com/zawya.com/forbesmiddleeast.com/menabytes.com. Correct flag emoji.
Return ONLY JSON:
{"cards":[{"id":"card1","type":"market","icon":"📈","country":"","countryFlag":"","category":"MENA Markets","title":"","summary":"","opportunity":"","source":"","sourceUrl":""},{"id":"card2","type":"success","icon":"🏆","country":"","countryFlag":"","category":"MENA Founder Story","title":"","summary":"","opportunity":"","source":"","sourceUrl":""},{"id":"card3","type":"opportunity","icon":"🚀","country":"","countryFlag":"","category":"MENA Opportunity","title":"","summary":"","opportunity":"","source":"","sourceUrl":""}],"generatedAt":"${today}"}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: 'MENA-only intelligence curator. Return ONLY valid JSON.',
      generationConfig: { temperature: 0.8, topP: 0.95, responseMimeType: 'application/json', maxOutputTokens: 2048 },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(text);
  });
}

module.exports = {
  geminiChat,
  geminiVision,
  openrouterChat,
  openaiChat,
  deepseekChat,
  deepseekStream,
  generateImage,
  generateAcademyDaily,
  MASTER_IDENTITY,
};
