const { geminiChat, openrouterChat, openaiChat, MASTER_IDENTITY } = require('./gemini.service');
const fs = require('fs');
const path = require('path');

/* ══════════════════════════════════════════════════════════════════
   AI SERVICE — MULTI-PROVIDER ARCHITECTURE
   ─────────────────────────────────────────
   Gemini Flash     → AI Advisor Chat (streaming) + Academy
   OpenRouter       → Business DNA + Launch Package (via controllers)
   OpenAI GPT       → AI Tools (18 generators below)

   Every generator that receives psychProfileBlock context will
   produce output shaped by the user's psychology — work style,
   motivation, risk DNA, energy type, what to avoid.
══════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════
   GEMINI FLASH — AI ADVISOR CHAT (Venture Architect)
══════════════════════════════════════════════════════════════════ */
const ADVISOR_SYSTEM = `You are a high-level Venture Architect, Talent Hunter, and Market Psychologist focused on the MENA region.

WHO YOU ARE TALKING TO:
The person in front of you is likely a first-generation entrepreneur. They may have never taken a business course. They have an idea they believe in and the courage to try. They need someone who believes in them AND tells them the truth.

YOUR JOB:
- Find hidden opportunities before they become obvious
- Detect market gaps, behavioral shifts, and underserved industries
- Think like an operator, not a motivational speaker
- Research deeply before answering
- Never hallucinate, exaggerate, or invent facts
- Prioritize truth over pleasing the user
- Focus heavily on MENA realities: Gulf markets, North Africa, Levant, diaspora economics, youth unemployment, digital adoption, family business culture, and government-driven economic transformation
- Do not over-explain. Specify important points in clear lines for each subject.

YOU THINK LIKE:
- A founder who survived difficult markets
- A recruiter who understands human ambition
- A strategist who studies incentives and psychology
- A local insider who understands Arab culture, status, fear, family pressure, and social reputation

CORE MISSION — Help people in MENA:
- Build businesses
- Discover profitable ideas
- Understand markets realistically
- Find talent and opportunities
- Avoid costly ego-driven mistakes
- Make decisions based on incentives, timing, and local realities

YOU SEARCH FOR:
- Emerging sectors
- Underserved customer pain points
- Hidden B2B opportunities
- Government-driven growth sectors
- Talent shortages
- Behavioral patterns in Arab markets
- Business models that fit local culture

YOU DO NOT:
- Sell fake motivation
- Promise guaranteed success
- Use Silicon Valley advice blindly in MENA
- Ignore political, economic, or cultural realities
- Recommend ideas disconnected from purchasing power

RESEARCH & THINKING STYLE:
- When users are scared → give them clarity, not empty encouragement
- When users fail → treat failure as market data
- When users hesitate → break decisions into small realistic moves
- When users dream big → help them separate ego from opportunity

YOU ANALYZE:
- The psychology of customers
- The psychology of founders
- The psychology of hiring
- Status-driven buying behavior
- Fear-based decision making in Arab societies

BEFORE ANSWERING:
- Analyze the country's economic reality
- Understand the user's psychological state
- Evaluate local purchasing power
- Consider regulations, taxes, and business culture
- Search for second-order opportunities others miss
- Think long-term, not trend-chasing

YOUR ANSWERS FEEL LIKE:
- A smart older brother
- A battle-tested founder
- A calm strategist
- Someone who truly knows the region

NOT:
- A corporate consultant
- A hype Twitter entrepreneur
- A generic AI chatbot

FORMAT:
- Use markdown for structure
- Keep paragraphs 2-3 sentences max
- Bold the most important action items
- Number steps when listing
- End every answer with: **Your next action: [specific thing to do today]**`;

async function chat(messages, systemPrompt, language) {
  let sysMsg = systemPrompt || ADVISOR_SYSTEM;
  if (language === 'ar') {
    sysMsg += `\n\nCRITICAL: Respond ENTIRELY in Modern Standard Arabic (الفصحى). Keep brand names and URLs in original language. Never respond in English.`;
  }
  const conversation = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
  return geminiChat(`Previous conversation:\n${conversation}\n\nRespond as the assistant.`, sysMsg, { temperature: 0.7 });
}

async function streamChat(messages, type, onChunk, language) {
  let sysMsg = ADVISOR_SYSTEM;
  if (language === 'ar') {
    sysMsg += `\n\nCRITICAL: Respond ENTIRELY in Modern Standard Arabic (الفصحى). Keep brand names and URLs in original language. Never respond in English.`;
  }
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI2 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI2.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: sysMsg,
    generationConfig: { temperature: 0.7, topP: 0.95 },
  });
  const geminiHistory = [];
  for (const m of messages.slice(0, -1)) {
    geminiHistory.push({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] });
  }
  const lastMsg = messages[messages.length - 1];
  const chatSession = model.startChat({ history: geminiHistory });
  const result = await chatSession.sendMessageStream(lastMsg.content);
  let full = '';
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) { full += text; if (onChunk) onChunk(text); }
  }
  return full;
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
  const map = { 'Saudi Arabia':'SAR','UAE':'AED','Egypt':'EGP','Qatar':'QAR','Kuwait':'KWD','Bahrain':'BHD','Oman':'OMR','Jordan':'JOD','Morocco':'MAD','Lebanon':'LBP' };
  return map[country] || 'USD';
}

/* ══════════════════════════════════════════════════════════════════
   GPT-5.4 MINI TOOL GENERATORS (OpenAI)
   Each prompt uses psychProfileBlock when available.
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

This roadmap must be shaped by the founder's psychology:
- Detective founders get research-heavy early weeks
- Builder founders get prototype-focused weeks
- Connector founders get relationship-led validation
- Performer founders get content-led launches
- Maker founders get craft-first approaches

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

Deliver a complete, usable contract including:
## Header & Parties
## Scope of Work / Services
## Payment Terms (in local currency, milestone-based)
## Duration & Renewal
## Intellectual Property
## Confidentiality
## Liability & Indemnification
## Termination Conditions
## Dispute Resolution (Reference local arbitration: DIAC for UAE, SCCA for Saudi, etc.)
## Signatures Block

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
## Startup Costs (One-time: licenses, equipment, setup. Specific to ${inputs.location})
## Monthly Fixed Costs (Rent, salaries, subscriptions, insurance — real numbers for this market)
## Variable Costs (Per unit/client costs)
## Revenue Assumptions (Conservative / Moderate / Optimistic — show the math)
## Month-by-Month P&L Table (Revenue - Costs = Profit/Loss for months 1-6)
## Cash Flow Analysis (When money comes in vs goes out — the survival question)
## Break-Even Point (Exactly how many customers/sales to cover costs)
## Runway Calculator (How long their budget lasts at current burn rate)
## Key Metrics to Track (The 3 numbers that determine if they live or die)

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

Deliver 12 slides with exact text:
## Slide 1: Title (Company + one-line hook)
## Slide 2: Problem (The pain — make investors feel it)
## Slide 3: Solution (What you do, in 15 words)
## Slide 4: Market Size (TAM/SAM/SOM in ${getCurrency(inputs.market || 'UAE')})
## Slide 5: Business Model (How money flows — simple)
## Slide 6: Traction / Proof (What you've done — even if small, frame it right)
## Slide 7: Competition (Your 2x2 matrix — show the gap)
## Slide 8: Unique Advantage (Connect to the founder's psychological edge)
## Slide 9: Go-to-Market (First 1000 customers — realistic channels)
## Slide 10: Team (Frame the founder's psychology as a strategic asset)
## Slide 11: Financials (Month 1-12 projections, key milestones)
## Slide 12: The Ask (What you need, what you'll do with it, what investors get)

Design notes for each slide (colors, layout, what image/chart to include).
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
Budget Note: ${inputs.adBudget || 'Low budget — efficiency matters'}

Deliver for EACH platform:
## Instagram (3 ad variations: hook + body + CTA. Include Arabic versions)
## Facebook (3 ad variations with longer copy)
## Google Ads (5 responsive search ad combinations: headlines + descriptions)
## WhatsApp Status (3 short promo texts for status updates — this is how MENA sells)

For each ad:
- The hook (first 3 words that stop the scroll)
- The body (why they should care)
- The CTA (what to do now)
- Arabic version
- Targeting suggestion (age, interest, location)

Understand MENA ad behavior: WhatsApp is the conversion channel. Instagram is discovery. Facebook is retargeting. Google is intent capture.`, MASTER_IDENTITY, { language: inputs.language });
}

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
## Content Cluster Map (5 pillars × 5 articles each = 30 pieces mapped)
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
## Email Sequence (5 emails: initial → follow-up 1 → value add → social proof → final)
## LinkedIn DM Sequence (3 messages: connect note → value → soft ask)
## WhatsApp Script (3 versions: warm intro, cold intro, referral intro)
## Instagram DM Script (First message + follow-up)

For each message:
- Subject line (email only)
- Opening hook (first sentence)
- Body (2-3 sentences max)
- CTA (one clear action)
- Arabic version

MENA outreach rules: warmth before business, reputation matters, WhatsApp > email for SMBs, LinkedIn for B2B only.`, MASTER_IDENTITY, { language: inputs.language });
}

async function generateSalesScript(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Write Sales Scripts for a MENA business.

Business: ${inputs.businessName}
Product: ${inputs.product || inputs.businessName}
Target: ${inputs.targetAudience || 'MENA market'}
Price: ${inputs.price || 'To be discussed'}

Deliver:
## The Opening (First 30 seconds — build trust, not pitch)
## Discovery Questions (10 questions to understand the buyer's real need)
## The Pitch (90-second version — problem → solution → proof → offer)
## Objection Handling (Top 7 objections in MENA markets + exact responses)
  - "Too expensive" / "Need to think" / "My friend does this" / "Not now" / "Send me on WhatsApp" / "I don't trust online" / "Is this halal?"
## The Close (3 closing techniques that work in Arab culture — respect-based, not pressure-based)
## WhatsApp Follow-Up (Post-meeting sequence: 3 messages over 7 days)
## Arabic Versions (Key phrases in Arabic that build trust)

Understand: In MENA, the relationship closes the sale, not the pitch. Status, trust, and reputation drive decisions.`, MASTER_IDENTITY, { language: inputs.language });
}

async function generateMarketResearch(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Conduct Market Intelligence Research for a MENA business.

Niche: ${inputs.niche || inputs.product}
Region: ${inputs.region || 'MENA'}
Product: ${inputs.product}
Budget: ${inputs.budget || 'Bootstrap'}

Deliver:
## Market Overview (Size, growth rate, key trends in ${inputs.region}. Use local currency.)
## Customer Segmentation (3-5 segments with demographics, psychographics, purchasing behavior specific to MENA)
## Demand Analysis (What people actually search for, ask for, complain about in this space — Arabic + English)
## Competitive Landscape (5-8 players with strengths/weaknesses. Who's winning and why.)
## Pricing Intelligence (What the market pays. Price sensitivity. Premium vs value positioning.)
## Distribution Channels (How products/services actually reach customers in ${inputs.region} — Instagram, WhatsApp, souqs, malls, online)
## Regulatory Environment (Licenses, restrictions, taxes specific to this niche in ${inputs.region})
## SWOT Analysis (Specific to THIS business in THIS market)
## Market Entry Strategy (The fastest path to first revenue with ${inputs.budget} budget)
## 3-Month Action Plan (Specific weekly actions to validate and enter this market)

Be specific. Use real numbers. Reference real platforms and real costs in ${inputs.region}.`, MASTER_IDENTITY, { language: inputs.language });
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
## Brand Positioning Statement (One sentence that separates this business from every competitor)
## Target Customer Avatar (Demographics + psychographics + buying triggers specific to MENA)
## Channel Strategy (Rank channels by ROI for THIS business: Instagram, WhatsApp, TikTok, Google, LinkedIn, local events, partnerships)
## Content Strategy (What to post, frequency, format. Arabic + English content calendar for 30 days)
## Paid Advertising Plan (Platforms, budgets in local currency, targeting, creative direction)
## Organic Growth Tactics (5 zero-cost tactics that work in MENA markets specifically)
## WhatsApp Marketing (The most underrated channel in MENA — catalog, broadcast, community strategy)
## Partnerships & Collaborations (5 specific potential partners in ${inputs.industry})
## KPIs & Metrics (What to track weekly, what "good" looks like at each stage)
## 6-Month Roadmap (Month by month — budget allocation, channel focus, milestones)

Match the strategy to this founder's personality: don't give a Performer's strategy to a Detective, or a Connector's approach to a solo Builder.`, MASTER_IDENTITY, { language: inputs.language });
}

async function generateMarketStudy(inputs) {
  return openaiChat(`${psychProfileBlock(inputs)}
Conduct a focused Market Study.

Topic: ${inputs.topic || inputs.niche}
Region: ${inputs.region || 'MENA'}
Depth: ${inputs.depth || 'Comprehensive'}

Deliver a research-grade market study covering:
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
   WEBSITE CREATOR — Template-based (Gemini Flash)
══════════════════════════════════════════════════════════════════ */
const TEMPLATE_MAP = {
  'Business / Company':   'business.html',
  'Portfolio / Personal': 'portfolio.html',
  'Restaurant / Cafe':    'restaurant.html',
  'E-Commerce / Store':   'ecommerce.html',
  'Startup / SaaS':       'business.html',
  'Gym / Fitness':        'business.html',
  'Real Estate':          'business.html',
  'Medical / Clinic':     'business.html',
};

function loadTemplate(websiteType) {
  const filename = TEMPLATE_MAP[websiteType] || 'business.html';
  const filepath = path.join(__dirname, '..', 'website-templates', filename);
  if (!fs.existsSync(filepath)) {
    const fallback = path.join(__dirname, '..', 'website-templates', 'business.html');
    if (!fs.existsSync(fallback)) throw new Error('No website templates found. Add HTML files to /website-templates/');
    return fs.readFileSync(fallback, 'utf8');
  }
  return fs.readFileSync(filepath, 'utf8');
}

function applyFallbackEdits(template, inputs) {
  let html = template;
  const name = inputs.businessName || 'Your Business';
  html = html.replace(/\{\{\s*BRAND_NAME\s*\}\}/g, name).replace(/\{\{\s*BUSINESS_NAME\s*\}\}/g, name).replace(/\{\{\s*COMPANY_NAME\s*\}\}/g, name);
  const schemes = {
    'Dark & Gold (Luxury)':     { primary:'#f59e0b', accent:'#d97706', bg:'#0a0a0f', text:'#fefce8' },
    'Light & Clean (Minimal)':  { primary:'#1f2937', accent:'#3b82f6', bg:'#ffffff', text:'#1f2937' },
    'Dark & Blue (Tech)':       { primary:'#3b82f6', accent:'#06b6d4', bg:'#0f172a', text:'#f1f5f9' },
    'White & Green (Health)':   { primary:'#10b981', accent:'#059669', bg:'#f9fafb', text:'#064e3b' },
    'Dark & Purple (Creative)': { primary:'#a855f7', accent:'#ec4899', bg:'#1a0a2e', text:'#fae8ff' },
  };
  const s = schemes[inputs.colors] || schemes['Dark & Gold (Luxury)'];
  html = html.replace(/\{\{\s*PRIMARY_COLOR\s*\}\}/g, s.primary).replace(/\{\{\s*ACCENT_COLOR\s*\}\}/g, s.accent).replace(/\{\{\s*BG_COLOR\s*\}\}/g, s.bg).replace(/\{\{\s*TEXT_COLOR\s*\}\}/g, s.text);
  return html;
}

async function generateWebsiteCreation(inputs) {
  const template = loadTemplate(inputs.content || 'Business / Company');
  const isAr = inputs.language === 'ar';
  try {
    const raw = await geminiChat(
      `You are editing an existing HTML website template. Make targeted edits for this business:
Brand: ${inputs.businessName || 'Untitled'}
Type: ${inputs.content || 'Business'}
Sections: ${inputs.sections || 'Full'}
Colors: ${inputs.colors || 'Dark & Gold'}
Fonts: ${inputs.fonts || 'Modern Sans-Serif'}
Interactive: ${inputs.interactive || 'Smooth scroll'}
Extra: ${inputs.extraDetails || 'None'}
Language: ${isAr ? 'ARABIC — translate all text, set dir="rtl"' : 'English'}

Edit: brand name, headlines, body copy, colors in :root, fonts, CTA text. Keep structure intact.
Return ONLY the edited HTML starting with <!DOCTYPE html>. No markdown fences.

THE TEMPLATE:
${template}`,
      'You are an expert web developer. Output ONLY clean HTML.',
      { temperature: 0.5, language: inputs.language }
    );
    let html = String(raw).trim().replace(/^```html\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'').trim();
    const match = html.match(/<!DOCTYPE\s+html[\s\S]*<\/html>/i);
    if (match) html = match[0]; else throw new Error('Invalid HTML');
    if (html.length < template.length * 0.5) throw new Error('Truncated');
    return html;
  } catch (err) {
    console.error('Website AI edit failed, using fallback:', err.message);
    return applyFallbackEdits(template, inputs);
  }
}

// Legacy alias
async function generateWebsiteCopy(inputs) { return generateWebsiteCreation(inputs); }

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
      let s = val.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\uFEFF]/g, ' ')
        .replace(/\[\/?INST\]/gi, '')
        .replace(/<\|\/?(?:system|user|assistant|im_start|im_end)\|>/gi, '')
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
   ONE-LINE GENERATORS (OpenAI GPT)
══════════════════════════════════════════════════════════════════ */
module.exports = {
  chat, streamChat, sanitizeInputs,
  generateBrandKit, generateBusinessPlan, generateCompetitorMatrix,
  generatePricingCalculator, generateLaunchRoadmap, generateContract,
  generateBudgetEstimator, generatePitchDeck, generateAdCopy,
  generateSeoKeywords, generateColdEmail, generateSalesScript,
  generateMarketResearch, generateMarketingStrategy, generateMarketStudy,
  generateWebsiteCreation, generateWebsiteCopy,
  generateBusinessName: (i) => openaiChat(`Generate 10 creative business names for: Industry: ${i.industry}, Description: ${i.description}, Style: ${i.style||'Modern'}, Market: ${i.targetMarket||'MENA'}. For each: name, domain suggestion, tagline, why it works. Include Arabic-friendly options.`, MASTER_IDENTITY, { language: i.language }),
  generateSlogan: (i) => openaiChat(`Generate 15 slogans for ${i.businessName} in ${i.industry}. Core value: ${i.coreValue}. Tone: ${i.tone}. Give 5 in Arabic, 10 in English. For each: the slogan + why it works for MENA.`, MASTER_IDENTITY, { language: i.language }),
  generateContentCalendar: (i) => openaiChat(`Create a 30-day social media content calendar for ${i.businessName} in ${i.industry}. Platforms: ${i.platforms||'Instagram, WhatsApp'}. Voice: ${i.brandVoice||'Professional'}. For each day: platform, type, full caption in Arabic AND English, hashtags, time.`, MASTER_IDENTITY, { language: i.language }),
};
