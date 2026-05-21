const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MASTER_IDENTITY = `You are the AI core of Double Eight AI — the first business intelligence platform built for Arab and MENA entrepreneurs.

Your users are:
- First-generation entrepreneurs with no formal business background
- Building something to provide for family and prove their potential  
- Limited budgets, unlimited ambition
- Need advice for their specific country, culture, and market — not generic Western templates

Your principles:
1. SPECIFICITY: Generic feels like Google. Specific feels like a mentor who knows them personally.
2. RESPECT: They are smart. They lack access, not intelligence.
3. CULTURAL AWARENESS: Understand family business dynamics, reputation (sum'a) in Arab markets, halal income, community trust.
4. ALWAYS ACTIONABLE: Every insight ends with what to do next.
5. HONEST BUT WARM: Truth framed as advice from a trusted mentor — never a critic.

When you know their country, always use their specific market, currency, regulations, local opportunities.`;

/* ──────────────────────────────────────────────────────────────────
   RETRY HELPER
   Gemini occasionally:
   - Times out on cold start
   - Returns 503 "model overloaded"
   - Returns malformed JSON
   Without retry, the FIRST attempt fails ~10-20% of the time and
   users have to click "retry" manually. Auto-retry makes it invisible.
──────────────────────────────────────────────────────────────────── */
function isTransientError(err) {
  const msg = (err?.message || '').toLowerCase();
  // 503 overload, timeouts, network errors, JSON parse errors — all retryable
  return /503|overload|unavailable|timeout|timed out|fetch failed|network|econn|deadline|json|unexpected token/i.test(msg);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function withRetry(fn, { tries = 3, baseDelay = 700, label = 'gemini' } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Don't retry rate-limit (429 quota) errors — that's a real wall, not transient
      if (/429|quota|rate.?limit|exhausted/i.test(err?.message || '')) {
        throw err;
      }
      if (i < tries - 1 && isTransientError(err)) {
        const wait = baseDelay * Math.pow(2, i);   // 700ms, 1400ms, 2800ms…
        console.warn(`[${label}] attempt ${i + 1} failed (${err.message?.slice(0, 80)}). Retrying in ${wait}ms`);
        await delay(wait);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/* ──────────────────────────────────────────────────────────────────
   GEMINI CHAT — with built-in retry
──────────────────────────────────────────────────────────────────── */
async function geminiChat(prompt, systemInstruction, options) {
  return withRetry(async () => {
    // Auto-inject Arabic directive if caller passes language='ar' in options
    let effectiveSystem = systemInstruction || MASTER_IDENTITY;
    let effectivePrompt = prompt;
    if (options && options.language === 'ar') {
      effectiveSystem += `\n\nCRITICAL LANGUAGE REQUIREMENT: The user reading this is in Arabic mode. Write your ENTIRE response in Modern Standard Arabic (الفصحى). Include all section headers, bullets, and analysis in Arabic. Keep proper nouns (brand names, country names in some cases, URLs) in their original language. Use Arabic numerals only when natural; Western numerals are fine for currency and dates. Do NOT respond in English under any circumstances.`;
      effectivePrompt = `[OUTPUT LANGUAGE: ARABIC — write the entire response in Arabic]\n\n${prompt}`;
    }

    const model = genAI.getGenerativeModel({
      model: (options && options.model) || 'gemini-2.5-flash',
      systemInstruction: effectiveSystem,
      generationConfig: {
        temperature: (options && options.temperature !== undefined) ? options.temperature : 0.7,
        topP: (options && options.topP !== undefined) ? options.topP : 0.95,
        ...(options && options.json ? { responseMimeType: 'application/json' } : {}),
      },
    });
    const result = await model.generateContent(effectivePrompt);
    return result.response.text();
  }, { tries: 3, baseDelay: 700, label: 'geminiChat' });
}

/* ──────────────────────────────────────────────────────────────────
   DAILY ACADEMY NEWS — MENA-only edition
   Three cards every day, all focused on the MENA region:
     Card 1 — MENA MARKETS (Tadawul, ADX, DFM, EGX, oil, regional currencies)
     Card 2 — MENA SUCCESS STORY (an Arab founder, recent achievement)
     Card 3 — MENA OPPORTUNITY (active trend or program a MENA entrepreneur can act on this week)
──────────────────────────────────────────────────────────────────── */
async function generateAcademyDaily() {
  return withRetry(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const todayHuman = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `Today is ${todayHuman}.

You are the daily intelligence curator for Double Eight AI — a platform used EXCLUSIVELY by Arab entrepreneurs across the MENA region.

GENERATE EXACTLY 3 BUSINESS INTELLIGENCE CARDS, ALL FOCUSED ON MENA.

The 3 cards must follow this structure:

═══ CARD 1 — MENA MARKETS / ECONOMY ═══
Subject: A real movement happening this week in MENA markets, currencies, commodities, or regional economies.
Examples of valid topics:
  • Saudi Tadawul (TASI), UAE ADX or DFM, Egyptian EGX, Qatar QE, Kuwait Boursa moves
  • Oil/gas prices and what they mean for Gulf budgets
  • Egyptian pound, Lebanese lira, Turkish lira movements affecting MENA trade
  • SAMA, CBUAE, CBE interest rate decisions
  • Vision 2030 / Vision 2031 spending announcements
  • Gulf real estate, hospitality, retail trends
INVALID: US Federal Reserve, S&P 500, Bitcoin alone, European markets. STAY MENA.
Country: pick the specific MENA country most affected (Saudi Arabia, UAE, Egypt, Qatar, Kuwait, Bahrain, Oman, Jordan, Morocco, Lebanon).

═══ CARD 2 — MENA FOUNDER SUCCESS STORY ═══
Subject: A real Arab founder or MENA-based founder who has had a measurable success recently — a funding round, a product launch, an acquisition, an expansion, or a milestone.
Pick from MENA only — Saudi, UAE, Egyptian, Jordanian, Lebanese, Moroccan, Qatari, Kuwaiti, Bahraini, Omani founders.
Examples of valid founders/companies: Talabat, Careem, Anghami, Tabby, Tamara, Swvl, Property Finder, Kitopi, Trella, MaxAB, Halan, Vezeeta, EduSpark, Yamsafer, Mrsool, Nana, Jahez, Sary, Foodics, Eyewa, Aramex spin-offs, etc.
The lesson should be transferable — what can a MENA entrepreneur reading this STEAL from their story?

═══ CARD 3 — MENA OPPORTUNITY THIS WEEK ═══
Subject: A trend, government program, grant, accelerator deadline, regulatory change, or market gap that a MENA entrepreneur can ACT on within the next 7 days.
Examples of valid opportunities:
  • Saudi Monsha'at, Misk, NTDP programs and current calls
  • UAE Hub71 cohort applications, Dubai Future Accelerators, Dubai SME programs
  • Egypt's startup grants, Misr Digital Innovation, Flat6Labs cohorts
  • Qatar Development Bank programs, QFC opportunities
  • Trending consumer behaviors in MENA (Ramadan/Eid commerce timing, summer GCC travel patterns)
  • Saudization (Nitaqat), Emiratisation hiring incentives entrepreneurs can leverage
  • E-commerce regulation changes in MENA countries
Pick a DIFFERENT MENA country from Cards 1 and 2 if possible.

═══ CRITICAL OUTPUT RULES ═══

1. ALL 3 cards MUST be MENA. Zero exceptions. No US, no Europe, no Asia.
2. Each card needs a real, working source URL from MENA-credible publishers:
   - https://www.arabnews.com  (Saudi)
   - https://gulfnews.com  (UAE)
   - https://www.thenationalnews.com  (UAE)
   - https://www.zawya.com  (Pan-MENA business)
   - https://www.forbesmiddleeast.com
   - https://www.menabytes.com  (MENA startup news)
   - https://www.wamda.com  (MENA startup ecosystem)
   - https://www.al-monitor.com
   - https://www.gulfbusiness.com
   - https://english.aawsat.com  (Asharq Al-Awsat)
   - https://www.argaam.com  (Saudi business)
   - https://www.tradingeconomics.com
3. countryFlag must match the country emoji exactly (🇸🇦 🇦🇪 🇪🇬 🇶🇦 🇰🇼 🇧🇭 🇴🇲 🇯🇴 🇲🇦 🇱🇧).
4. "opportunity" must be ONE concrete action a reader can take this week — not "stay informed" or "watch the market". Real verbs, real actions.

Return ONLY this exact JSON shape (no markdown, no commentary):

{
  "cards": [
    {
      "id": "card1",
      "type": "market",
      "icon": "📈",
      "country": "<MENA country>",
      "countryFlag": "<flag emoji>",
      "category": "MENA Markets",
      "title": "<under 12 words, specific>",
      "summary": "<2 sentences: what happened + why a MENA entrepreneur should care>",
      "opportunity": "<one concrete action this week>",
      "source": "<publisher name>",
      "sourceUrl": "<real MENA-credible URL>"
    },
    {
      "id": "card2",
      "type": "success",
      "icon": "🏆",
      "country": "<different MENA country>",
      "countryFlag": "<flag emoji>",
      "category": "MENA Founder Story",
      "title": "<under 12 words about the founder/company>",
      "summary": "<2 sentences telling the story + the transferable lesson>",
      "opportunity": "<the specific tactic, principle, or move the reader can steal this week>",
      "source": "<publisher name>",
      "sourceUrl": "<real MENA-credible URL>"
    },
    {
      "id": "card3",
      "type": "opportunity",
      "icon": "🚀",
      "country": "<another MENA country>",
      "countryFlag": "<flag emoji>",
      "category": "MENA Opportunity",
      "title": "<under 12 words on the opportunity>",
      "summary": "<2 sentences: the opportunity + who exactly it fits>",
      "opportunity": "<the specific action to take in the next 7 days>",
      "source": "<publisher name>",
      "sourceUrl": "<real MENA-credible URL>"
    }
  ],
  "generatedAt": "${today}"
}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: 'You are the daily intelligence curator for Double Eight AI. Every output is MENA-only. You never recommend or reference non-MENA markets, founders, or opportunities. You return ONLY valid JSON — no markdown, no backticks, no commentary.',
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        responseMimeType: 'application/json',
      },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(text);
  }, { tries: 3, baseDelay: 800, label: 'academyDaily' });
}

module.exports = { geminiChat, generateAcademyDaily, MASTER_IDENTITY };
