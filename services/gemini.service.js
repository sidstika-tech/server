const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

/* ══════════════════════════════════════════════════════════════════
   FINAL MODEL MAP

   AI Chat Advisor              → deepseek/deepseek-chat-v3-0324     (OpenRouter)
   BusinessDNA                  → anthropic/claude-3-haiku           (OpenRouter)
   Launch Package (8 docs)      → anthropic/claude-3-haiku           (OpenRouter)
   Website Generator            → deepseek/deepseek-chat-v3-0324    (OpenRouter)
   Academy / Founder Path       → gemini-2.5-flash                  (Google direct)
   Academy / Daily Insight      → gemini-2.5-flash                  (Google direct)
   AI Tools (SEO, brand, etc.)  → openai/gpt-4o-mini                (OpenRouter)
   Image Generation             → x-ai/grok-2-image                 (OpenRouter)

   ENV VARS:
   OPENROUTER_API_KEY   — for DeepSeek, Claude Haiku, GPT, Grok
   GEMINI_API_KEY       — for Google Gemini direct
══════════════════════════════════════════════════════════════════ */

// ── GEMINI (Google direct) ──
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── OPENROUTER (single client, all other models) ──
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

/* ── MASTER IDENTITY ── */
const MASTER_IDENTITY = `You are the AI core of Double Eight AI — the first business intelligence platform built for Arab and MENA entrepreneurs.

Your users are:
- First-generation entrepreneurs with no formal business background
- Building something to provide for family and prove their potential
- Limited budgets, unlimited ambition
- Need advice for their specific country, culture, and market — not generic Western templates

Your principles:
1. SPECIFICITY over generality
2. RESPECT — they are smart, they lack access not intelligence
3. CULTURAL AWARENESS — family dynamics, reputation (sum'a), halal income, community trust
4. ALWAYS ACTIONABLE — every insight ends with what to do next
5. HONEST — truth as advice, never flattery`;

/* ── HELPERS ── */
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
  return `\n\nCRITICAL: Write ENTIRE response in Modern Standard Arabic (الفصحى). Keep proper nouns in original language. Never respond in English.`;
}

/* ── Generic OpenRouter caller ── */
async function orChat(model, prompt, systemInstruction, options) {
  return withRetry(async () => {
    const client = getOR();
    let sysMsg = systemInstruction || MASTER_IDENTITY;
    if (options?.language === 'ar') sysMsg += arabicDirective('ar');
    if (options?.json) sysMsg += '\n\nReturn ONLY valid JSON. No markdown, no backticks, no commentary.';
    const params = {
      model,
      messages: [{ role: 'system', content: sysMsg }, { role: 'user', content: prompt }],
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP ?? 0.95,
      max_tokens: options?.maxTokens || 4096,
      stream: false,
    };
    if (options?.json && !model.startsWith('anthropic/')) {
      params.response_format = { type: 'json_object' };
    }
    const c = await client.chat.completions.create(params);
    return c.choices?.[0]?.message?.content || '';
  }, { tries: 3, baseDelay: 700, label: model.split('/').pop() });
}

/* ══════════════════════════════════════════════════════════════════
   1. DEEPSEEK — AI Chat Advisor + Website Generator
   Model: deepseek/deepseek-chat-v3-0324
══════════════════════════════════════════════════════════════════ */
async function deepseekChat(prompt, systemInstruction, options) {
  return orChat('deepseek/deepseek-chat-v3-0324', prompt, systemInstruction, options);
}

async function deepseekStream(messages, systemInstruction, onChunk) {
  const client = getOR();
  const stream = await client.chat.completions.create({
    model: 'deepseek/deepseek-chat-v3-0324',
    messages: [{ role: 'system', content: systemInstruction || MASTER_IDENTITY }, ...messages],
    temperature: 0.7, top_p: 0.95, max_tokens: 2048, stream: true,
  });
  let full = '';
  for await (const chunk of stream) {
    const text = chunk.choices?.[0]?.delta?.content || '';
    if (text) { full += text; if (onChunk) onChunk(text); }
  }
  return full;
}

/* ══════════════════════════════════════════════════════════════════
   2. CLAUDE 3 HAIKU — BusinessDNA + Launch Package
   Model: anthropic/claude-3-haiku
══════════════════════════════════════════════════════════════════ */
async function openrouterChat(prompt, systemInstruction, options) {
  return orChat(
    options?.model || 'anthropic/claude-3-haiku',
    prompt, systemInstruction,
    { ...options, maxTokens: options?.maxTokens || 6000 }
  );
}

/* ══════════════════════════════════════════════════════════════════
   3. GPT-4o-mini — AI Tools (SEO, brand kit, competitor, etc.)
   Model: openai/gpt-4o-mini via OpenRouter
══════════════════════════════════════════════════════════════════ */
async function openaiChat(prompt, systemInstruction, options) {
  return orChat(
    options?.model || 'openai/gpt-4o-mini',
    prompt, systemInstruction, options
  );
}

/* ══════════════════════════════════════════════════════════════════
   4. GEMINI FLASH — Academy (Founder Path + Daily Insight)
   Model: gemini-2.5-flash (Google direct)
══════════════════════════════════════════════════════════════════ */
async function geminiChat(prompt, systemInstruction, options) {
  return withRetry(async () => {
    let sys = systemInstruction || MASTER_IDENTITY;
    let p = prompt;
    if (options?.language === 'ar') { sys += arabicDirective('ar'); p = `[ARABIC]\n\n${prompt}`; }
    const model = genAI.getGenerativeModel({
      model: options?.model || 'gemini-2.5-flash',
      systemInstruction: sys,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        topP: options?.topP ?? 0.95,
        ...(options?.json ? { responseMimeType: 'application/json' } : {}),
      },
    });
    const result = await model.generateContent(p);
    return result.response.text();
  }, { tries: 3, baseDelay: 700, label: 'gemini' });
}

/* ══════════════════════════════════════════════════════════════════
   5. IMAGE GENERATION — Grok via OpenRouter images endpoint
   Model: x-ai/grok-2-image
══════════════════════════════════════════════════════════════════ */
async function generateImage(prompt, options = {}) {
  return withRetry(async () => {
    const client = getOR();
    const n = Math.min(options.n || 1, 4);
    const response = await client.images.generate({
      model: 'x-ai/grok-2-image',
      prompt,
      n,
    });
    const urls = (response.data || [])
      .map(img => img.url || (img.b64_json ? `data:image/png;base64,${img.b64_json}` : null))
      .filter(Boolean);
    if (!urls.length) throw new Error('No images returned');
    return urls;
  }, { tries: 2, baseDelay: 1500, label: 'imageGen' });
}

/* ══════════════════════════════════════════════════════════════════
   DAILY ACADEMY NEWS — Gemini Flash (Google direct)
══════════════════════════════════════════════════════════════════ */
async function generateAcademyDaily() {
  return withRetry(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const todayHuman = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const prompt = `Today is ${todayHuman}. Generate 3 MENA-only business intelligence cards.
CARD 1: MENA Markets (Tadawul/ADX/DFM/EGX/oil/SAMA). NO US/EU.
CARD 2: MENA Founder success story.
CARD 3: MENA Opportunity this week.
All MENA. Real URLs from arabnews.com/gulfnews.com/zawya.com/forbesmiddleeast.com/menabytes.com/wamda.com. Correct flag emoji.
Return ONLY JSON:
{"cards":[{"id":"card1","type":"market","icon":"📈","country":"","countryFlag":"","category":"MENA Markets","title":"","summary":"","opportunity":"","source":"","sourceUrl":""},{"id":"card2","type":"success","icon":"🏆","country":"","countryFlag":"","category":"MENA Founder Story","title":"","summary":"","opportunity":"","source":"","sourceUrl":""},{"id":"card3","type":"opportunity","icon":"🚀","country":"","countryFlag":"","category":"MENA Opportunity","title":"","summary":"","opportunity":"","source":"","sourceUrl":""}],"generatedAt":"${today}"}`;
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: 'MENA-only intelligence curator. Return ONLY valid JSON.',
      generationConfig: { temperature: 0.8, topP: 0.95, responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'').trim();
    return JSON.parse(text);
  }, { tries: 3, baseDelay: 800, label: 'academyDaily' });
}

module.exports = {
  geminiChat,       // Academy (Founder Path + Daily Insight)
  openrouterChat,   // BusinessDNA + Launch Package (Claude 3 Haiku)
  openaiChat,       // AI Tools (GPT via OpenRouter)
  deepseekChat,     // AI Chat Advisor + Website Generator
  deepseekStream,   // Chat streaming
  generateImage,    // Grok image gen
  generateAcademyDaily,
  MASTER_IDENTITY,
};
