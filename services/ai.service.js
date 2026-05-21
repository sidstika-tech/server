const Groq = require('groq-sdk');
const { geminiChat, MASTER_IDENTITY } = require('./gemini.service');
const OpenAI = require('openai');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

/* ══════════════════════════════════════════════════════════════════
   GROQ — AI ADVISOR CHAT (streaming, instant)
   System prompt built for MENA entrepreneur psychology
══════════════════════════════════════════════════════════════════ */

const ADVISOR_SYSTEM = `You are the Double Eight AI Business Advisor — the most trusted business mentor for Arab and MENA entrepreneurs.

WHO YOU ARE TALKING TO:
The person in front of you is likely a first-generation entrepreneur. They may have never taken a business course. They have an idea they believe in and the courage to try. They need someone who believes in them AND tells them the truth.

YOUR COMMUNICATION STYLE:
- Talk like a trusted older brother or mentor who has been through it — warm, direct, honest
- Never talk down. Never over-complicate. Never use jargon without explaining it.
- When you give advice, make it SPECIFIC to their country, market, and situation
- If they mention UAE/Dubai: reference free zones, VAT, DED, local market dynamics
- If they mention Saudi: reference Vision 2030 opportunities, Monsha'at, local ownership rules
- If they mention Egypt: reference the pound's current situation, large market size, price sensitivity
- If they mention any Arab country: know it, reference it, make them feel you know their world
- Use numbers when possible. "Rent in Dubai Media City starts at AED 15,000/year" beats "rent can be expensive"
- End every answer with one clear next action they can take TODAY

EMOTIONAL INTELLIGENCE:
- Celebrate their courage for starting. Acknowledge the difficulty.
- When they share a struggle, validate it before solving it
- Frame failures as data, not disasters
- When they're scared, give them the path forward, not just encouragement
- Remember: for many of them, this business is about their family's dignity, not just money

FORMAT:
- Use markdown headers for structure
- Keep paragraphs short — 2-3 sentences max
- Bold the most important action items
- When listing steps, number them
- Always end with: **Your next action: [specific thing to do today]**`;

async function chat(messages, systemPrompt, language) {
  let sysMsg = systemPrompt || ADVISOR_SYSTEM;
  if (language === 'ar') {
    sysMsg += `\n\nCRITICAL: The user is in Arabic mode. Respond ENTIRELY in Modern Standard Arabic (الفصحى). Keep brand names, country codes, and URLs in their original language. Never respond in English.`;
  }
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role:'system', content:sysMsg }, ...messages],
    temperature: 0.7,
    max_tokens: 4096,
    stream: false
  });
  return response.choices[0]?.message?.content || '';
}

async function streamChat(messages, type, onChunk, language) {
  let sysMsg = ADVISOR_SYSTEM;
  if (language === 'ar') {
    sysMsg += `\n\nCRITICAL: The user is in Arabic mode. Respond ENTIRELY in Modern Standard Arabic (الفصحى). Keep brand names, country codes, and URLs in their original language. Never respond in English.`;
  }
  const stream = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role:'system', content:sysMsg }, ...messages],
    temperature: 0.7,
    max_tokens: 4096,
    stream: true
  });
  let full = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if(delta) { full += delta; if(onChunk) onChunk(delta); }
  }
  return full;
}

/* ══════════════════════════════════════════════════════════════════
   GEMINI TOOL FUNCTIONS — MENA Psychology in every prompt
   Each prompt designed to produce output that feels:
   - Written FOR this specific person in their specific country
   - Actionable within their actual budget and context
   - Respectful of their intelligence and ambition

   ── psychProfileBlock(inputs) ──
   If the inputs come from the Launch Package (which passes the user's
   psychological DNA), this prepends a "THE FOUNDER YOU'RE WRITING FOR"
   block to the prompt. Every document then reflects THEIR personality —
   work style, motivation, risk DNA, what to avoid — making the 8
   documents feel coherent and personal instead of generic.

   When called from regular tools (no DNA passed), it returns an empty
   string so behavior is unchanged for non-package use.
══════════════════════════════════════════════════════════════════ */
function psychProfileBlock(inputs) {
  // Only include if we have psychological context (from Launch Package)
  if (!inputs || (!inputs.psychWhoYouAre && !inputs.psychWorkStyle && !inputs.psychStrength)) return '';
  return `
═══ THE FOUNDER YOU ARE WRITING FOR (read this first) ═══
${inputs.psychWhoYouAre ? `Who they are: ${inputs.psychWhoYouAre}` : ''}
${inputs.psychStrength ? `Their real strength: ${inputs.psychStrength}` : ''}
${inputs.psychWorkStyle ? `Their work style: ${inputs.psychWorkStyle}` : ''}
${inputs.psychEnergy ? `Their energy type: ${inputs.psychEnergy}` : ''}
${inputs.psychMotivation ? `What actually drives them: ${inputs.psychMotivation}` : ''}
${inputs.psychRiskDNA ? `Their risk DNA: ${inputs.psychRiskDNA}` : ''}
${inputs.psychAvoid ? `Avoid recommending this kind of work: ${inputs.psychAvoid}` : ''}
${inputs.pathName ? `Their recommended path: ${inputs.pathName}` : ''}
${inputs.pathUnfair ? `Their unfair advantage: ${inputs.pathUnfair}` : ''}
${inputs.pathRealCost ? `Honest cost of this path: ${inputs.pathRealCost}` : ''}

THIS DOCUMENT MUST RESPECT THEIR PSYCHOLOGY:
- Don't suggest tactics that drain their energy type
- Don't recommend work in their "avoid at all cost" zone
- Match the cadence and tone to their work style (Detective wants depth, Performer wants visibility, Builder wants concrete steps, etc.)
- Reference their unfair advantage where natural
- Treat them as the specific human described above — not a generic founder
═══════════════════════════════════════════════════════════════
`;
}

// ── BRAND KIT ─────────────────────────────────────────────────────────────
async function generateBrandKit(inputs) {
  return geminiChat(
`${psychProfileBlock(inputs)}
Create a complete Brand Kit for this MENA entrepreneur:

Business: ${inputs.businessName}
Industry: ${inputs.industry}
Brand Values: ${inputs.values || 'Trust, Quality, Community'}
Target Audience: ${inputs.targetAudience || 'Local market'}
Style Preference: ${inputs.style || 'Modern & Professional'}

This person is building something real with limited resources. Every element of this brand kit must be:
- Immediately usable without a designer
- Culturally appropriate for Arab/MENA markets (colors, symbolism, tone)
- Professional enough to compete with established brands

## Brand Identity Overview
(The story behind this brand in 2 sentences — make it feel human and authentic)

## Color Palette
Primary: [HEX] — [Name] — why this color works for this business and culture
Secondary: [HEX] — [Name]
Accent: [HEX] — [Name]  
Neutral: [HEX] — [Name]
Background: [HEX] — [Name]
Note any colors to AVOID and why (cultural or industry-specific)

## Typography System
Heading Font: [Exact Google Font name] — why it fits
Body Font: [Exact Google Font name] — why it's readable
Arabic Font Recommendation: [Font that pairs well in Arabic]
Font Sizes: H1/H2/H3/Body/Caption — exact px sizes

## Logo Concept
Describe 3 different logo directions (icon + wordmark, lettermark, abstract) with exact visual description so any designer or AI tool can execute it immediately

## Brand Voice
In 5 words: [adjectives]
Sounds like: [describe the tone in one sentence]
Example headline in English: [write it]
Example headline in Arabic: [write it]
Never say: [3 things to avoid]

## Brand Messaging
Mission: [one sentence]
Tagline options: [3 options in English] [3 options in Arabic]
Elevator pitch (30 seconds): [write it]

## Practical Usage Guide
How to use this brand consistently across: Instagram, WhatsApp Business, business cards, invoices`,
    `${MASTER_IDENTITY}\n\nYou are a world-class brand strategist who understands Arab market aesthetics, cultural color psychology, and Arabic typography. Create brand systems that work in both Arabic and English markets.`,
    { language: inputs.language }
  );
}

// ── BUSINESS PLAN ─────────────────────────────────────────────────────────
async function generateBusinessPlan(inputs) {
  const country = inputs.location || 'the MENA region';
  const currency = getCurrency(country);
  return geminiChat(
`${psychProfileBlock(inputs)}
Write a complete, investor-ready business plan for:

Founder: Someone building this for real — not an academic exercise
Business: ${inputs.businessName}
Industry: ${inputs.industry}
Model: ${inputs.businessModel}
Target Market: ${inputs.targetMarket}
Starting Capital: ${inputs.investment || 'Not specified'}
Location: ${country}
Currency: ${currency}
Goals (12 months): ${inputs.goals}

CRITICAL REQUIREMENTS:
- Use ${currency} for all financial figures, not USD (unless location is international)
- Reference real market data for ${country} where possible
- Include specific suppliers, platforms, and channels available in ${country}
- All financial projections must be REALISTIC for a first-time founder with limited capital
- Identify the #1 mistake founders make in this industry in ${country} — and how to avoid it

## 1. Executive Summary
(Write this last — summarize everything in 3 paragraphs. Make it investor-compelling.)

## 2. The Problem & Opportunity
(What pain does this solve? Who feels it most? Why now in ${country}?)

## 3. Our Solution
(What exactly do we offer? What makes it different in ${country}'s market?)

## 4. Market Analysis
- Total Addressable Market in ${country} (with realistic estimate)
- Target Customer Profile (demographic + psychographic — specific to ${country})
- Top 3 competitors in ${country} and their weaknesses
- Our competitive advantage

## 5. Products & Services
(Exact offering with pricing in ${currency} — justified against local market rates)

## 6. Marketing & Customer Acquisition
(Channels that actually work in ${country}: WhatsApp, Instagram, local platforms, referrals, etc.)

## 7. Operations Plan
(Step-by-step: how does day 1 to day 90 look? What licenses needed in ${country}?)

## 8. Financial Projections (${currency})
Month 1–3: Revenue / Expenses / Net (table format)
Month 4–6: Revenue / Expenses / Net
Month 7–12: Revenue / Expenses / Net
Break-even month: [Month X]

## 9. Funding Requirements
(How much, for what, expected ROI for investor)

## 10. Risk Analysis
Top 3 risks specific to ${country} + mitigation plan for each

## 11. The Ask
(If seeking investment: exact amount, equity offered, what it achieves)`,
    `${MASTER_IDENTITY}\n\nYou are a senior business plan writer who has helped MENA founders raise capital and launch businesses across the Gulf, Levant, and North Africa. You know the real challenges — bureaucracy, cultural dynamics, halal requirements, family business pressures — and you write plans that reflect this reality.`,
    { language: inputs.language }
  );
}

// ── COMPETITOR MATRIX ─────────────────────────────────────────────────────
async function generateCompetitorMatrix(inputs) {
  return geminiChat(
`${psychProfileBlock(inputs)}
Conduct a deep competitive intelligence analysis for:

Business: ${inputs.businessName}
Industry: ${inputs.industry}
My Unique Angle: ${inputs.uniqueAngle || 'Not yet defined'}
Region: ${inputs.region || 'MENA'}

This founder needs to know EXACTLY who they're up against and WHERE to hit.
Most MENA markets are dominated by either large local family businesses or Western brands that don't understand the local customer. Find the gap.

## Market Battlefield Overview
(Who controls this market right now and why — be honest)

## Top 5-8 Competitors
For each:
**[Name]** | Founded | Revenue estimate | Market position
- What they do well (be honest — respect your competition)
- Where they fail the Arab/MENA customer specifically
- Their pricing
- Their biggest weakness you can exploit

## Competitive Matrix
(Build a comparison table: Feature / Your Business / Competitor 1 / Competitor 2 / Competitor 3)

## The Gap They're All Missing
(The ONE thing none of them do well for the MENA customer — this is your opening)

## Your Positioning Statement
"For [target customer] who are frustrated by [competitor weakness], [Business Name] is the [category] that [unique value] because [proof]."

## Battle Plan
5 specific moves to take market share in the next 90 days — tactics, not theory`,
    `${MASTER_IDENTITY}\n\nYou are a competitive intelligence expert who has analyzed markets across the UAE, Saudi Arabia, Egypt, and broader MENA. You understand that many MENA markets have low competitive research standards — this is the opportunity.`,
    { language: inputs.language }
  );
}

// ── PRICING STRATEGY ──────────────────────────────────────────────────────
async function generatePricingCalculator(inputs) {
  return geminiChat(
`${psychProfileBlock(inputs)}
Build a complete pricing strategy for:

Business: ${inputs.businessName}
Product/Service: ${inputs.product}
Industry: ${inputs.industry}
Monthly Operating Costs: ${inputs.monthlyCosts || 'Not specified'}
Target Profit Margin: ${inputs.targetMargin || '30%'}
Competitor Price Range: ${inputs.competitorPricing || 'Unknown'}
Market: ${inputs.market || 'MENA'}

MENA PRICING PSYCHOLOGY TO APPLY:
- Arab customers associate very low prices with low quality — price too cheap and they don't trust you
- Round numbers feel cheap — AED 499 beats AED 500 psychologically
- "Special price" and "limited time" framing works extremely well
- Family/group packages convert better than individual pricing in Arab markets
- WhatsApp negotiation is expected in many MENA industries — build this into your strategy

## Your Cost Reality
Fixed costs per month: [breakdown]
Variable costs per unit/client: [breakdown]
Minimum price to survive: [calculate]
Price to hit target margin: [calculate]

## Recommended Pricing Tiers
**Starter:** [Price] — for [who] — includes [what]
**Core:** [Price] — for [who] — includes [what] — THIS IS YOUR PRIMARY OFFER
**Premium:** [Price] — for [who] — includes [what]

## Pricing Psychology Tactics
(5 specific tactics for the MENA market with exact implementation)

## Revenue Projections
If you sign X clients at Y price = Z revenue (3 scenarios: conservative, realistic, optimistic)

## When to Raise Prices
(Specific signals that tell you the market will accept higher prices)

## The One Pricing Mistake to Avoid
(The most common pricing error in your specific industry in MENA)`,
    `${MASTER_IDENTITY}\n\nYou are a pricing strategist who deeply understands Arab market psychology, price anchoring in MENA, and the balance between appearing premium and accessible.`,
    { language: inputs.language }
  );
}

// ── LAUNCH ROADMAP ────────────────────────────────────────────────────────
async function generateLaunchRoadmap(inputs) {
  return geminiChat(
`${psychProfileBlock(inputs)}
Create a hyper-specific 30-Day Launch Roadmap for:

Business: ${inputs.businessName}
Industry: ${inputs.industry}
Budget: ${inputs.budget || 'Under $1,000'}
Team: ${inputs.teamSize || 'Solo founder'}
Current Status: ${inputs.currentStatus || 'Idea stage'}
Goal: ${inputs.goal || 'First paying customer'}

This is not a theory exercise. This person needs to launch NEXT WEEK.
Every task must be:
- Doable by one person with no team
- Within the stated budget
- Specific enough to complete in the time given (no vague "build marketing")
- Optimized for MENA platforms: WhatsApp, Instagram, LinkedIn, Bayt, local Facebook groups

## BEFORE DAY 1 — The Non-Negotiables
(3 things to have done before starting the 30 days)

## WEEK 1: Foundation (Days 1-7)
**Day 1:** [Exact task — time estimate — tool to use]
**Day 2:** [Exact task]
**Day 3:** [Exact task]
**Day 4:** [Exact task]
**Day 5:** [Exact task]
**Day 6:** [Exact task — even weekends count]
**Day 7:** [Review + plan adjustment]
Week 1 Goal: [Specific measurable milestone]

## WEEK 2: Build & Test (Days 8-14)
[Same format — each day specific]
Week 2 Goal: [Specific measurable milestone]

## WEEK 3: Launch (Days 15-21)
[Same format — this is when they go live]
Week 3 Goal: [First revenue or first customer]

## WEEK 4: Learn & Double Down (Days 22-30)
[Same format — optimize what's working]
Week 4 Goal: [Specific measurable milestone]

## Budget Allocation
[Exact breakdown of where every dirham/dollar goes]

## The One Thing That Will Determine Success
[The single most important focus for this specific business launch]`,
    `${MASTER_IDENTITY}\n\nYou are a startup launch coach who has guided hundreds of MENA founders through their first 30 days. You know the platforms, the shortcuts, and the mistakes. You give real tasks, not inspirational advice.`,
    { language: inputs.language }
  );
}

// ── CONTRACT ──────────────────────────────────────────────────────────────
async function generateContract(inputs) {
  return geminiChat(
`${psychProfileBlock(inputs)}
Generate a professional ${inputs.contractType || 'Service Agreement'} for a MENA business context:

Party A (Provider): ${inputs.partyA || '[YOUR COMPANY NAME]'}
Party B (Client): ${inputs.partyB || '[CLIENT NAME]'}
Service/Work: ${inputs.service}
Payment Terms: ${inputs.payment || 'As agreed between parties'}
Duration: ${inputs.duration || 'Project-based'}
Jurisdiction: ${inputs.jurisdiction || 'UAE / MENA'}
Special Conditions: ${inputs.specialTerms || 'None'}

Create a complete, professional contract that:
- Works in the MENA legal environment (add note about local legal review)
- Is written in clear language — not overly legalistic so both parties understand
- Protects the service provider without alienating the client
- Includes specific clauses for late payment (common issue in MENA business culture)
- Has a clear scope to prevent scope creep

[CONTRACT HEADER — Full title and date placeholder]

## PARTIES
[Full legal party descriptions]

## SCOPE OF WORK
[Detailed description with specific deliverables and excluded work]

## TIMELINE & MILESTONES
[Specific dates and deliverables]

## PAYMENT TERMS
[Amounts, schedule, late payment fees — be specific]

## REVISION POLICY
[Number of revisions included and additional revision pricing]

## INTELLECTUAL PROPERTY
[Who owns what after completion]

## CONFIDENTIALITY
[What stays private]

## TERMINATION
[How either party can exit and what happens to payment]

## DISPUTE RESOLUTION
[Process — including amicable resolution first, then formal process]

## GOVERNING LAW
[Jurisdiction — ${inputs.jurisdiction || 'UAE'}]

## SIGNATURES
[Signature blocks for both parties]

---
⚠️ IMPORTANT: This is a template. Have a licensed legal professional in ${inputs.jurisdiction || 'your country'} review before signing.`,
    `${MASTER_IDENTITY}\n\nYou are a business attorney specializing in MENA commercial contracts. You write documents that protect small businesses while remaining practical and enforceable in Arab legal systems.`,
    { language: inputs.language }
  );
}

// ── BUDGET ESTIMATOR ──────────────────────────────────────────────────────
async function generateBudgetEstimator(inputs) {
  const country = inputs.location || 'MENA';
  const currency = getCurrency(country);
  return geminiChat(
`${psychProfileBlock(inputs)}
Create a realistic 6-Month Startup Budget for:

Business Type: ${inputs.businessType}
Industry: ${inputs.industry}
Location: ${country}
Currency: ${currency}
Team: ${inputs.teamSize || 'Solo founder'}
Revenue Model: ${inputs.revenueModel || 'Service-based'}
Target Revenue by Month 6: ${inputs.targetRevenue || 'Not specified'}

REALISM REQUIREMENT: Most first-time MENA founders underestimate costs by 40% and overestimate revenue by 60%. Your job is to give them the REAL numbers — not what they want to hear, but what will actually keep them alive financially.

## One-Time Startup Costs (${currency})
[Itemized list with REAL cost ranges for ${country} — licensing, equipment, branding, website, etc.]
TOTAL ONE-TIME: [Amount]

## Monthly Fixed Costs (${currency})
[Itemized: rent if applicable, software, insurance, phone, etc. — REAL ${country} prices]
TOTAL MONTHLY FIXED: [Amount]

## Monthly Variable Costs (${currency})
[Marketing, cost of goods, freelancers, etc.]
TOTAL MONTHLY VARIABLE: [Amount]

## 6-Month Cash Flow Table (${currency})
| Month | Revenue | Fixed | Variable | Net | Cumulative |
|-------|---------|-------|----------|-----|-----------|
| 1 | | | | | |
[Fill all 6 months — be realistic about Month 1-2 being near zero revenue]

## Capital Required
Minimum to launch: [Amount in ${currency}]
Recommended (3-month runway): [Amount in ${currency}]

## Funding Options for ${country}
[3-5 specific funding sources available in ${country} — grants, loans, investors]

## Cash Flow Warning Signs
(3 specific signals that their business is in financial danger)

## The Honest Truth
[One paragraph — the reality check they need to hear about their specific business model in ${country}]`,
    `${MASTER_IDENTITY}\n\nYou are a startup CFO who has managed finances for MENA founders. You know the real costs in Dubai, Riyadh, Cairo, and Amman. You give honest numbers, not comfortable ones.`,
    { language: inputs.language }
  );
}

// ── PITCH DECK ────────────────────────────────────────────────────────────
async function generatePitchDeck(inputs) {
  return geminiChat(
`${psychProfileBlock(inputs)}
Create a complete Investor Pitch Deck script for:

Business: ${inputs.businessName}
Industry: ${inputs.industry}
The Problem: ${inputs.problem}
Our Solution: ${inputs.solution}
Traction So Far: ${inputs.traction || 'Early stage — no revenue yet'}
Funding Ask: ${inputs.fundingAsk || 'Not yet determined'}
Use of Funds: ${inputs.useOfFunds || 'Not yet determined'}

MENA INVESTOR PSYCHOLOGY:
- MENA investors (angels, family offices, VCs) want to know: Can I trust this founder?
- They invest in people first, ideas second — especially in early stages
- They want to see market size in MENA/GCC specifically, not just global numbers
- They respect founders who are honest about what they don't know yet
- Islamic finance considerations may be relevant for some investors

Build a 13-slide deck that would make a UAE/Saudi/Egyptian angel investor lean forward:

## Slide 1: Cover
Title, tagline, founder name, contact — keep it clean and confident

## Slide 2: The Hook
One sentence that makes them say "wait, tell me more" — the problem in human terms

## Slide 3: The Problem (with real data)
How big is this pain? Who feels it? What does it cost them? MENA data preferred.

## Slide 4: Our Solution
Show, don't just tell. What does the customer experience?

## Slide 5: Market Size
TAM / SAM / SOM — realistic numbers with sources, MENA-focused

## Slide 6: Product / Demo
What have you actually built? Screenshots, mockups, or description.

## Slide 7: Business Model
How do you make money? Be specific with pricing.

## Slide 8: Traction & Validation
What proof do you have? Customers, pilots, LOIs, revenue, users — anything real.

## Slide 9: Go-To-Market Strategy
First 90 days — specific, real, achievable

## Slide 10: Competition
Honest competitive landscape — investors hate founders who say "we have no competition"

## Slide 11: Team
Why are YOU the right people? What's the unfair advantage of this founding team?

## Slide 12: Financial Projections
3-year table — conservative and realistic. Explain key assumptions.

## Slide 13: The Ask
Exact amount, valuation (or not), what you'll achieve with this funding, timeline to next raise

---
For each slide: [HEADLINE] | Key bullets | Speaker note | What the investor is thinking`,
    `${MASTER_IDENTITY}\n\nYou are a pitch coach who has prepared MENA founders to raise from Gulf family offices, regional VCs (STV, Wamda, Flat6Labs, Beco Capital), and international investors. You know what MENA investors actually care about.`,
    { language: inputs.language }
  );
}

// ── AD COPY ───────────────────────────────────────────────────────────────
async function generateAdCopy(inputs) {
  return geminiChat(
`${psychProfileBlock(inputs)}
Write high-converting ad copy for a MENA audience:

Business: ${inputs.businessName}
Product/Service: ${inputs.product}
Target Audience: ${inputs.targetAudience}
Key Benefit: ${inputs.keyBenefit}
Campaign Goal: ${inputs.goal || 'Lead generation'}
Market: MENA / Arab World

MENA ADVERTISING PSYCHOLOGY:
- Arabic-language ads outperform English by 40%+ in most MENA markets
- Social proof (reviews, testimonials, numbers) converts heavily in trust-based Arab cultures
- Urgency and scarcity work — but must feel authentic, not pushy
- "Free" and "trial" offers convert extremely well for first purchase
- WhatsApp CTA outperforms website clicks in most MENA markets
- Family-oriented messaging resonates across all demographics

## INSTAGRAM / FACEBOOK ADS (Arabic)
Ad 1 — Awareness:
[Arabic caption] | English translation | Hook: first line that stops the scroll | CTA

Ad 2 — Consideration:
[Arabic caption] | English translation | Social proof angle | CTA

Ad 3 — Conversion:
[Arabic caption] | English translation | Urgency/offer angle | CTA

## INSTAGRAM / FACEBOOK ADS (English — for expat/international)
[3 ads in English with same structure]

## TIKTOK / REELS SCRIPT (30 seconds)
Hook (0-3 sec): [Exact line to say]
Problem (3-10 sec): [Relatable pain point]
Solution (10-20 sec): [Your product demonstrated]
Proof (20-25 sec): [Social proof line]
CTA (25-30 sec): [Exact call to action]
[3 script variations]

## WHATSAPP BROADCAST MESSAGE
(The most powerful channel in MENA — write one that feels personal, not corporate)

## GOOGLE SEARCH ADS
[3 complete ads: Headline 1/2/3 + Description 1/2]

## AUDIENCE TARGETING
[Exact targeting for each platform in MENA context]

## AD TESTING PLAN
[How to A/B test with limited budget — MENA market best practices]`,
    `${MASTER_IDENTITY}\n\nYou are a performance marketing expert who has run campaigns across UAE, Saudi Arabia, Egypt, and Jordan. You understand that Arabic copy outperforms English in most MENA campaigns and that WhatsApp is the most powerful channel most brands ignore.`,
    { language: inputs.language }
  );
}

// ── SEO KEYWORDS ──────────────────────────────────────────────────────────
async function generateSeoKeywords(inputs) {
  const isAr = inputs.language === 'ar';
  return geminiChat(
`${psychProfileBlock(inputs)}
Create a complete SEO strategy for a MENA business:

Business: ${inputs.businessName}
Industry: ${inputs.industry}
Website: ${inputs.website || 'New website — starting from zero'}
Location: ${inputs.location || 'UAE / MENA'}
Known Competitors: ${inputs.competitors || 'None identified yet'}
${isAr ? 'OUTPUT LANGUAGE: ARABIC — write the entire SEO strategy in Arabic, including all section headers. Keep the brand name and English keywords in Latin script when applicable.' : 'OUTPUT LANGUAGE: English'}

MENA SEO REALITY:
- Arabic search volume is MASSIVELY underserved — ranking in Arabic is 10x easier than English
- Local SEO (Google Business Profile) drives 60%+ of leads for service businesses in MENA
- ".ae", ".sa" country domains often outperform .com in local search
- Voice search in Arabic is growing rapidly — optimize for conversational queries

## Arabic Keywords (HIGH PRIORITY — your competitive advantage)
[20 Arabic keywords your competitors are ignoring — with search volume estimates and content ideas]

## English Keywords — Primary (Commercial Intent)
[10 keywords — people ready to buy — with monthly search volume and difficulty]

## English Keywords — Secondary (Research Intent)
[15 keywords — people learning — for blog content]

## Long-Tail Keywords (Quick Wins)
[25 specific phrases — low competition, real buyers]

## Local SEO Strategy for ${inputs.location || 'MENA'}
[Google Business Profile setup, local citations, neighborhood keywords]

## Content Cluster Map
[5 pillar pages + 5 supporting articles per pillar — 30 pieces of content mapped]

## Technical SEO Priorities
[Top 5 technical issues most MENA business websites have — check these first]

## 90-Day SEO Roadmap
Month 1: [Specific tasks]
Month 2: [Specific tasks]
Month 3: [Specific tasks — and what results to expect]`,
    `${MASTER_IDENTITY}\n\nYou are an SEO strategist who has ranked MENA businesses in Arabic and English. You know that Arabic SEO is an untapped goldmine that most businesses ignore. ${isAr ? 'You write fluently in modern Arabic.' : ''}`,
    { language: inputs.language }
  );
}

// ── COLD EMAIL ────────────────────────────────────────────────────────────
async function generateColdEmail(inputs) {
  return geminiChat(
`${psychProfileBlock(inputs)}
Write a complete cold outreach system for:

Sender: ${inputs.senderBusiness}
Target Prospect: ${inputs.targetProspect}
Industry: ${inputs.industry}
Goal: ${inputs.goal || 'Book a 20-minute discovery call'}
Value Proposition: ${inputs.valueProp}
Tone: ${inputs.tone || 'Professional but warm — like a respected colleague'}

MENA B2B OUTREACH PSYCHOLOGY:
- Decision makers in Arab businesses respond to referrals and trusted connections above all
- Cold email works best when it feels like a warm introduction, not a pitch
- Mention any mutual connections, shared background, or cultural common ground
- Gulf executives respond well to exclusivity ("I'm only reaching out to 5 companies in Dubai")
- Patience is key — follow up without being pushy. MENA business relationships take time.
- WhatsApp follow-up after email is standard and accepted in MENA B2B

## Email 1 — Initial Outreach (Day 1)
Subject line options (x3):
Full email: [Write it — under 150 words — personal, specific, no pitch in email 1]
Why this works: [One sentence explanation]

## Email 2 — The Value Add (Day 4)
Subject line options (x3):
Full email: [Share something genuinely useful — article, insight, stat — then soft ask]

## Email 3 — The Social Proof (Day 10)
Subject line options (x3):
Full email: [Mention result, case study, or relevant client — then direct ask]

## Email 4 — The Direct Ask (Day 17)
Subject line options (x3):
Full email: [Clear, confident, respectful — the real ask]

## Email 5 — The Goodbye (Day 25)
Subject line options (x3):
Full email: [Graceful, leaves door open — many MENA deals happen 6 months later]

## LinkedIn Connection Note (300 chars):
[Personal, not salesy]

## WhatsApp First Message (After they accept LinkedIn):
[Warm, short, respectful — references LinkedIn connection]

## Phone Call Opening Script:
[First 30 seconds — what to say before they can say "I'm busy"]

## Top 7 Objections + Exact Responses:
[MENA-specific objections with culturally appropriate responses]`,
    `${MASTER_IDENTITY}\n\nYou are a B2B sales expert who has closed deals with Gulf corporates, Egyptian SMEs, and Levant businesses. You understand relationship-first sales culture in Arab markets.`,
    { language: inputs.language }
  );
}

// ── WEBSITE CREATION — TEMPLATE-BASED ────────────────────────────────────
// Loads a ready-made HTML template from /website-templates/ and has Gemini
// intelligently edit it based on user inputs. No more 20-second timeouts.
// If Gemini fails, a deterministic find-replace fallback runs so the user
// ALWAYS gets a working website.
const fs = require('fs');
const path = require('path');

const TEMPLATE_MAP = {
  // Maps the dropdown values from the frontend form to template file names
  'Business / Company':   'business.html',
  'Portfolio / Personal': 'portfolio.html',
  'Restaurant / Cafe':    'restaurant.html',
  'E-Commerce / Store':   'ecommerce.html',
  // Aliases / fallbacks — these all map to business.html until you provide more templates
  'Startup / SaaS':       'business.html',
  'Gym / Fitness':        'business.html',
  'Real Estate':          'business.html',
  'Medical / Clinic':     'business.html',
};

function loadTemplate(websiteType) {
  const filename = TEMPLATE_MAP[websiteType] || 'business.html';
  const filepath = path.join(__dirname, '..', 'website-templates', filename);
  if (!fs.existsSync(filepath)) {
    // Fallback to business.html if the requested template doesn't exist yet
    const fallback = path.join(__dirname, '..', 'website-templates', 'business.html');
    if (!fs.existsSync(fallback)) {
      throw new Error(`No website templates found. Add HTML files to /website-templates/ (at minimum: business.html).`);
    }
    return fs.readFileSync(fallback, 'utf8');
  }
  return fs.readFileSync(filepath, 'utf8');
}

// Deterministic fallback editor — runs if Gemini fails or returns garbage.
// Does basic find-replace using common naming patterns. ALWAYS produces a
// working website even when AI is down.
function applyFallbackEdits(template, inputs) {
  let html = template;
  const name = inputs.businessName || 'Your Business';

  // Replace bracketed placeholders like {{BRAND_NAME}} or [BRAND_NAME] if present
  html = html
    .replace(/\{\{\s*BRAND_NAME\s*\}\}/g, name)
    .replace(/\{\{\s*PROJECT_NAME\s*\}\}/g, name)
    .replace(/\{\{\s*COMPANY_NAME\s*\}\}/g, name)
    .replace(/\[BRAND_NAME\]/g, name)
    .replace(/\[BUSINESS_NAME\]/g, name);

  // Color palette swap — read user's selection and map to CSS variable changes
  const colorSchemes = {
    'Dark & Gold (Luxury)':     { primary: '#f59e0b', accent: '#d97706', bg: '#0a0a0f', text: '#fefce8' },
    'Light & Clean (Minimal)':  { primary: '#1f2937', accent: '#3b82f6', bg: '#ffffff', text: '#1f2937' },
    'Dark & Blue (Tech)':       { primary: '#3b82f6', accent: '#06b6d4', bg: '#0f172a', text: '#f1f5f9' },
    'White & Green (Health)':   { primary: '#10b981', accent: '#059669', bg: '#f9fafb', text: '#064e3b' },
    'Dark & Purple (Creative)': { primary: '#a855f7', accent: '#ec4899', bg: '#1a0a2e', text: '#fae8ff' },
  };
  const scheme = colorSchemes[inputs.colors] || colorSchemes['Dark & Gold (Luxury)'];
  // Replace common CSS variable patterns
  html = html
    .replace(/\{\{\s*PRIMARY_COLOR\s*\}\}/g, scheme.primary)
    .replace(/\{\{\s*ACCENT_COLOR\s*\}\}/g, scheme.accent)
    .replace(/\{\{\s*BG_COLOR\s*\}\}/g, scheme.bg)
    .replace(/\{\{\s*TEXT_COLOR\s*\}\}/g, scheme.text);

  return html;
}

async function generateWebsiteCreation(inputs) {
  // 1. Load the template the user picked
  const template = loadTemplate(inputs.content || 'Business / Company');

  const isAr = inputs.language === 'ar';

  // 2. Build a focused prompt asking Gemini to edit the template — NOT write from scratch.
  //    This is dramatically faster and more reliable than full generation.
  const editPrompt = `You are editing an existing HTML website template. DO NOT rewrite it from scratch.
Make ONLY targeted edits so it represents this real business:

═══ THE BUSINESS ═══
Brand name: ${inputs.businessName || 'Untitled Brand'}
Website type: ${inputs.content || 'Business'}
Sections requested: ${inputs.sections || 'Full'}
Color style: ${inputs.colors || 'Dark & Gold (Luxury)'}
Font style: ${inputs.fonts || 'Modern Sans-Serif'}
Interactive features: ${inputs.interactive || 'Smooth scroll'}
Extra requirements from user: ${inputs.extraDetails || 'None'}
Output language: ${isAr ? 'ARABIC — replace ALL text content with Arabic. Set <html lang="ar" dir="rtl">.' : 'English'}

═══ WHAT TO EDIT ═══
1. Replace every occurrence of the placeholder brand name in the template with: ${inputs.businessName || 'Untitled Brand'}
2. Rewrite headline, tagline, hero text, section titles, and body copy to fit THIS specific business (${inputs.content})
3. Update CSS color variables in :root or :host to match "${inputs.colors}"
4. Update font-family declarations to match "${inputs.fonts}" — pick an appropriate Google Font and update the <link> tag
5. ${isAr ? 'Translate ALL visible text to Arabic. Add dir="rtl" to <html>. Flip layout where natural.' : 'Keep English.'}
6. If "Extra requirements" mentions specific features (Arabic support, pricing table, dark mode, etc.), incorporate them
7. Keep the overall structure, sections, and design INTACT — do not remove or rearrange sections

═══ CRITICAL OUTPUT RULES ═══
- Return ONLY the edited HTML starting with <!DOCTYPE html>
- NO markdown fences (no \`\`\`html, no \`\`\`)
- NO explanation text before or after
- Preserve ALL CSS, all JavaScript, all structure from the template
- The output must be a complete valid HTML file ready to download

═══ THE TEMPLATE TO EDIT ═══
${template}

End your output with </html>. Nothing else after.`;

  try {
    const raw = await openaiChat(
      editPrompt,
      `You are an expert web developer who edits HTML templates to match specific brands. You output ONLY clean HTML — no markdown, no chatter. Preserve structure, edit content.`,
      { temperature: 0.5, topP: 0.95, language: inputs.language }
    );

    // 3. Clean the output — strip markdown fences, find <!DOCTYPE>, etc.
    let html = String(raw || '').trim();
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    const docMatch = html.match(/<!DOCTYPE\s+html[\s\S]*<\/html>/i);
    if (docMatch) {
      html = docMatch[0];
    } else {
      const htmlMatch = html.match(/<html[\s\S]*<\/html>/i);
      if (htmlMatch) html = '<!DOCTYPE html>\n' + htmlMatch[0];
    }

    // 4. Sanity check — must be at least 80% of original template length
    //    (Gemini sometimes truncates if context window is tight)
    if (html.length < template.length * 0.5) {
      console.warn('Openai output truncated, using fallback');
      return applyFallbackEdits(template, inputs);
    }

    return html;
  } catch (err) {
    console.error('Website AI edit failed, falling back to deterministic replace:', err.message);
    // Even if AI completely fails, user gets a working personalized site
    return applyFallbackEdits(template, inputs);
  }
}

// ── SALES SCRIPT ──────────────────────────────────────────────────────────
async function generateSalesScript(inputs) {
  return geminiChat(
`${psychProfileBlock(inputs)}
Create a complete sales script for:

Business: ${inputs.businessName}
Product/Service: ${inputs.product}
Price Point: ${inputs.price || 'Not specified'}
Sales Channel: ${inputs.channel || 'WhatsApp / Phone call'}
Target Client: ${inputs.targetClient}
Common Objections: ${inputs.objections || 'Price, timing, trust'}

MENA SALES CULTURE:
- Trust must be established BEFORE the pitch — ask about them first
- Price objections in Arab markets are often a negotiation signal, not a real no
- "I'll think about it" = "help me feel more confident" — address the real concern
- Referrals close faster than anything — always ask "who else do you know?"
- Decision often involves family or business partner — plan for this
- WhatsApp is the primary close channel in many MENA markets

## Pre-Call Preparation (5 minutes before every call)
[Research checklist + mindset preparation]

## The Opening (First 90 seconds)
[Word-for-word — warm, confident, not salesy. Builds immediate rapport.]

## Discovery Questions (Listen 80%, talk 20%)
[15 questions that make them feel understood — ordered from safe to deep]

## The Pivot to Your Solution
[Transition from discovery to pitch — using their own words]

## The Pitch (Tailored, not scripted)
[Framework to present based on what they revealed — not a memorized speech]

## Handling the Top 10 Objections
"Too expensive" → [MENA-specific response]
"I need to think about it" → [response]
"I need to ask my partner/family" → [response]
"I already have someone who does this" → [response]
"I'll come back to you later" → [response]
[+5 more relevant objections]

## The 5 Closes (choose based on buyer type)
1. The Direct Close
2. The Choice Close
3. The Urgency Close (authentic, not fake)
4. The Summary Close
5. The WhatsApp Close (most effective in MENA)

## Post-Sale (The most underrated part)
[First message after they say yes — sets tone for entire relationship]

## Referral Ask Script
[How to ask every client for a referral — timing and exact words]`,
    `${MASTER_IDENTITY}\n\nYou are a sales trainer who has coached teams in Dubai, Riyadh, and Cairo. You understand that sales in Arab culture is relationship management, not pressure tactics.`,
    { language: inputs.language }
  );
}

// ── MARKET RESEARCH ───────────────────────────────────────────────────────
async function generateMarketResearch(inputs) {
  return geminiChat(
`${psychProfileBlock(inputs)}
Conduct professional market research for:

Industry/Niche: ${inputs.niche}
Region: ${inputs.region || 'MENA / Arab World'}
Target Demographics: ${inputs.demographics || 'General population'}
Research Focus: ${inputs.focus || 'Full market analysis'}
Business Budget Context: ${inputs.budget || 'Early stage'}

This research is for a real founder making real decisions. Give them intelligence they can act on — not a Wikipedia summary.

## Executive Market Intelligence
(The 3 most important things to know about this market RIGHT NOW — in 3 bullets)

## Market Size & Growth
- Current market size in ${inputs.region || 'MENA'} (realistic estimate with source)
- Growth rate and direction
- Where is growth coming from specifically?

## The Real Customer (Not the demographic — the human)
- Who are they really? What does their day look like?
- What do they complain about that relates to your solution?
- Where do they spend time online? (Specific platforms in ${inputs.region || 'MENA'})
- What makes them trust a new brand?
- What makes them NOT buy?

## Competitive Landscape
- Who is winning right now and why?
- Who SHOULD be winning but isn't — and why (this is your opportunity)
- Price benchmarks in this market

## Underserved Gaps
(The specific market gaps that represent real business opportunity)

## Entry Strategy Recommendation
[The fastest, lowest-risk way to enter this market with limited capital]

## The One Number That Matters
[The single metric that best predicts success in this market]

## 30-Day Research Action Plan
[What to do in the next 30 days to validate this market with your own data]`,
    `${MASTER_IDENTITY}\n\nYou are a senior market research analyst who has studied consumer behavior across UAE, Saudi Arabia, Egypt, and the broader Arab world. You know the difference between global market reports and ground-level MENA reality.`,
    { language: inputs.language }
  );
}

async function generateMarketingStrategy(inputs) {
  return geminiChat(
`${psychProfileBlock(inputs)}
Build a complete marketing strategy for:

Business: ${inputs.businessName}
Industry: ${inputs.industry}
Target Audience: ${inputs.targetAudience}
Budget: ${inputs.budget || 'Under $500/month'}
Goals: ${inputs.goals}
Current Marketing: ${inputs.currentPresence || 'Nothing yet'}
Timeline: ${inputs.timeline || '3 months'}

MENA MARKETING REALITY:
- Instagram is dominant across all Arab markets — it's the primary discovery channel
- WhatsApp is the primary conversion channel — email barely works
- Arabic content gets 40%+ more organic reach than English in most Arab markets
- Influencer marketing at micro level ($100-500) massively outperforms paid ads
- Word of mouth (by family and friends) is the #1 growth channel in Arab markets — engineer it

## Channel Strategy (Ranked by ROI for this business in MENA)
1st Priority: [Channel + why + how to execute with this budget]
2nd Priority: [Channel]
3rd Priority: [Channel]

## 90-Day Marketing Calendar
Month 1 — Foundation: [Specific weekly tasks]
Month 2 — Growth: [Specific weekly tasks]
Month 3 — Scale: [Specific weekly tasks]

## Content Strategy
[What to post, when, in Arabic and English, with example post ideas]

## WhatsApp Business Strategy
[The most underused growth lever in MENA — how to build a broadcast list and convert]

## Budget Allocation
[Exact breakdown of every dollar/dirham across channels]

## KPIs to Track
[5 specific metrics — with realistic targets for months 1, 2, and 3]

## The Unfair Advantage
[One tactic specific to this business in MENA that competitors are not doing]`,
    `${MASTER_IDENTITY}\n\nYou are a marketing strategist who has grown MENA brands across Gulf and North Africa markets. You know that WhatsApp and Arabic content are massively undervalued and that micro-influencers in MENA outperform mega-influencers in almost every category.`,
    { language: inputs.language }
  );
}

// ── UTILITIES ─────────────────────────────────────────────────────────────
function getCurrency(country) {
  const map = {
    'UAE':'AED','Saudi Arabia':'SAR','Egypt':'EGP','Jordan':'JOD',
    'Kuwait':'KWD','Qatar':'QAR','Bahrain':'BHD','Oman':'OMR',
    'Morocco':'MAD','Tunisia':'TND','Lebanon':'USD','Iraq':'IQD',
    'USA':'USD','UK':'GBP','Europe':'EUR','Global':'USD'
  };
  for(const [key, val] of Object.entries(map)) {
    if(country && country.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 'USD';
}

// Legacy wrapper (alias for generateWebsiteCreation)
async function generateWebsiteCopy(inputs) { return generateWebsiteCreation(inputs); }

/* ══════════════════════════════════════════════════════════════════
   INPUT SANITIZATION — Prevents prompt injection + cleans user input
   Every controller passes user input through here before sending
   to Groq or Gemini. Strips control characters, limits length, and
   neutralizes the most common prompt-injection escapes.
══════════════════════════════════════════════════════════════════ */
function sanitizeInputs(inputs) {
  if (!inputs || typeof inputs !== 'object') return {};
  const out = {};
  for (const key of Object.keys(inputs)) {
    const val = inputs[key];
    if (val == null) { out[key] = val; continue; }
    if (typeof val === 'string') {
      let s = val
        // Remove zero-width and control chars
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\uFEFF]/g, ' ')
        // Neutralize known injection markers (all variants)
        .replace(/\[\/?INST\]/gi, '')
        .replace(/<\|\/?(?:system|user|assistant|im_start|im_end)\|>/gi, '')
        .replace(/```\s*(?:system|assistant|user)\b/gi, '')
        // Collapse repeated whitespace
        .replace(/\s+/g, ' ')
        .trim();
      // Hard cap per-field length to prevent abuse
      if (s.length > 4000) s = s.slice(0, 4000);
      out[key] = s;
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      out[key] = val;
    } else if (Array.isArray(val)) {
      out[key] = val.slice(0, 50).map(v => typeof v === 'string' ? v.slice(0, 500) : v);
    } else {
      // For objects, shallow-clone with the same rules
      out[key] = val;
    }
  }
  return out;
}

module.exports = {
  chat, streamChat, sanitizeInputs,
  generateBrandKit, generateBusinessPlan, generateCompetitorMatrix,
  generatePricingCalculator, generateLaunchRoadmap, generateContract,
  generateBudgetEstimator, generatePitchDeck, generateAdCopy,
  generateSeoKeywords, generateColdEmail, generateWebsiteCreation,
  generateWebsiteCopy, generateSalesScript,
  generateMarketResearch, generateMarketingStrategy,
  // Legacy
  generateBusinessName: (i) => geminiChat(`Generate 10 creative business names for: Industry: ${i.industry}, Description: ${i.description}, Style: ${i.style||'Modern'}, Market: ${i.targetMarket||'MENA'}. For each: name, domain note, tagline, why it works.`, MASTER_IDENTITY),
  generateSlogan: (i) => geminiChat(`Generate 15 slogans for ${i.businessName} in ${i.industry}. Core value: ${i.coreValue}. Tone: ${i.tone}. Give 5 in Arabic, 10 in English. For each: the slogan + why it works for MENA market.`, MASTER_IDENTITY),
  generateMarketStudy: (i) => generateMarketResearch(i),
  generateContentCalendar: (i) => geminiChat(`Create a 30-day social media content calendar for ${i.businessName} in ${i.industry}. Platforms: ${i.platforms||'Instagram, WhatsApp'}. Brand voice: ${i.brandVoice||'Professional and warm'}. Include Arabic post ideas. For each day: platform, content type, full caption in Arabic AND English, hashtags, posting time.`, MASTER_IDENTITY),
};
