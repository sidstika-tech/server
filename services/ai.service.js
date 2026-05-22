const {
  geminiChat,
  geminiVision,
  openrouterChat,
  openaiChat,
  deepseekChat,
  deepseekStream,
  generateImage,
  MASTER_IDENTITY,
} = require('./gemini.service');
const fs = require('fs');
const path = require('path');

/* ══════════════════════════════════════════════════════════════════
   AI SERVICE — PROVIDER MAP
   ─────────────────────────────────────────────────────────────────
   AI Chat Advisor              → DeepSeek Chat V3     (honest, direct)
   Business DNA                 → Claude 3.5 Haiku     (deep psychology)
   Launch Package generators    → GPT-4o-mini          (structured docs)
   Website Generator            → GPT-4o-mini          (reliable HTML)
   Academy Founder Path/Journey → GPT-4o-mini          (educational)
   Academy Daily Insight/Trend  → Gemini Flash 2.5     (fast + free)
   SEO & Keywords Tool          → GPT-4o-mini          (structured)
   All other AI Tools           → GPT-4o-mini          (structured JSON)
   Image Generation             → xAI Grok Aurora      (text→image)
══════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════
   AI CHAT ADVISOR — DeepSeek Chat V3
   Honest. Direct. No flattery. No over-explanation.
   If an idea is bad → say it directly and give a better path.
   Supports image uploads (base64 passed in messages).
══════════════════════════════════════════════════════════════════ */
const ADVISOR_SYSTEM = `You are a high-level Venture Architect, Talent Hunter, and Market Psychologist for the MENA region.

WHO YOU SERVE:
First-generation MENA entrepreneurs. Limited resources, real ambition. They need a trusted older brother who tells the truth — not a motivational speaker.

YOUR RULES:
1. NEVER flatter. If an idea is weak, say so immediately and offer a better direction.
2. NEVER give long explanations. Answer in clear, short points. Cut everything unnecessary.
3. NEVER hallucinate facts. Say "I don't know" when you don't.
4. ALWAYS be specific to MENA — Gulf, North Africa, Levant. Real platforms, real costs, real culture.
5. If a user asks about something that will NOT succeed — tell them directly. Then give 1-2 better alternatives.
6. Think like a founder who survived difficult markets, not a consultant.

HOW YOU RESPOND:
- Short paragraphs, 2-3 sentences max
- Bold the most important action or warning
- Number steps when giving a process
- If you detect a bad idea: "This won't work because [specific reason]. A better direction: [specific alternative]."
- End responses with one line: **Your next move: [specific action today]**

WHAT YOU KNOW:
- Gulf markets (Saudi, UAE, Qatar, Kuwait): purchasing power, status-driven buying, B2B culture
- North Africa (Egypt, Morocco): price sensitivity, informal economy, diaspora opportunity
- Levant (Jordan, Lebanon): talent surplus, service exports, economic volatility
- Arab consumer psychology: reputation, family approval, fear of shame, halal considerations
- Platform reality: WhatsApp converts, Instagram discovers, TikTok reaches youth, LinkedIn for B2B only
- Government programs: Vision 2030, UAE initiatives, Egypt's digital economy push

WHAT YOU NEVER DO:
- Give Silicon Valley advice that doesn't work in MENA
- Recommend ideas disconnected from local purchasing power
- Encourage without honest assessment
- Write more than needed
- Use corporate or academic language

IMAGES: If the user shares a screenshot or image, analyze it directly and give actionable feedback.`;

async function chat(messages, systemPrompt, language) {
  let sysMsg = systemPrompt || ADVISOR_SYSTEM;
  if (language === 'ar') {
    sysMsg += `\n\nCRITICAL: Respond ENTIRELY in Modern Standard Arabic (الفصحى). Keep brand names and URLs in original language. Never respond in English.`;
  }
  // Build conversation string for non-streaming fallback
  const conversation = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
  return deepseekChat(`Previous conversation:\n${conversation}\n\nRespond as the assistant.`, sysMsg, { temperature: 0.7 });
}

async function streamChat(messages, type, onChunk, language) {
  let sysMsg = ADVISOR_SYSTEM;
  if (language === 'ar') {
    sysMsg += `\n\nCRITICAL: Respond ENTIRELY in Modern Standard Arabic (الفصحى). Keep brand names and URLs in original language. Never respond in English.`;
  }

  // Check if the last message has an image attached
  const lastMsg = messages[messages.length - 1];
  if (lastMsg && lastMsg.imageData) {
    // DeepSeek V3 is TEXT-ONLY. Route image analysis to Gemini Vision.
    try {
      const visionResponse = await geminiVision(
        lastMsg.content || 'Analyze this image and give actionable business feedback.',
        lastMsg.imageData,
        sysMsg
      );
      // FIX #3: Stream immediately in larger chunks — removed artificial 15ms delay
      // that was causing 40+ second response times for image uploads.
      const chunkSize = 100;
      for (let i = 0; i < visionResponse.length; i += chunkSize) {
        if (onChunk) onChunk(visionResponse.slice(i, i + chunkSize));
      }
      return visionResponse;
    } catch (err) {
      console.error('Gemini Vision failed:', err.message);
      const fallback = language === 'ar'
        ? 'تلقّيت صورتك ولكن لم أتمكن من تحليلها الآن. يرجى وصف ما تراه وسأساعدك.'
        : 'I received your image but could not analyze it right now. Please describe what you see and I will help.';
      if (onChunk) onChunk(fallback);
      return fallback;
    }
  }

  // No image — use DeepSeek for text chat
  const deepseekMessages = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  return deepseekStream(deepseekMessages, sysMsg, onChunk);
}

/* ══════════════════════════════════════════════════════════════════
   PSYCHOLOGICAL PROFILE BLOCK
   Injected at the top of every generator prompt when the user's
   DNA psychology is available (from Launch Package).
══════════════════════════════════════════════════════════════════ */
function psychProfileBlock(inputs) {
  if (!inputs || (!inputs.psychWhoYouAre && !inputs.psychWorkStyle && !inputs.psychStrength)) return '';
  return `
═══ THE FOUNDER YOU ARE WRITING FOR ═══
${inputs.psychWhoYouAre ? `Psychological profile: ${inputs.psychWhoYouAre}` : ''}
${inputs.psychStrength ? `Hidden strength: ${inputs.psychStrength}` : ''}
${inputs.psychWorkStyle ? `Work style archetype: ${inputs.psychWorkStyle}` : ''}
${inputs.psychEnergy ? `Energy type: ${inputs.psychEnergy}` : ''}
${inputs.psychMotivation ? `Core motivation: ${inputs.psychMotivation}` : ''}
${inputs.psychRiskDNA ? `Risk DNA: ${inputs.psychRiskDNA}` : ''}
${inputs.psychAvoid ? `NEVER recommend work in: ${inputs.psychAvoid}` : ''}
${inputs.pathName ? `Their chosen path: ${inputs.pathName}` : ''}
${inputs.pathUnfair ? `Unfair advantage: ${inputs.pathUnfair}` : ''}
${inputs.pathRealCost ? `Honest cost: ${inputs.pathRealCost}` : ''}

RULES FOR THIS DOCUMENT:
- Match the energy type: introverts get depth-first tactics; extroverts get people-first tactics
- Match the work style: Detectives get research; Builders get systems; Connectors get relationships; Performers get visibility; Makers get craft
- NEVER suggest tactics in their "avoid at all cost" zone
- Reference their unfair advantage where it naturally fits
- Write for THIS specific human, not a generic founder
═══════════════════════════════════════════════════════════════
`;
}

/* ══════════════════════════════════════════════════════════════════
   CURRENCY HELPER
══════════════════════════════════════════════════════════════════ */
function getCurrency(country) {
  const map = {
    'Saudi Arabia': 'SAR', 'UAE': 'AED', 'Egypt': 'EGP', 'Qatar': 'QAR',
    'Kuwait': 'KWD', 'Bahrain': 'BHD', 'Oman': 'OMR', 'Jordan': 'JOD',
    'Morocco': 'MAD', 'Lebanon': 'LBP',
  };
  return map[country] || 'USD';
}

/* ══════════════════════════════════════════════════════════════════
   GPT-4o-mini TOOL GENERATORS — Launch Package + AI Tools
   All use openaiChat for reliability and structured output
══════════════════════════════════════════════════════════════════ */

async function generateBrandKit(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Create a complete Brand Identity Kit for a MENA business.

Business: ${inputs.businessName}
Industry: ${inputs.industry}
Values: ${inputs.values || 'Trust, Quality'}
Target: ${inputs.targetAudience || 'MENA market'}
Style: ${inputs.style || 'Modern'}

Deliver:
## Brand Story (2 sentences — human, authentic, culturally aware)
## Color Palette (5 colors with HEX, names, cultural reasoning. Note colors to AVOID in Arab markets)
## Typography (Heading + Body Google Fonts with Arabic fallbacks)
## Logo Direction (3 concepts described visually — shape, symbolism, what it communicates)
## Brand Voice (5 dos + 5 don'ts for copywriting. Include Arabic tone guidance)
## Visual Style (Photography style, iconography, patterns. Reference MENA aesthetics)
## Social Media Kit (Profile formats, highlight icons, story templates described)
## Brand Application (Business card layout, email signature, social header described)

Every recommendation must be immediately usable without a designer.`, MASTER_IDENTITY, { language: inputs.language });
}

async function generateBusinessPlan(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Write a complete Business Plan for a MENA entrepreneur.

Business: ${inputs.businessName}
Industry: ${inputs.industry}
Model: ${inputs.businessModel || 'To be determined'}
Target Market: ${inputs.targetMarket || inputs.location || 'MENA'}
Location: ${inputs.location || 'MENA'}
Investment: ${inputs.investment || 'Bootstrap'}
Goals: ${inputs.goals || 'First paying customers'}

Structure:
## Executive Summary (Start with who this founder IS psychologically — their work style drives the execution model)
## Problem & Solution (Real pain point in ${inputs.location || 'MENA'} with evidence)
## Market Analysis (Size in local currency, segments, purchasing power realities)
## Business Model (Revenue streams mapped to the founder's psychology — how THEY naturally sell)
## Competitive Landscape (3-5 real competitors, the gap this founder uniquely fills)
## Marketing & Sales Strategy (Channels that match this founder's energy type and work style)
## Operations Plan (Lean ops for ${inputs.investment || 'bootstrap'} budget)
## Financial Projections (Month 1-12 in ${getCurrency(inputs.location)}, honest assumptions)
## Risk Analysis (Top 3 risks specific to this business in this market)
## 90-Day Execution Plan (Week by week, paced for this founder's psychology)

Be specific to ${inputs.location}. Use local currency. Reference real platforms, real costs, real market dynamics.`, MASTER_IDENTITY, { language: inputs.language });
}

async function generateCompetitorMatrix(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Build a Competitor Analysis for a MENA business.

Business: ${inputs.businessName}
Industry: ${inputs.industry}
Region: ${inputs.region || 'MENA'}
Unique Angle: ${inputs.uniqueAngle || 'To be identified'}

Deliver:
## Market Landscape (Who owns this space in ${inputs.region}? Map the 5 biggest players)
## Competitor Deep-Dive (For each: strengths, weaknesses, pricing, customer sentiment, where they're vulnerable)
## Positioning Matrix (2x2 grid: price vs quality. Where each sits. Where the GAP is)
## The Moat They Can't Copy (Connect to this founder's unique psychology + unfair advantage)
## Counter-Strategy (For each competitor: the specific move that neutralizes their strength)
## Opportunity Windows (3 specific gaps competitors are ignoring in ${inputs.region} right now)
## Pricing Intelligence (What competitors charge, what customers actually pay, where to position)

Use real competitors. Name them. Be honest about who's strong and who's weak.`, MASTER_IDENTITY, { language: inputs.language });
}

async function generatePricingCalculator(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Design a Pricing Strategy for a MENA business.

Business: ${inputs.businessName}
Product: ${inputs.product}
Industry: ${inputs.industry}
Monthly Costs: ${inputs.monthlyCosts || 'Unknown'}
Target Margin: ${inputs.targetMargin || '40-60%'}
Competitor Pricing: ${inputs.competitorPricing || 'Unknown'}

Deliver:
## Pricing Psychology (How customers in this MENA market perceive price — status, value, or fear-driven?)
## Cost Analysis (Fixed + variable costs breakdown in local currency)
## 3 Pricing Models (Premium / Mid / Entry — with exact numbers, who each attracts, and margin impact)
## Recommended Price Point (The one that fits THIS founder's positioning and psychology)
## Price Anchoring Strategy (How to present the price so it feels like a deal)
## Discount & Bundle Strategy (When to discount, when to refuse, cultural norms around haggling)
## Revenue Projections (Monthly at each price point × realistic customer count)
## Price Increase Roadmap (When and how to raise prices without losing customers)

Use local currency. Be specific to the market.`, MASTER_IDENTITY, { language: inputs.language });
}

async function generateLaunchRoadmap(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Create a 30-Day Launch Roadmap for a MENA entrepreneur.

Business: ${inputs.businessName}
Industry: ${inputs.industry}
Budget: ${inputs.budget || 'Bootstrap'}
Team: ${inputs.teamSize || 'Solo'}
Status: ${inputs.currentStatus || 'Pre-launch'}
Goal: ${inputs.goal || 'First paying customer'}

Deliver DAY BY DAY (not week by week):
## Pre-Launch Setup (Days 1-5): Legal, tools, accounts specific to their country
## Market Validation (Days 6-12): Testing demand without building anything yet
## Build & Prepare (Days 13-20): Creating the minimum offer
## Soft Launch (Days 21-25): First customers, feedback loops
## Official Launch (Days 26-30): Public announcement, first revenue push

Each day: ONE specific action, the platform/tool to use, the cost in local currency, what "done" looks like.
End with: Month 2 priorities.`, MASTER_IDENTITY, { language: inputs.language });
}

async function generateContract(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Draft a professional Business Contract for a MENA business.

Business: ${inputs.businessName}
Contract Type: ${inputs.contractType || 'Service Agreement'}
Parties: ${inputs.parties || 'Service Provider and Client'}
Country/Law: ${inputs.jurisdiction || 'UAE'}

Deliver a complete, usable contract including all standard clauses.
Note: This is a template. Recommend they have a local lawyer review before use. Reference specific local business law where relevant.`, MASTER_IDENTITY, { language: inputs.language });
}

async function generateBudgetEstimator(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Build a 6-Month Financial Model for a MENA business.

Business: ${inputs.businessType}
Industry: ${inputs.industry}
Location: ${inputs.location || 'MENA'}
Team: ${inputs.teamSize || 'Solo + 1'}
Revenue Model: ${inputs.revenueModel || 'Service-based'}
Target: ${inputs.targetRevenue || 'Break-even by Month 6'}

Deliver in local currency (${getCurrency(inputs.location)}):
## Startup Costs (One-time: licenses, equipment, setup)
## Monthly Fixed Costs (Rent, salaries, subscriptions — real numbers for this market)
## Variable Costs (Per unit/client costs)
## Revenue Assumptions (Conservative / Moderate / Optimistic)
## Month-by-Month P&L Table (Months 1-6)
## Cash Flow Analysis
## Break-Even Point
## Runway Calculator
## Key Metrics to Track (The 3 numbers that determine survival)

Be brutally honest. Use real costs for ${inputs.location}. Don't inflate revenue assumptions.`, MASTER_IDENTITY, { language: inputs.language });
}

async function generatePitchDeck(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Write a complete Pitch Deck script for a MENA entrepreneur.

Business: ${inputs.businessName}
Industry: ${inputs.industry}
Stage: ${inputs.stage || 'Pre-seed'}
Ask: ${inputs.fundingAsk || 'To be determined'}
Market: ${inputs.market || 'MENA'}
Traction: ${inputs.traction || 'Pre-revenue'}

Deliver 12 slides with exact text for each slide.
Tailored for MENA investors who care about: execution speed, market size, founder quality, and capital efficiency.`, MASTER_IDENTITY, { language: inputs.language });
}

async function generateAdCopy(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Write high-converting Ad Copy for a MENA business.

Business: ${inputs.businessName}
Product: ${inputs.product}
Target: ${inputs.targetAudience}
Platform: ${inputs.platform || 'Instagram + Facebook'}
Goal: ${inputs.goal || 'Leads'}
Tone: ${inputs.tone || 'Professional but warm'}

Deliver for EACH platform:
## Instagram (3 ad variations with Arabic versions)
## Facebook (3 ad variations)
## Google Ads (5 responsive search ad combinations)
## WhatsApp Status (3 short promo texts — how MENA sells)

MENA ad behavior: WhatsApp is the conversion channel. Instagram is discovery. Google is intent capture.`, MASTER_IDENTITY, { language: inputs.language });
}

/* SEO — GPT-4o-mini per spec */
async function generateSeoKeywords(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Create a complete SEO Strategy for a MENA business.

Business: ${inputs.businessName}
Industry: ${inputs.industry}
Website: ${inputs.website || 'New — starting from zero'}
Location: ${inputs.location || 'MENA'}
Competitors: ${inputs.competitors || 'Not identified yet'}

MENA SEO REALITY:
- Arabic search volume is massively underserved — ranking in Arabic is 10x easier than English
- Local SEO (Google Business Profile) drives 60%+ of leads for services in MENA
- Country domains (.ae, .sa) often outperform .com in local search

Deliver:
## Arabic Keywords (20 high-value Arabic keywords competitors are ignoring)
## English Keywords — Commercial Intent (10 keywords — ready to buy)
## English Keywords — Research Intent (15 keywords — for content)
## Long-Tail Quick Wins (25 low-competition phrases with real buyers)
## Local SEO Strategy (Google Business Profile, citations, neighborhood keywords)
## Content Cluster Map (5 pillars × 5 articles each)
## Technical SEO Checklist (Top 5 issues MENA websites typically have)
## 90-Day SEO Roadmap (Month by month — specific tasks and expected results)`, MASTER_IDENTITY, { language: inputs.language });
}

async function generateColdEmail(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Write Cold Outreach sequences for a MENA entrepreneur.

Business: ${inputs.businessName}
Target: ${inputs.targetAudience}
Offer: ${inputs.offer || 'Service/product'}
Tone: ${inputs.tone || 'Professional, warm, direct'}

Deliver:
## Email Sequence (5 emails)
## LinkedIn DM Sequence (3 messages)
## WhatsApp Script (3 versions: warm intro, cold intro, referral)
## Instagram DM Script

MENA outreach rules: warmth before business, WhatsApp > email for SMBs, LinkedIn for B2B only.`, MASTER_IDENTITY, { language: inputs.language });
}

async function generateSalesScript(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Write Sales Scripts for a MENA business.

Business: ${inputs.businessName}
Product: ${inputs.product || inputs.businessName}
Target: ${inputs.targetAudience || 'MENA market'}
Price: ${inputs.price || 'To be discussed'}

Deliver:
## The Opening (First 30 seconds)
## Discovery Questions (10 questions)
## The Pitch (90-second version)
## Objection Handling (Top 7 MENA objections: too expensive / need to think / not now / send on WhatsApp / don't trust online / is this halal?)
## The Close (3 techniques that work in Arab culture — respect-based, not pressure-based)
## WhatsApp Follow-Up (3 messages over 7 days)
## Arabic Versions (Key phrases)`, MASTER_IDENTITY, { language: inputs.language });
}

async function generateMarketResearch(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Conduct Market Intelligence Research for a MENA business.

Niche: ${inputs.niche || inputs.product}
Region: ${inputs.region || 'MENA'}
Product: ${inputs.product}
Budget: ${inputs.budget || 'Bootstrap'}

Deliver:
## Market Overview (Size, growth rate, key trends in ${inputs.region})
## Customer Segmentation (3-5 segments with MENA psychographics)
## Demand Analysis (What people search for, ask for, complain about)
## Competitive Landscape (5-8 players — real names, real strengths/weaknesses)
## Pricing Intelligence
## Distribution Channels (How products reach customers in ${inputs.region})
## Regulatory Environment (Licenses, restrictions, taxes for this niche)
## SWOT Analysis
## Market Entry Strategy (Fastest path to first revenue with ${inputs.budget})
## 3-Month Action Plan`, MASTER_IDENTITY, { language: inputs.language });
}

async function generateMarketingStrategy(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Build a complete Marketing Strategy for a MENA business.

Business: ${inputs.businessName}
Industry: ${inputs.industry}
Target: ${inputs.targetAudience || 'MENA market'}
Goals: ${inputs.goals || 'Awareness + leads'}
Budget: ${inputs.budget || 'Bootstrap'}
Current Presence: ${inputs.currentPresence || 'Starting fresh'}
Timeline: ${inputs.timeline || '6 months'}

Deliver:
## Brand Positioning Statement
## Target Customer Avatar (MENA psychographics)
## Channel Strategy (Ranked by ROI: Instagram, WhatsApp, TikTok, Google, LinkedIn, local events)
## Content Strategy (30-day content calendar — Arabic + English)
## Paid Advertising Plan (Platforms, budgets in local currency)
## Organic Growth Tactics (5 zero-cost tactics that work in MENA)
## WhatsApp Marketing (Catalog, broadcast, community strategy)
## Partnerships & Collaborations (5 specific potential partners)
## KPIs & Metrics
## 6-Month Roadmap`, MASTER_IDENTITY, { language: inputs.language });
}

async function generateMarketStudy(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Conduct a focused Market Study.

Topic: ${inputs.topic || inputs.niche}
Region: ${inputs.region || 'MENA'}
Depth: ${inputs.depth || 'Comprehensive'}

Deliver:
## Industry Overview
## Market Size & Growth
## Key Players & Market Share
## Consumer Behavior & Trends
## Opportunities & Threats
## Regulatory Landscape
## Investment Activity
## Recommendations

Use real data points. Reference ${inputs.region} specifically.`, MASTER_IDENTITY, { language: inputs.language });
}

/* ══════════════════════════════════════════════════════════════════
   ACADEMY — FOUNDER PATH (GPT-4o-mini)
   Daily Journey sessions — personalized, MENA-specific
══════════════════════════════════════════════════════════════════ */
async function generateFounderPathSession(sessionData, dnaContext, language) {
  const psychCtx = dnaContext ? `
═══ PERSONALIZING FOR THIS FOUNDER ═══
Work Style: ${dnaContext.workStyle || 'Not set'}
Energy Type: ${dnaContext.energyType || 'Not set'}
Their Path: ${dnaContext.pathName || 'Not set'}
Country: ${dnaContext.country || 'MENA'}
Hidden Strength: ${dnaContext.realStrength || 'Not set'}
Avoid at all cost: ${dnaContext.avoidAtAllCost || 'Not set'}
═══════════════════════════════════════` : '';

  return openaiChat(`${psychCtx}
Generate an interactive learning session for the Double Eight AI Academy.

Session: ${sessionData.title}
Step: ${sessionData.stepTitle}
Duration: ${sessionData.duration || '12 min'}
Focus: ${sessionData.focus}
Country context: ${dnaContext?.country || 'MENA'}

Deliver a COMPLETE learning session:

## Opening Hook (1-2 sentences that immediately connect to this founder's specific reality in MENA. Make them feel this was written for them.)

## The Core Lesson (800-1200 words)
- Real MENA examples, not Silicon Valley
- Stories of Arab founders or MENA businesses where relevant
- Use the founder's work style to frame the content (Detectives get data; Connectors get stories; Builders get systems)
- Break into 3-4 clear sections with headers

## The Reality Check (What most MENA founders get wrong about this topic. Be direct.)

## Your Reflection Exercise (1 specific writing prompt or task tailored to their psychology)

## The Action Step (ONE concrete thing to do today — specific to their country and budget)

## Key Takeaway (One unforgettable sentence they'll remember tomorrow)

Write in a voice that feels like a brilliant, battle-tested mentor who knows the Arab world. Not academic. Not corporate. Real.`, MASTER_IDENTITY, { language, temperature: 0.8 });
}

/* ══════════════════════════════════════════════════════════════════
   WEBSITE GENERATOR — GPT-4o-mini (FIXED)
   Three-pass approach: validate → generate → repair if needed
══════════════════════════════════════════════════════════════════ */
const TEMPLATE_MAP = {
  'Business / Company':   'premium.html',
  'E-commerce / Shop':    'premium.html',
  'Portfolio / Personal': 'premium.html',
  'Service / Agency':     'premium.html',
  'Restaurant / Cafe':    'premium.html',
  'Real Estate':          'premium.html',
  'Education / Course':   'premium.html',
  'Medical / Clinic':     'premium.html',
  'premium':              'premium.html'
};

function loadTemplate(websiteType) {
  const filename = TEMPLATE_MAP[websiteType] || 'premium.html';
  const filepath = path.join(__dirname, '..', 'website-templates', filename);
  if (!fs.existsSync(filepath)) {
    const fallback = path.join(__dirname, '..', 'website-templates', 'premium.html');
    if (!fs.existsSync(fallback)) {
      const superFallback = path.join(__dirname, '..', 'website-templates', 'business.html');
      if (!fs.existsSync(superFallback)) throw new Error('No website templates found');
      return fs.readFileSync(superFallback, 'utf8');
    }
    return fs.readFileSync(fallback, 'utf8');
  }
  return fs.readFileSync(filepath, 'utf8');
}

const COLOR_SCHEMES = {
  'Dark & Gold (Luxury)':     { primary: '#f59e0b', accent: '#d97706', bg: '#0a0a0f', text: '#fefce8' },
  'Light & Clean (Minimal)':  { primary: '#1f2937', accent: '#3b82f6', bg: '#ffffff', text: '#1f2937' },
  'Dark & Blue (Tech)':       { primary: '#3b82f6', accent: '#06b6d4', bg: '#0f172a', text: '#f1f5f9' },
  'White & Green (Health)':   { primary: '#10b981', accent: '#059669', bg: '#f9fafb', text: '#064e3b' },
  'Dark & Purple (Creative)': { primary: '#a855f7', accent: '#ec4899', bg: '#1a0a2e', text: '#fae8ff' },
};

function applyFallbackEdits(template, inputs) {
  let html = template;
  const name = inputs.businessName || 'Your Business';
  html = html
    .replace(/\{\{\s*BRAND_NAME\s*\}\}/g, name)
    .replace(/\{\{\s*BUSINESS_NAME\s*\}\}/g, name)
    .replace(/\{\{\s*COMPANY_NAME\s*\}\}/g, name);

  const s = COLOR_SCHEMES[inputs.colors] || COLOR_SCHEMES['Dark & Gold (Luxury)'];
  html = html
    .replace(/\{\{\s*PRIMARY_COLOR\s*\}\}/g, s.primary)
    .replace(/\{\{\s*ACCENT_COLOR\s*\}\}/g, s.accent)
    .replace(/\{\{\s*BG_COLOR\s*\}\}/g, s.bg)
    .replace(/\{\{\s*TEXT_COLOR\s*\}\}/g, s.text);
  return html;
}

function extractHTML(raw) {
  if (!raw) throw new Error('Empty response');
  let html = String(raw).trim();
  
  // Remove any markdown code fences if present
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();
  
  // Try to find the start of the HTML document
  const doctypeIndex = html.toLowerCase().indexOf('<!doctype html>');
  const htmlStartIndex = html.toLowerCase().indexOf('<html');
  
  let startIndex = -1;
  if (doctypeIndex !== -1) startIndex = doctypeIndex;
  else if (htmlStartIndex !== -1) startIndex = htmlStartIndex;
  
  if (startIndex !== -1) {
    const lastHtmlEndIndex = html.toLowerCase().lastIndexOf('</html>');
    if (lastHtmlEndIndex !== -1) {
      let result = html.substring(startIndex, lastHtmlEndIndex + 7);
      if (startIndex === htmlStartIndex && doctypeIndex === -1) {
        result = '<!DOCTYPE html>\n' + result;
      }
      return result;
    }
  }
  
  // If we couldn't find proper tags but it looks like HTML, return it as is
  if (html.includes('<body') || html.includes('<div')) {
    return html;
  }
  
  throw new Error('No valid HTML document found in response');
}

async function generateWebsiteCreation(inputs) {
  const template = loadTemplate(inputs.content || 'Business / Company');
  const isAr = inputs.language === 'ar';
  const name = (inputs.businessName || 'My Business').trim();

  // STEP 0: Deterministic base replace (instant — colors, brand name, fonts)
  let html = applyFallbackEdits(template, inputs);
  if (isAr) {
    html = html.replace(/<html([^>]*)lang="en"/, '<html$1lang="ar" dir="rtl"');
    html = html.replace(/<html([^>]*)>(?![^]*dir=)/, '<html$1 dir="rtl">');
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 1 — MODEL 1 (DeepSeek): Read user input → write creative brief
     DeepSeek understands the business and writes compelling copy.
     Output: raw text brief with all the content pieces.
  ═══════════════════════════════════════════════════════════ */
  let brief;
  try {
    const step1prompt = `You are a creative director. A client needs a ${inputs.content || 'business'} website for "${name}".

Details from the client:
- Color style: ${inputs.colors || 'Dark & Gold'}
- Font preference: ${inputs.fonts || 'Modern Sans-Serif'}
- Sections wanted: ${inputs.sections || 'Full website'}
- Special requests: ${inputs.extraDetails || 'None'}
- Language: ${isAr ? 'ARABIC — write ALL text in Arabic' : 'English'}

Write the ACTUAL website copy. Be specific to THIS business. No generic text.
${isAr ? 'Write everything in Arabic.' : ''}

HERO SECTION:
- Badge text (5-8 words, like "Trusted by 1,000+ businesses")
- Main headline (8-12 words, powerful)
- Subtitle (2 compelling sentences)
- Primary button text
- Secondary button text

FEATURES (3 features):
- Feature 1: emoji icon, title, description (2 sentences)
- Feature 2: emoji icon, title, description
- Feature 3: emoji icon, title, description

ABOUT SECTION:
- Section title
- Paragraph 1 (brand story, 2-3 sentences)
- Paragraph 2 (mission, 2-3 sentences)

TESTIMONIALS (3 clients):
- Testimonial 1: quote (2 sentences), person name, their title
- Testimonial 2: quote, name, title
- Testimonial 3: quote, name, title

CONTACT:
- Section headline
- Section subtitle

FOOTER:
- Brand tagline (1 sentence)`;

    brief = await deepseekChat(step1prompt,
      'Creative director. Write specific, compelling website copy. No placeholders. No markdown formatting.',
      { temperature: 0.8, maxTokens: 1500 });
  } catch (err) {
    console.warn('[website] Model 1 (DeepSeek brief) failed:', err.message);
    return html; // Return template with just colors/brand replaced — still works
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 2 — MODEL 2 (Claude Haiku): Extract structured JSON from brief
     Claude reads the brief and returns a clean JSON object.
     NO HTML processing. Just text extraction into key-value pairs.
     This keeps the response small (~800 tokens) and never truncates.
  ═══════════════════════════════════════════════════════════ */
  try {
    const step2prompt = `Extract the website copy from this creative brief and return it as JSON.

BRIEF:
${brief}

Return ONLY valid JSON (no markdown, no backticks):
{
  "badge": "badge text",
  "headline": "main headline",
  "subtitle": "subtitle paragraph",
  "cta1": "primary button",
  "cta2": "secondary button",
  "f1icon": "emoji", "f1title": "feature 1 title", "f1desc": "feature 1 description",
  "f2icon": "emoji", "f2title": "feature 2 title", "f2desc": "feature 2 description",
  "f3icon": "emoji", "f3title": "feature 3 title", "f3desc": "feature 3 description",
  "aboutTitle": "about section title",
  "aboutP1": "about paragraph 1",
  "aboutP2": "about paragraph 2",
  "t1quote": "testimonial 1 quote", "t1name": "name", "t1role": "title, company",
  "t2quote": "testimonial 2 quote", "t2name": "name", "t2role": "title, company",
  "t3quote": "testimonial 3 quote", "t3name": "name", "t3role": "title, company",
  "contactTitle": "contact headline",
  "contactSub": "contact subtitle",
  "footerTagline": "footer tagline"
}`;

    const raw2 = await openrouterChat(step2prompt,
      'Data extractor. Return ONLY valid JSON. No markdown.',
      { temperature: 0.2, maxTokens: 1200, json: true, model: 'anthropic/claude-3-haiku' });

    let copy;
    try {
      const clean = String(raw2).trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      copy = JSON.parse(clean);
    } catch { copy = null; }

    if (copy) {
      /* ═══════════════════════════════════════════════════════════
         STEP 3 — CODE: Inject the structured copy into the HTML template
         Pure string replacement. No AI. Instant. Never fails.
      ═══════════════════════════════════════════════════════════ */
      const r = (search, val) => { if (val) html = html.replace(search, val); };

      // Hero
      r(/✦[^<]*<\/span>/, `✦ ${copy.badge || name}</span>`);
      if (copy.headline) {
        // Replace the <h1> content, preserving <span class="accent"> on first 2 words
        const words = copy.headline.split(' ');
        const accent = words.slice(0, 2).join(' ');
        const rest = words.slice(2).join(' ');
        html = html.replace(/<h1>[^]*?<\/h1>/,
          `<h1>${rest ? rest + ' ' : ''}<span class="accent">${accent}</span></h1>`);
      }
      if (copy.subtitle) {
        // Replace first <p> after hero heading
        html = html.replace(
          /(<div class="hero-cta">)/,
          `<p>${copy.subtitle}</p>\n      $1`
        ).replace(/<p>We help ambitious[^<]*<\/p>\s*/, '');
      }
      r('Start Today →', copy.cta1);
      r('Learn More', copy.cta2);

      // Features — find the 3 feature blocks and replace content
      const featureRegex = /<div class="feature-icon">([^<]*)<\/div>\s*<h3>([^<]*)<\/h3>\s*<p>([^<]*)<\/p>/g;
      let featIdx = 0;
      html = html.replace(featureRegex, (match) => {
        featIdx++;
        const icon = copy[`f${featIdx}icon`] || '⚡';
        const title = copy[`f${featIdx}title`] || '';
        const desc = copy[`f${featIdx}desc`] || '';
        if (title) return `<div class="feature-icon">${icon}</div>\n        <h3>${title}</h3>\n        <p>${desc}</p>`;
        return match;
      });

      // About
      if (copy.aboutTitle) r('Built for businesses that refuse to settle', copy.aboutTitle);
      if (copy.aboutP1) {
        html = html.replace(
          /was founded on a simple belief[^<]*/,
          copy.aboutP1.replace(/</g, '&lt;')
        );
      }

      // Testimonials — replace the 3 testimonial quotes
      const tRegex = /<p>([^<]*)<\/p>\s*<div class="testimonial-author">\s*<div class="author-avatar">([^<]*)<\/div>\s*<div class="author-info"><div class="author-name">([^<]*)<\/div><div class="author-title">([^<]*)<\/div>/g;
      let tIdx = 0;
      html = html.replace(tRegex, (match, q, av, n, role) => {
        tIdx++;
        const quote = copy[`t${tIdx}quote`] || q;
        const tname = copy[`t${tIdx}name`] || n;
        const trole = copy[`t${tIdx}role`] || role;
        const initials = tname.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        return `<p>${quote}</p>\n        <div class="testimonial-author">\n          <div class="author-avatar">${initials}</div>\n          <div class="author-info"><div class="author-name">${tname}</div><div class="author-title">${trole}</div>`;
      });

      // Contact
      if (copy.contactTitle) r("Let's build something together", copy.contactTitle);
      if (copy.contactSub) r('Tell us about your business', copy.contactSub);

      // Footer
      if (copy.footerTagline) r('Premium strategy and execution for ambitious businesses. We turn ideas into measurable results.', copy.footerTagline);
    }
  } catch (err) {
    console.warn('[website] Model 2 (Claude JSON extract) failed:', err.message);
    // Fallback: template with colors + brand already applied — still a valid website
  }

  return html;
}

// Legacy alias
async function generateWebsiteCopy(inputs) { return generateWebsiteCreation(inputs); }

/* ══════════════════════════════════════════════════════════════════
   IMAGE GENERATION — xAI Grok Aurora
   Used by tools.controller for the Image section
══════════════════════════════════════════════════════════════════ */
async function generateImageFromText(prompt, options = {}) {
  // Enhance prompt for quality
  const enhancedPrompt = `${prompt}. Professional quality, high resolution, detailed.`;
  return generateImage(enhancedPrompt, options);
}

/* ══════════════════════════════════════════════════════════════════
   INPUT SANITIZATION
══════════════════════════════════════════════════════════════════ */
function sanitizeInputs(inputs) {
  if (!inputs || typeof inputs !== 'object') return {};
  const out = {};
  for (const key of Object.keys(inputs)) {
    const val = inputs[key];
    if (val == null) { out[key] = val; continue; }
    if (typeof val === 'string') {
      let s = val
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\uFEFF]/g, ' ')
        .replace(/\[\/?\s*INST\]/gi, '')
        .replace(/<\|\/?\s*(?:system|user|assistant|im_start|im_end)\|>/gi, '')
        .replace(/```\s*(?:system|assistant|user)\b/gi, '')
        .replace(/\s+/g, ' ').trim();
      if (s.length > 4000) s = s.slice(0, 4000);
      out[key] = s;
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      out[key] = val;
    } else if (Array.isArray(val)) {
      out[key] = val.slice(0, 50).map(v => typeof v === 'string' ? v.slice(0, 500) : v);
    } else { out[key] = val; }
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════
   EXPORTS
══════════════════════════════════════════════════════════════════ */
module.exports = {
  chat,
  streamChat,
  sanitizeInputs,
  generateFounderPathSession,
  generateImageFromText,
  // Tools
  generateBrandKit,
  generateBusinessPlan,
  generateCompetitorMatrix,
  generatePricingCalculator,
  generateLaunchRoadmap,
  generateContract,
  generateBudgetEstimator,
  generatePitchDeck,
  generateAdCopy,
  generateSeoKeywords,
  generateColdEmail,
  generateSalesScript,
  generateMarketResearch,
  generateMarketingStrategy,
  generateMarketStudy,
  generateWebsiteCreation,
  generateWebsiteCopy,
  // One-liners
  generateBusinessName: (i) => openaiChat(`Generate 10 creative business names for: Industry: ${i.industry}, Description: ${i.description}, Style: ${i.style || 'Modern'}, Market: ${i.targetMarket || 'MENA'}. For each: name, domain suggestion, tagline, why it works. Include Arabic-friendly options.`, MASTER_IDENTITY, { language: i.language }),
  generateSlogan: (i) => openaiChat(`Generate 15 slogans for ${i.businessName} in ${i.industry}. Core value: ${i.coreValue}. Tone: ${i.tone}. Give 5 in Arabic, 10 in English. For each: the slogan + why it works for MENA.`, MASTER_IDENTITY, { language: i.language }),
  generateContentCalendar: (i) => openaiChat(`Create a 30-day social media content calendar for ${i.businessName} in ${i.industry}. Platforms: ${i.platforms || 'Instagram, WhatsApp'}. Voice: ${i.brandVoice || 'Professional'}. For each day: platform, type, full caption in Arabic AND English, hashtags, time.`, MASTER_IDENTITY, { language: i.language }),
};
