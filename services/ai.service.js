const Groq = require('groq-sdk');
const { geminiChat } = require('./gemini.service');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// ── Core chat function (Groq — used ONLY for AI Advisor chat) ──────────────
async function chat(messages, systemPrompt) {
  const sysMsg = systemPrompt || 'You are Double Eight AI, an expert business advisor. Be detailed, professional, and actionable. Use markdown formatting.';
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'system', content: sysMsg }, ...messages],
    temperature: 0.7,
    max_tokens: 4096,
    stream: false
  });
  return response.choices[0]?.message?.content || '';
}

async function streamChat(messages, type, onChunk) {
  const SYS = {
    chat: 'You are Double Eight AI, an expert AI business advisor. Be detailed, professional, and actionable. Use markdown formatting.',
    generator: 'You are a professional business plan writer. Create comprehensive, investor-ready business documents.',
    marketResearch: 'You are a senior market research analyst. Provide deep, data-driven market insights.',
    marketing: 'You are an expert marketing strategist. Create specific, actionable marketing plans.'
  };
  const stream = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'system', content: SYS[type] || SYS.chat }, ...messages],
    temperature: 0.7, max_tokens: 4096, stream: true
  });
  let full = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if (delta) { full += delta; if (onChunk) onChunk(delta); }
  }
  return full;
}

// ── BRAND & IDENTITY ────────────────────────────────────────────────────────
async function generateBrandKit(inputs) {
  return geminiChat(`Create a complete Brand Kit for:
Business: ${inputs.businessName}
Industry: ${inputs.industry}
Values: ${inputs.values || 'Innovation, Trust, Quality'}
Target Audience: ${inputs.targetAudience || 'General'}
Style Preference: ${inputs.style || 'Modern & Professional'}

Provide:
## Brand Identity Overview
## Logo Concept & SVG Description
(Describe a simple, professional SVG logo with exact colors and shapes)
## Color Palette
(Primary, Secondary, Accent, Neutral — with exact HEX codes and usage rules)
## Typography System
(Heading font, Body font, Accent font — with sizes and weights)
## Brand Voice & Tone
(3-5 adjectives, do's and don'ts)
## Brand Messaging
(Mission statement, vision, 3 key brand pillars)
## Usage Guidelines
(How to use logo, colors, fonts consistently)

Be very specific with HEX codes, font names, and visual descriptions.`, 'You are a world-class brand identity designer and strategist. Create detailed, professional brand systems.');
}

async function generateBusinessName(inputs) {
  return geminiChat(`Generate business names for:
Industry: ${inputs.industry}
Description: ${inputs.description}
Style: ${inputs.style || 'Modern, memorable, unique'}
Target Market: ${inputs.targetMarket || 'Global'}

Provide:
## Top 10 Business Name Suggestions
For each name provide:
- The name
- Why it works (1 sentence)
- Domain availability check note (.com recommendation)
- Tagline suggestion
- Brand personality it conveys

## Recommended Top Choice
(Detailed explanation of the best option)

## Naming Tips
(3 specific tips for this industry)`, 'You are a professional naming consultant and brand strategist. Generate creative, memorable, market-ready business names.');
}

async function generateSlogan(inputs) {
  return geminiChat(`Create slogans/taglines for:
Business: ${inputs.businessName}
Industry: ${inputs.industry}
Core Value: ${inputs.coreValue || 'Excellence and Innovation'}
Target Audience: ${inputs.targetAudience || 'General'}
Tone: ${inputs.tone || 'Professional'}

Provide:
## 15 Slogan Options
(Grouped by style: Bold, Emotional, Functional, Creative, Premium)
For each: the slogan + 1 sentence on why it works

## Top 3 Recommended
(With detailed rationale for each)

## Slogan Testing Framework
(How to A/B test these with real customers)`, 'You are an award-winning copywriter specializing in brand slogans and taglines.');
}

// ── PLANNING & STRATEGY ─────────────────────────────────────────────────────
async function generateBusinessPlan(inputs) {
  return geminiChat(`Generate a comprehensive, bank-ready business plan:

Business Name: ${inputs.businessName}
Industry: ${inputs.industry}
Business Model: ${inputs.businessModel}
Target Market: ${inputs.targetMarket}
Initial Investment: ${inputs.investment || 'Not specified'}
Goals: ${inputs.goals}
Location: ${inputs.location || 'Online/Remote'}

## 1. Executive Summary
## 2. Company Description & Mission
## 3. Market Analysis (with market size data)
## 4. Products & Services (with pricing)
## 5. Marketing & Sales Strategy
## 6. Operations Plan
## 7. Management Team Structure
## 8. Financial Projections (3-year P&L table)
## 9. Funding Requirements
## 10. Risk Analysis & Mitigation
## 11. 12-Month Implementation Timeline
## 12. Exit Strategy

Make every section detailed, specific, and investor-ready.`, 'You are a senior business plan writer with 20 years experience creating plans for banks, investors, and accelerators.');
}

async function generateCompetitorMatrix(inputs) {
  return geminiChat(`Create a comprehensive Competitor Analysis Matrix for:
Business: ${inputs.businessName || 'My Business'}
Industry: ${inputs.industry}
My Unique Angle: ${inputs.uniqueAngle || 'Not specified'}
Region: ${inputs.region || 'Global'}

Provide:
## Market Landscape Overview
## Top 5-8 Competitors (detailed profiles)
For each competitor:
- Company name, founded, funding
- Target market
- Pricing model
- Key strengths
- Key weaknesses
- Market share estimate

## Competitive Matrix Table
(Feature comparison across all competitors)

## Gap Analysis
(Opportunities they are ALL missing)

## Your Strategic Positioning
(Exactly where to position to win)

## Battle Plan
(5 specific strategies to beat each competitor)`, 'You are a competitive intelligence analyst. Provide deep, actionable competitor analysis.');
}

async function generatePricingCalculator(inputs) {
  return geminiChat(`Build a complete Pricing & Monetization Strategy for:
Business: ${inputs.businessName}
Product/Service: ${inputs.product}
Industry: ${inputs.industry}
Monthly Costs: ${inputs.monthlyCosts || 'Not specified'}
Target Profit Margin: ${inputs.targetMargin || '30%'}
Competitors Price Range: ${inputs.competitorPricing || 'Unknown'}

Provide:
## Cost Structure Breakdown
## Pricing Models Analysis
(One-time, subscription, freemium, tiered, usage-based)

## Recommended Pricing Tiers
(Specific prices with rationale for each tier)

## Price Psychology Tips
(How to present pricing to maximize conversions)

## Revenue Projections
(Monthly revenue at different sales volumes)

## Break-Even Analysis
(Exact units/clients needed to break even)

## Pricing Increase Roadmap
(When and how to raise prices)`, 'You are a pricing strategist and financial consultant. Create precise, profitable pricing strategies.');
}

async function generateLaunchRoadmap(inputs) {
  return geminiChat(`Create a detailed 30-Day Launch Roadmap for:
Business: ${inputs.businessName}
Industry: ${inputs.industry}
Budget: ${inputs.budget || 'Under $1,000'}
Team Size: ${inputs.teamSize || 'Solo founder'}
Current Status: ${inputs.currentStatus || 'Idea stage'}
Goal: ${inputs.goal || 'Launch and get first customers'}

Provide:
## Pre-Launch Checklist (Before Day 1)
## Week 1 (Days 1-7): Foundation
(Daily tasks, goals, deliverables)
## Week 2 (Days 8-14): Build
(Daily tasks, goals, deliverables)
## Week 3 (Days 15-21): Launch
(Daily tasks, goals, deliverables)
## Week 4 (Days 22-30): Growth
(Daily tasks, goals, deliverables)
## Key Milestones & Success Metrics
## Budget Allocation by Week
## Emergency Pivot Plan
(What to do if things don't go as planned)

Be extremely specific — real tasks, real tools, real actions every single day.`, 'You are a startup launch specialist. Create actionable, day-by-day launch plans.');
}

// ── LEGAL & ADMIN ───────────────────────────────────────────────────────────
async function generateContract(inputs) {
  return geminiChat(`Generate a professional ${inputs.contractType || 'Service Agreement'} for:
Party A (Provider): ${inputs.partyA || '[COMPANY NAME]'}
Party B (Client): ${inputs.partyB || '[CLIENT NAME]'}
Service/Product: ${inputs.service}
Value/Payment: ${inputs.payment || 'As agreed'}
Duration: ${inputs.duration || 'Project-based'}
Jurisdiction: ${inputs.jurisdiction || 'General / International'}
Special Terms: ${inputs.specialTerms || 'None'}

Generate a complete, legally-sound document with:
## AGREEMENT HEADER
## PARTIES
## SCOPE OF WORK
## PAYMENT TERMS
## INTELLECTUAL PROPERTY
## CONFIDENTIALITY
## TERMINATION CLAUSE
## LIABILITY LIMITATIONS
## DISPUTE RESOLUTION
## GOVERNING LAW
## SIGNATURES BLOCK

Include all standard legal clauses. Add [PLACEHOLDER] where specific details need to be filled.
Note: This is a template — recommend legal review before signing.`, 'You are a business attorney specializing in commercial contracts and agreements.');
}

async function generateBudgetEstimator(inputs) {
  return geminiChat(`Create a detailed 6-Month Startup Budget for:
Business Type: ${inputs.businessType}
Industry: ${inputs.industry}
Location: ${inputs.location || 'Remote/Online'}
Team Size: ${inputs.teamSize || '1-2 people'}
Revenue Model: ${inputs.revenueModel || 'Service-based'}
Target Monthly Revenue (Month 6): ${inputs.targetRevenue || 'Not specified'}

Provide:
## One-Time Startup Costs
(Legal, equipment, setup, branding — with specific amounts)
## Monthly Fixed Costs
(Rent, software, salaries — month by month)
## Monthly Variable Costs
(Marketing, supplies, etc.)
## 6-Month Cash Flow Projection Table
(Revenue vs Expenses vs Cumulative)
## Total Capital Required
## Funding Sources Recommendation
## Cost-Cutting Tips
(5 ways to reduce burn rate)
## Financial Milestones
(When to expect profitability)`, 'You are a startup CFO and financial planning expert.');
}

async function generatePitchDeck(inputs) {
  return geminiChat(`Create a complete Investor Pitch Deck script for:
Business: ${inputs.businessName}
Industry: ${inputs.industry}
Problem Solved: ${inputs.problem}
Solution: ${inputs.solution}
Traction: ${inputs.traction || 'Pre-revenue / Early stage'}
Funding Ask: ${inputs.fundingAsk || 'Not specified'}
Use of Funds: ${inputs.useOfFunds || 'Not specified'}

Generate slide-by-slide content:
## Slide 1: Cover
## Slide 2: The Problem (with pain points)
## Slide 3: Our Solution
## Slide 4: Market Opportunity (TAM/SAM/SOM)
## Slide 5: Product Demo / How It Works
## Slide 6: Business Model
## Slide 7: Traction & Validation
## Slide 8: Go-to-Market Strategy
## Slide 9: Competitive Landscape
## Slide 10: Team
## Slide 11: Financial Projections
## Slide 12: The Ask (funding details)
## Slide 13: Contact & Close

For each slide: exact headline, 3-5 bullet points, speaker notes, and visual description.`, 'You are a Silicon Valley pitch coach who has helped companies raise over $500M.');
}

// ── MARKETING & ADVERTISING ─────────────────────────────────────────────────
async function generateAdCopy(inputs) {
  return geminiChat(`Write platform-specific ad copy for:
Business: ${inputs.businessName}
Product/Service: ${inputs.product}
Target Audience: ${inputs.targetAudience}
Key Benefit: ${inputs.keyBenefit}
Budget Level: ${inputs.budget || 'Small business'}
Goal: ${inputs.goal || 'Lead generation'}

## FACEBOOK / META ADS
(3 complete ad sets with primary text, headline, description, CTA)

## GOOGLE SEARCH ADS
(3 complete ads with headlines 1-3, descriptions 1-2, display URL)

## TIKTOK ADS
(3 video scripts with hook, body, CTA — 15-30 seconds each)

## INSTAGRAM STORIES ADS
(3 story scripts with visual direction and text overlay)

## LINKEDIN ADS (if B2B)
(2 sponsored content ads)

## AD TESTING FRAMEWORK
(How to A/B test these ads)

## AUDIENCE TARGETING GUIDE
(Exact targeting settings for each platform)`, 'You are a performance marketing expert who manages millions in ad spend. Write ads that convert.');
}

async function generateSeoKeywords(inputs) {
  return geminiChat(`Create a complete SEO Strategy & Keyword Map for:
Business: ${inputs.businessName}
Industry: ${inputs.industry}
Website: ${inputs.website || 'New website'}
Location: ${inputs.location || 'Global'}
Competitors: ${inputs.competitors || 'Unknown'}
Current Ranking: ${inputs.currentRanking || 'Not ranking'}

Provide:
## Keyword Research Strategy
## Primary Keywords (High Priority)
(10 keywords with search volume, difficulty, intent)
## Secondary Keywords (Medium Priority)
(20 keywords with data)
## Long-Tail Keywords (Low Competition)
(30 long-tail keywords to target first)
## Local SEO Keywords (if applicable)
## Content Cluster Map
(Topic clusters and pillar pages to build)
## On-Page SEO Checklist
## Technical SEO Priorities
## Link Building Strategy
## 90-Day SEO Roadmap
(Month-by-month actions)`, 'You are a senior SEO strategist. Create data-driven, actionable SEO strategies.');
}

async function generateContentCalendar(inputs) {
  return geminiChat(`Generate a 30-Day Social Media Content Calendar for:
Business: ${inputs.businessName}
Industry: ${inputs.industry}
Platforms: ${inputs.platforms || 'Instagram, LinkedIn, X (Twitter)'}
Brand Voice: ${inputs.brandVoice || 'Professional but friendly'}
Content Goals: ${inputs.goals || 'Brand awareness and engagement'}
Posting Frequency: ${inputs.frequency || 'Daily'}

Provide:
## Content Strategy Overview
## Content Pillars (5 themes to rotate)
## 30-Day Calendar
For each day provide:
- Day & Date placeholder
- Platform
- Content Type (Reel, Carousel, Story, Post, Thread)
- Caption (full draft)
- Hashtags (10-15 relevant)
- Visual Description
- Best posting time

## Engagement Templates
(10 response templates for comments/DMs)

## Monthly Performance Tracking
(What metrics to track and how)`, 'You are a social media strategist and content creator. Generate engaging, platform-optimized content.');
}

async function generateMarketStudy(inputs) {
  return geminiChat(`Conduct a comprehensive Market Study & Audience Analysis for:
Industry/Niche: ${inputs.niche}
Product/Service: ${inputs.product || 'Not specified'}
Region: ${inputs.region || 'Global'}
Budget: ${inputs.budget || 'Not specified'}

Provide:
## Executive Market Summary
## Market Size & Growth Rate
## Customer Demographics Profile
(Age, income, education, location, lifestyle)
## Customer Psychographics
(Values, interests, pain points, buying triggers)
## Consumer Behavior Analysis
## Best Channels to Reach Them
## Buying Journey Map
## Market Trends (Next 3-5 Years)
## Underserved Segments
## Product-Market Fit Score
(Assessment of how well your offer fits this market)
## Recommended Target Demographics
(Ranked by conversion potential)`, 'You are a senior market research analyst with expertise in consumer behavior.');
}

// ── SALES & COMMUNICATION ───────────────────────────────────────────────────
async function generateColdEmail(inputs) {
  return geminiChat(`Write a complete Cold Email Outreach Sequence for:
Sender Business: ${inputs.senderBusiness}
Target Prospect: ${inputs.targetProspect}
Industry: ${inputs.industry}
Goal: ${inputs.goal || 'Book a discovery call'}
Value Proposition: ${inputs.valueProp}
Tone: ${inputs.tone || 'Professional but warm'}

Provide:
## Email 1: Initial Outreach (Day 1)
(Subject line x3, full email body)
## Email 2: Follow-Up (Day 3)
(Subject line x3, full email body — reference email 1)
## Email 3: Value Add (Day 7)
(Subject line x3, share insight or resource)
## Email 4: Soft Break-Up (Day 14)
(Subject line x3, create urgency)
## Email 5: Final Touch (Day 21)
(Subject line x3, last attempt)

## LinkedIn Connection Message
(300 character limit)
## LinkedIn Follow-Up Message

## Cold Calling Script
(Opening, qualifying questions, pitch, objection handling, close)

## Objection Handling Guide
(Top 7 objections with exact responses)`, 'You are a top B2B sales expert specializing in cold outreach and pipeline generation.');
}

async function generateWebsiteCopy(inputs) {
  return geminiChat(`Write high-converting website copy for:
Business: ${inputs.businessName}
Industry: ${inputs.industry}
Primary Offer: ${inputs.offer}
Target Customer: ${inputs.targetCustomer}
Tone: ${inputs.tone || 'Professional, trustworthy, compelling'}
USP: ${inputs.usp || 'Best quality and service'}

Generate full copy for:
## HOMEPAGE
- Hero Section (Headline, Subheadline, CTA)
- Social Proof Section
- Features/Benefits Section (6 items)
- How It Works (3 steps)
- Testimonials (3 templates)
- FAQ Section (8 Q&As)
- Final CTA Section

## ABOUT US PAGE
(Story, mission, team intro, why choose us)

## SERVICES/PRODUCTS PAGE
(For each service: title, description, benefits, price placeholder, CTA)

## CONTACT PAGE
(Header copy, form fields, trust signals)

## META DESCRIPTIONS
(For each page — SEO optimized)`, 'You are a world-class direct-response copywriter. Write copy that converts visitors into customers.');
}

async function generateSalesScript(inputs) {
  return geminiChat(`Create a complete Sales Script for:
Business: ${inputs.businessName}
Product/Service: ${inputs.product}
Price Point: ${inputs.price || 'Not specified'}
Sales Channel: ${inputs.channel || 'Phone/Video call'}
Target Client: ${inputs.targetClient}
Common Objections: ${inputs.objections || 'Price, timing, trust'}

Provide:
## Pre-Call Preparation Checklist
## Opening & Rapport Building
(Word-for-word script — first 2 minutes)
## Discovery Questions
(15 qualifying questions to understand the prospect)
## Needs Analysis Framework
## The Pitch
(Full script — position the offer based on discovered needs)
## Demo/Presentation Structure
## Trial Close Questions
## Handling the Top 10 Objections
(Exact word-for-word responses)
## Closing Techniques
(5 different closes — choice, urgency, summary, assumptive, direct)
## Post-Call Follow-Up Template
## Deal Lost Recovery Script`, 'You are a top-performing sales trainer. Create scripts that close deals consistently.');
}

// ── MARKET RESEARCH (original) ──────────────────────────────────────────────
async function generateMarketResearch(inputs) {
  return geminiChat(`Conduct comprehensive market research for:
Industry/Niche: ${inputs.niche}
Region: ${inputs.region || 'Global'}
Demographics: ${inputs.demographics || 'General'}
Focus: ${inputs.focus || 'Full analysis'}
Budget: ${inputs.budget || 'Not specified'}

Provide:
1. Market Overview & Size
2. Market Trends & Growth Projections
3. Target Customer Profiles
4. Competitive Landscape
5. Niche Opportunities
6. Winner Products/Services Analysis
7. Entry Barriers & Challenges
8. Distribution Channels
9. Market Entry Recommendations`, 'You are a senior market research analyst. Provide deep, data-driven market insights.');
}

async function generateMarketingStrategy(inputs) {
  return geminiChat(`Create a comprehensive marketing strategy for:
Business: ${inputs.businessName}
Industry: ${inputs.industry}
Target Audience: ${inputs.targetAudience}
Budget: ${inputs.budget || 'Not specified'}
Goals: ${inputs.goals}
Current Presence: ${inputs.currentPresence || 'None'}
Timeline: ${inputs.timeline || '3 months'}

Provide complete strategy with content plan, SEO, social media, paid ads, KPIs, and 90-day roadmap.`, 'You are an expert marketing strategist.');
}

module.exports = {
  chat, streamChat,
  // Brand
  generateBrandKit, generateBusinessName, generateSlogan,
  // Planning
  generateBusinessPlan, generateCompetitorMatrix, generatePricingCalculator, generateLaunchRoadmap,
  // Legal
  generateContract, generateBudgetEstimator, generatePitchDeck,
  // Marketing
  generateAdCopy, generateSeoKeywords, generateContentCalendar, generateMarketStudy,
  // Sales
  generateColdEmail, generateWebsiteCopy, generateSalesScript,
  // Legacy
  generateMarketResearch, generateMarketingStrategy
};
