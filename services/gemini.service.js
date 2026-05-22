const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

/* ══════════════════════════════════════════════════════════════════
   TWO CLIENTS:
   1. OPENROUTER  → DeepSeek, Claude Haiku, GPT-4o-mini, Grok image
   2. GEMINI      → Academy daily + Founder Path + VISION (image reading in chat)

   ENV: OPENROUTER_API_KEY, GEMINI_API_KEY
══════════════════════════════════════════════════════════════════ */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let _or = null;
function getOR() {
  if (_or) return _or;
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not set');
  _or = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: { 'HTTP-Referer': 'https://doubleeight.online', 'X-Title': 'Double Eight AI' },
  });
  return _or;
}

const MASTER_IDENTITY = `You are the AI core of Double Eight AI — the first business intelligence platform built for Arab and MENA entrepreneurs.
Your users are first-generation entrepreneurs with limited budgets and unlimited ambition.
Principles: Specificity, Respect, Cultural Awareness, Always Actionable, Honest.`;

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function withRetry(fn, { tries = 3, baseDelay = 700, label = 'ai' } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      if (/429|quota|rate.?limit|exhausted/i.test(err?.message || '')) throw err;
      if (i < tries - 1) {
        const wait = baseDelay * Math.pow(2, i);
        console.warn(`[${label}] attempt ${i + 1} failed (${(err.message || '').slice(0, 100)}). Retrying in ${wait}ms`);
        await delay(wait);
      } else throw err;
    }
  }
  throw lastErr;
}

function arabicDirective(lang) {
  if (lang !== 'ar') return '';
  return `\n\nCRITICAL: Write ENTIRE response in Modern Standard Arabic (الفصحى). Keep proper nouns in original. Never respond in English.`;
}

function orChat(model, prompt, sys, opts) {
  return withRetry(async () => {
    const client = getOR();
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
  }, { tries: 3, baseDelay: 700, label: model.split('/').pop() });
}

/* ═══ 1. DEEPSEEK — Chat Advisor ═══ */
async function deepseekChat(prompt, sys, opts) {
  return orChat('deepseek/deepseek-chat-v3-0324', prompt, sys, opts);
}

async function deepseekStream(messages, sys, onChunk) {
  const client = getOR();
  const stream = await client.chat.completions.create({
    model: 'deepseek/deepseek-chat-v3-0324',
    messages: [{ role: 'system', content: sys || MASTER_IDENTITY }, ...messages],
    temperature: 0.7, top_p: 0.95, max_tokens: 2048, stream: true,
  });
  let full = '';
  for await (const chunk of stream) {
    const t = chunk.choices?.[0]?.delta?.content || '';
    if (t) { full += t; if (onChunk) onChunk(t); }
  }
  return full;
}

/* ═══ 2. CLAUDE 3 HAIKU — DNA + Launch Package ═══ */
async function openrouterChat(prompt, sys, opts) {
  return orChat(opts?.model || 'anthropic/claude-3-haiku', prompt, sys, { ...opts, maxTokens: opts?.maxTokens || 6000 });
}

/* ═══ 3. GPT-4o-mini — AI Tools ═══ */
async function openaiChat(prompt, sys, opts) {
  return orChat(opts?.model || 'openai/gpt-4o-mini', prompt, sys, opts);
}

/* ═══ 4. GEMINI FLASH — Academy + VISION ═══ */
async function geminiChat(prompt, sys, opts) {
  return withRetry(async () => {
    let s = sys || MASTER_IDENTITY;
    let p = prompt;
    if (opts?.language === 'ar') { s += arabicDirective('ar'); p = `[ARABIC]\n\n${prompt}`; }
    const model = genAI.getGenerativeModel({
      model: opts?.model || 'gemini-2.5-flash',
      systemInstruction: s,
      generationConfig: {
        temperature: opts?.temperature ?? 0.7,
        topP: opts?.topP ?? 0.95,
        ...(opts?.json ? { responseMimeType: 'application/json' } : {}),
      },
    });
    const result = await model.generateContent(p);
    return result.response.text();
  }, { tries: 3, baseDelay: 700, label: 'gemini' });
}

/* ═══ 4b. GEMINI VISION — for chat image analysis ═══
   DeepSeek V3 is text-only. When user sends an image in chat,
   we route to Gemini Flash which HAS vision capability.
   This function takes the image as base64 + user's text question. */
async function geminiVision(textPrompt, base64Image, sys) {
  return withRetry(async () => {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: sys || MASTER_IDENTITY,
      generationConfig: { temperature: 0.7, topP: 0.95 },
    });

    // Extract the actual base64 data and mime type from the data URL
    let mimeType = 'image/jpeg';
    let rawBase64 = base64Image;
    if (base64Image.startsWith('data:')) {
      const match = base64Image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) { mimeType = match[1]; rawBase64 = match[2]; }
    }

    const parts = [
      { text: textPrompt || 'Analyze this image and provide actionable business feedback.' },
      { inlineData: { mimeType, data: rawBase64 } },
    ];

    const result = await model.generateContent(parts);
    return result.response.text();
  }, { tries: 2, baseDelay: 1000, label: 'geminiVision' });
}

/* ═══ 5. IMAGE GENERATION ═══
   Primary: OpenRouter images.generate with x-ai/grok-2-image
   Fallback: Gemini Flash native image generation (imagen-3.0-generate)
   
   OpenRouter's images.generate may or may not support Grok.
   If it fails, we fall back to Google's Imagen via Gemini API. */
async function generateImage(prompt, options = {}) {
  return withRetry(async () => {
    const client = getOR();
    const imageData = options.imageData; // base64 reference image if user uploaded one

    // Build the message content
    // Grok supports both text-to-image AND image+text editing
    // via chat.completions with the image in the user message
    const content = [];

    // If user uploaded a reference image, include it
    if (imageData) {
      const base64Url = imageData.startsWith('data:')
        ? imageData
        : `data:image/jpeg;base64,${imageData}`;
      content.push({ type: 'image_url', image_url: { url: base64Url } });
      content.push({ type: 'text', text: `Edit this image based on this instruction: ${prompt}` });
    } else {
      content.push({ type: 'text', text: `Generate an image: ${prompt}. Professional quality, high resolution, detailed, visually striking.` });
    }

    const response = await client.chat.completions.create({
      model: "x-ai/grok-imagine-image-quality",
      messages: [
    {
      role: "user",
      content: "Generate a beautiful sunset over mountains"
    }
  ],
  modalities: ["image"]
});

const message = result.choices[0].message;
if (message.images) {
  message.images.forEach((image, index) => {
    const imageUrl = image.image_url.url;
    console.log(`Generated image ${index + 1}: ${imageUrl.substring(0, 50)}...`);
  });
};

    // Check for image URLs in content array
    if (message?.content && Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === 'image_url' && part.image_url?.url) {
          urls.push(part.image_url.url);
        }
      }
    }

    // Check for images array (some API versions)
    if (message?.images?.length) {
      for (const img of message.images) {
        if (img.url) urls.push(img.url);
        else if (img.b64_json) urls.push(`data:image/png;base64,${img.b64_json}`);
      }
    }

    // Check if the content itself is a URL string
    if (!urls.length && typeof message?.content === 'string') {
      const urlMatch = message.content.match(/https?:\/\/[^\s"'<>]+\.(png|jpg|jpeg|webp|gif)/gi);
      if (urlMatch) urls.push(...urlMatch);
    }

    if (!urls.length) {
      // Fallback: try Gemini imagen
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `Generate an image: ${prompt}` }] }],
        });
        const parts = result.response.candidates?.[0]?.content?.parts || [];
        const geminiImages = parts
          .filter(p => p.inlineData?.mimeType?.startsWith('image/'))
          .map(p => `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`);
        if (geminiImages.length) return geminiImages;
      } catch (e2) {
        console.warn('[imageGen] Gemini fallback failed:', e2.message?.slice(0, 80));
      }
      throw new Error('Image generation failed. No images returned.');
    }

    return urls;
  }, { tries: 2, baseDelay: 1500, label: 'imageGen' });
}

/* ═══ DAILY ACADEMY NEWS — Gemini Flash ═══ */
async function generateAcademyDaily() {
  return withRetry(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const todayHuman = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const prompt = `Today is ${todayHuman}. Generate 3 MENA-only business intelligence cards.
CARD 1: MENA Markets. CARD 2: MENA Founder story. CARD 3: MENA Opportunity this week.
All MENA. Real URLs from arabnews.com/gulfnews.com/zawya.com/forbesmiddleeast.com/menabytes.com. Correct flag emoji.
Return ONLY JSON:
{"cards":[{"id":"card1","type":"market","icon":"📈","country":"","countryFlag":"","category":"MENA Markets","title":"","summary":"","opportunity":"","source":"","sourceUrl":""},{"id":"card2","type":"success","icon":"🏆","country":"","countryFlag":"","category":"MENA Founder Story","title":"","summary":"","opportunity":"","source":"","sourceUrl":""},{"id":"card3","type":"opportunity","icon":"🚀","country":"","countryFlag":"","category":"MENA Opportunity","title":"","summary":"","opportunity":"","source":"","sourceUrl":""}],"generatedAt":"${today}"}`;
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: 'MENA-only intelligence curator. Return ONLY valid JSON.',
      generationConfig: { temperature: 0.8, topP: 0.95, responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(text);
  }, { tries: 3, baseDelay: 800, label: 'academyDaily' });
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
