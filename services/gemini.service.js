const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

/* ══════════════════════════════════════════════════════════════════
   FIVE AI CLIENTS — each used for exactly what it does best

   1. Gemini Flash 2.5     → Academy Daily News + Academy Sessions
      Fast, good for curated news and educational content
      Env: GEMINI_API_KEY

   2. OpenRouter → Business DNA (Claude 3.5 Haiku)
      Deep psychological reading, structured JSON
      Env: OPENROUTER_API_KEY

   3. OpenAI GPT-4o-mini   → Launch Package + Website Generator
      + SEO/Keywords Tool + Founder Path Sessions
      Reliable JSON, structured documents
      Env: OPENAI_API_KEY

   4. DeepSeek (via OpenAI SDK) → AI Chat Advisor
      Strong reasoning, honest, direct — perfect for advisor role
      Env: DEEPSEEK_API_KEY

   5. xAI Grok             → Image Generation (Image section)
      Env: XAI_API_KEY
══════════════════════════════════════════════════════════════════ */

// ── GEMINI ──
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── OPENROUTER (Claude 3.5 Haiku for DNA) ──
let _openrouterClient = null;
function getOpenRouter() {
  if (_openrouterClient) return _openrouterClient;
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not set');
  _openrouterClient = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://doubleeight.online',
      'X-Title': 'Double Eight AI',
    },
  });
  return _openrouterClient;
}

// ── OPENAI (GPT-4o-mini → launch package, website, SEO tool, founder path) ──
let _openaiClient = null;
function getOpenAI() {
  if (_openaiClient) return _openaiClient;
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openaiClient;
}

// ── DEEPSEEK (AI Chat Advisor — honest, direct, no fluff) ──
let _deepseekClient = null;
function getDeepSeek() {
  if (_deepseekClient) return _deepseekClient;
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is not set');
  _deepseekClient = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1',
  });
  return _deepseekClient;
}

// ── xAI Grok (Image Generation) ──
let _xaiClient = null;
function getXAI() {
  if (_xaiClient) return _xaiClient;
  if (!process.env.XAI_API_KEY) throw new Error('XAI_API_KEY is not set');
  _xaiClient = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
  });
  return _xaiClient;
}

/* ── MASTER IDENTITY ── */
const MASTER_IDENTITY = `You are the AI core of Double Eight AI — the first business intelligence platform built for Arab and MENA entrepreneurs.

Your users are:
- First-generation entrepreneurs with no formal business background
- Building something to provide for family and prove their potential
- Limited budgets, unlimited ambition
- Need advice for their specific country, culture, and market — not generic Western templates

Your principles:
1. SPECIFICITY: Generic feels like Google. Specific feels like a mentor.
2. RESPECT: They are smart. They lack access, not intelligence.
3. CULTURAL AWARENESS: Family business dynamics, reputation (sum'a), halal income, community trust.
4. ALWAYS ACTIONABLE: Every insight ends with what to do next.
5. HONEST BUT WARM: Truth framed as advice from a trusted mentor — never a critic.`;

/* ──────────────────────────────────────────────────────────────────
   RETRY HELPER
──────────────────────────────────────────────────────────────────── */
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
        console.warn(`[${label}] attempt ${i + 1} failed (${(err.message || '').slice(0, 80)}). Retrying in ${wait}ms`);
        await delay(wait);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/* ── Arabic injection helper ── */
function arabicDirective(lang) {
  if (lang !== 'ar') return '';
  return `\n\nCRITICAL LANGUAGE REQUIREMENT: Write your ENTIRE response in Modern Standard Arabic (الفصحى). Keep proper nouns in their original language. Do NOT respond in English under any circumstances.`;
}

/* ══════════════════════════════════════════════════════════════════
   1. DEEPSEEK CHAT — AI Chat Advisor (Chat V3)
   Honest, direct, no flattery, no long explanations
   Used by: chat.controller (streamChat + chat)
══════════════════════════════════════════════════════════════════ */
async function deepseekChat(prompt, systemInstruction, options) {
  return withRetry(async () => {
    const client = getDeepSeek();
    let sysMsg = systemInstruction || MASTER_IDENTITY;
    if (options?.language === 'ar') sysMsg += arabicDirective('ar');

    const messages = [
      { role: 'system', content: sysMsg },
      { role: 'user', content: prompt },
    ];

    const params = {
      model: options?.model || 'deepseek-chat',
      messages,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP ?? 0.95,
      max_tokens: options?.maxTokens || 2048,
      stream: false,
    };

    if (options?.json) {
      params.response_format = { type: 'json_object' };
    }

    const completion = await client.chat.completions.create(params);
    return completion.choices?.[0]?.message?.content || '';
  }, { tries: 3, baseDelay: 700, label: 'deepseekChat' });
}

/* DeepSeek streaming — for the chat advisor SSE endpoint */
async function deepseekStream(messages, systemInstruction, onChunk) {
  const client = getDeepSeek();
  const params = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemInstruction || MASTER_IDENTITY },
      ...messages,
    ],
    temperature: 0.7,
    top_p: 0.95,
    max_tokens: 2048,
    stream: true,
  };

  const stream = await client.chat.completions.create(params);
  let full = '';
  for await (const chunk of stream) {
    const text = chunk.choices?.[0]?.delta?.content || '';
    if (text) { full += text; if (onChunk) onChunk(text); }
  }
  return full;
}

/* ══════════════════════════════════════════════════════════════════
   2. OPENROUTER CHAT (Claude 3.5 Haiku) — Business DNA only
══════════════════════════════════════════════════════════════════ */
async function openrouterChat(prompt, systemInstruction, options) {
  return withRetry(async () => {
    const client = getOpenRouter();
    let sysMsg = systemInstruction || MASTER_IDENTITY;
    if (options?.language === 'ar') sysMsg += arabicDirective('ar');
    if (options?.json) sysMsg += '\n\nReturn ONLY valid JSON. No markdown, no backticks, no commentary.';

    const messages = [
      { role: 'system', content: sysMsg },
      { role: 'user', content: prompt },
    ];

    const params = {
      model: options?.model || 'anthropic/claude-3-5-haiku',
      messages,
      temperature: options?.temperature ?? 0.9,
      top_p: options?.topP ?? 0.95,
      max_tokens: options?.maxTokens || 6000,
    };

    const completion = await client.chat.completions.create(params);
    return completion.choices?.[0]?.message?.content || '';
  }, { tries: 3, baseDelay: 700, label: 'openrouterChat' });
}

/* ══════════════════════════════════════════════════════════════════
   3. OPENAI CHAT (GPT-4o-mini) — Launch Package + Tools + SEO + Website
══════════════════════════════════════════════════════════════════ */
async function openaiChat(prompt, systemInstruction, options) {
  return withRetry(async () => {
    const client = getOpenAI();
    let sysMsg = systemInstruction || MASTER_IDENTITY;
    if (options?.language === 'ar') sysMsg += arabicDirective('ar');

    const messages = [
      { role: 'system', content: sysMsg },
      { role: 'user', content: prompt },
    ];

    const params = {
      model: options?.model || 'gpt-4o-mini',
      messages,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP ?? 0.95,
      max_tokens: options?.maxTokens || 4096,
    };

    if (options?.json) {
      params.response_format = { type: 'json_object' };
    }

    const completion = await client.chat.completions.create(params);
    return completion.choices?.[0]?.message?.content || '';
  }, { tries: 3, baseDelay: 700, label: 'openaiChat' });
}

/* ══════════════════════════════════════════════════════════════════
   4. GEMINI CHAT — Academy Daily News + Academy Sessions
══════════════════════════════════════════════════════════════════ */
async function geminiChat(prompt, systemInstruction, options) {
  return withRetry(async () => {
    let sys = systemInstruction || MASTER_IDENTITY;
    let p = prompt;
    if (options?.language === 'ar') {
      sys += arabicDirective('ar');
      p = `[OUTPUT LANGUAGE: ARABIC]\n\n${prompt}`;
    }
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
  }, { tries: 3, baseDelay: 700, label: 'geminiChat' });
}

/* ══════════════════════════════════════════════════════════════════
   5. IMAGE GENERATION — xAI Grok Aurora
   Used by: tools.controller image_generation handler
══════════════════════════════════════════════════════════════════ */
async function generateImage(prompt, options = {}) {
  return withRetry(async () => {
    const client = getXAI();
    const response = await client.images.generate({
      model: 'grok-2-image',
      prompt: prompt,
      n: options.n || 1,
      // xAI Aurora supports standard sizes
      size: options.size || '1024x1024',
    });
    // Return array of image URLs
    return response.data.map(img => img.url || img.b64_json);
  }, { tries: 2, baseDelay: 1000, label: 'imageGen' });
}

/* ══════════════════════════════════════════════════════════════════
   DAILY ACADEMY NEWS — uses Gemini Flash (free + fast)
══════════════════════════════════════════════════════════════════ */
async function generateAcademyDaily() {
  return withRetry(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const todayHuman = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `Today is ${todayHuman}.

You are the daily intelligence curator for Double Eight AI — a platform used EXCLUSIVELY by Arab entrepreneurs across the MENA region.

GENERATE EXACTLY 3 BUSINESS INTELLIGENCE CARDS, ALL FOCUSED ON MENA.

═══ CARD 1 — MENA MARKETS / ECONOMY ═══
A real movement this week in MENA markets, currencies, commodities, or regional economies.
Valid: Saudi Tadawul, UAE ADX/DFM, Egyptian EGX, Qatar QE, Kuwait Boursa, oil/gas, SAMA/CBUAE/CBE decisions, Vision 2030.
INVALID: US markets, S&P 500, Bitcoin alone, European markets. STAY MENA.

═══ CARD 2 — MENA FOUNDER SUCCESS STORY ═══
A real Arab/MENA-based founder with a measurable recent success.
MENA only — Saudi, UAE, Egyptian, Jordanian, Lebanese, Moroccan, Qatari, Kuwaiti, Bahraini, Omani founders.

═══ CARD 3 — MENA OPPORTUNITY THIS WEEK ═══
A trend, program, grant, accelerator, or market gap a MENA entrepreneur can ACT on within 7 days.

═══ RULES ═══
1. ALL 3 cards MUST be MENA. Zero exceptions.
2. Real source URLs from: arabnews.com, gulfnews.com, thenationalnews.com, zawya.com, forbesmiddleeast.com, menabytes.com, wamda.com, gulfbusiness.com, argaam.com
3. countryFlag must match (🇸🇦 🇦🇪 🇪🇬 🇶🇦 🇰🇼 🇧🇭 🇴🇲 🇯🇴 🇲🇦 🇱🇧)
4. "opportunity" must be ONE concrete action this week

Return ONLY this JSON:
{
  "cards": [
    {"id":"card1","type":"market","icon":"📈","country":"<MENA>","countryFlag":"<emoji>","category":"MENA Markets","title":"<12 words>","summary":"<2 sentences>","opportunity":"<action>","source":"<name>","sourceUrl":"<url>"},
    {"id":"card2","type":"success","icon":"🏆","country":"<MENA>","countryFlag":"<emoji>","category":"MENA Founder Story","title":"<12 words>","summary":"<2 sentences>","opportunity":"<tactic to steal>","source":"<name>","sourceUrl":"<url>"},
    {"id":"card3","type":"opportunity","icon":"🚀","country":"<MENA>","countryFlag":"<emoji>","category":"MENA Opportunity","title":"<12 words>","summary":"<2 sentences>","opportunity":"<action in 7 days>","source":"<name>","sourceUrl":"<url>"}
  ],
  "generatedAt": "${today}"
}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: 'You are the daily intelligence curator for Double Eight AI. Every output is MENA-only. Return ONLY valid JSON.',
      generationConfig: { temperature: 0.8, topP: 0.95, responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(text);
  }, { tries: 3, baseDelay: 800, label: 'academyDaily' });
}

module.exports = {
  geminiChat,
  openrouterChat,
  openaiChat,
  deepseekChat,
  deepseekStream,
  generateImage,
  generateAcademyDaily,
  MASTER_IDENTITY,
};
