const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = 'llama-3.3-70b-versatile';

const ask = async (systemPrompt, userPrompt, maxTokens = 1000) => {
  try {
    const res = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.8,
      max_tokens: maxTokens,
    });
    return res.choices[0].message.content;
  } catch (err) {
    console.error('groq error:', err.message);
    return null;
  }
};

const askJSON = async (systemPrompt, userPrompt, maxTokens = 1200) => {
  const raw = await ask(systemPrompt + '\n\nReturn ONLY valid JSON. No markdown fences.', userPrompt, maxTokens);
  if (!raw) return null;
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return null;
  }
};

const chatCompletion = async (messages, maxTokens = 800) => {
  try {
    const res = await groq.chat.completions.create({ model: MODEL, messages, temperature: 0.7, max_tokens: maxTokens });
    return res.choices[0].message.content;
  } catch (err) {
    console.error('Chat error:', err.message);
    return "I'm experiencing issues. Please check your groq API key.";
  }
};

// --- Business Generator ---
const generateBusiness = async (idea, category) => {
  const json = await askJSON(
    `You are a world-class business strategist and startup advisor.`,
    `Generate a complete business plan for: "${idea}" in category: "${category}".
Return JSON:
{
  "name": "Business name",
  "tagline": "Catchy tagline",
  "niche": "Specific niche",
  "targetMarket": "Target audience",
  "themeColor": "#hexcolor",
  "style": "brand style",
  "model": "Business model (subscription/one-time/freemium)",
  "revenue": "Revenue streams",
  "competitors": ["comp1","comp2","comp3"],
  "usp": "Unique selling proposition",
  "roadmap": ["Month 1: ...", "Month 3: ...", "Month 6: ...", "Year 1: ..."],
  "risks": ["risk1","risk2"],
  "products": [{"name":"","description":"","price":0,"emoji":""}] // 8 products
}`
  ) || getFallbackBusiness(idea);
  return json;
};

// --- Market Research ---
const generateMarketResearch = async (niche) => {
  return await askJSON(
    `You are a market research analyst with expertise in business trends and competitive intelligence.`,
    `Conduct market research for: "${niche}".
Return JSON:
{
  "overview": "2-3 sentence market overview",
  "marketSize": "$X billion",
  "growthRate": "X% annually",
  "demandScore": 85,
  "profitScore": 72,
  "competitionLevel": "Medium",
  "topTrends": ["trend1","trend2","trend3","trend4"],
  "competitors": [{"name":"","description":"","pricing":"","weakness":""}],
  "priceRanges": {"low":"$X","mid":"$X","premium":"$X"},
  "opportunities": ["opp1","opp2","opp3"],
  "threats": ["threat1","threat2"],
  "targetAudiences": [{"segment":"","size":"","spending":""}],
  "keywords": ["kw1","kw2","kw3","kw4","kw5"]
}`
  ) || getFallbackResearch();
};

// --- Marketing Builder ---
const generateMarketing = async (business, platform) => {
  return await askJSON(
    `You are a senior digital marketing strategist at a top agency.`,
    `Create a complete marketing strategy for "${business}" focused on ${platform}.
Return JSON:
{
  "instagram": {
    "strategy": "Overview strategy",
    "contentPillars": ["pillar1","pillar2","pillar3"],
    "postIdeas": [{"type":"","caption":"","hashtags":[""],"hook":""}],
    "postingSchedule": "X times/week"
  },
  "tiktok": {
    "strategy": "TikTok approach",
    "videoIdeas": [{"title":"","hook":"","duration":"","cta":""}],
    "trends": ["trend1","trend2"]
  },
  "ads": {
    "metaAd": {"headline":"","primaryText":"","cta":"","audience":""},
    "googleAd": {"headline":"","description":"","keywords":[""]}
  },
  "seo": {
    "blogTopics": [{"title":"","keyword":"","intent":""}],
    "pillarContent": "",
    "strategy": ""
  },
  "email": {
    "sequence": [{"day":1,"subject":"","preview":"","goal":""}],
    "strategy": ""
  }
}`
  ) || null;
};

// --- AI Tools ---
const generateTool = async (toolType, input) => {
  const prompts = {
    logo: `Generate a logo concept for "${input}". Return JSON: {"concept":"","colors":[""],"typography":"","icon":"emoji","style":"","rationale":""}`,
    name: `Generate 10 startup names for "${input}". Return JSON: {"names":[{"name":"","domain":"","meaning":"","score":90}]}`,
    pitch: `Create an elevator pitch for "${input}". Return JSON: {"oneLiner":"","problem":"","solution":"","market":"","traction":"","ask":"","fullPitch":""}`,
    email: `Write a cold email for "${input}". Return JSON: {"subject":"","preview":"","body":"","cta":"","ps":""}`,
    contract: `Create a basic service agreement outline for "${input}". Return JSON: {"title":"","parties":"","scope":"","deliverables":[""],"payment":"","terms":"","clauses":[""]}`,
    adcopy: `Write compelling ad copy for "${input}". Return JSON: {"facebook":{"headline":"","body":"","cta":""},"google":{"headline1":"","headline2":"","description":""},"twitter":{"tweet1":"","tweet2":""},"linkedin":{"headline":"","body":""}}`,
  };
  return await askJSON(`You are an expert AI business tool assistant.`, prompts[toolType] || prompts.name);
};

// --- Chat ---
const businessChat = async (message, history, mode) => {
  const modePrompts = {
    advisor: 'You are Alex, an elite AI business advisor. You give sharp, actionable advice. Be direct, specific, and insightful.',
    marketing: 'You are Maya, a world-class digital marketing strategist. Focus on growth, campaigns, and brand building.',
    investment: 'You are Victor, a seasoned venture capitalist. Evaluate ideas from an investor perspective. Talk about valuations, metrics, and fundraising.',
    mentor: 'You are Sam, a startup mentor who has founded 3 companies. Share wisdom, war stories, and tough love advice.',
  };
  const system = modePrompts[mode] || modePrompts.advisor;
  const msgs = [{ role: 'system', content: system }, ...history.slice(-12), { role: 'user', content: message }];
  return chatCompletion(msgs);
};

// Fallbacks
const getFallbackBusiness = (idea) => ({
  name: 'Venture Co.', tagline: 'Your vision, engineered.', niche: idea, targetMarket: 'Digital entrepreneurs',
  themeColor: '#f59e0b', style: 'modern', model: 'Subscription', revenue: 'Monthly subscriptions',
  competitors: ['Competitor A', 'Competitor B', 'Competitor C'], usp: 'AI-powered automation',
  roadmap: ['Month 1: Launch MVP', 'Month 3: 100 users', 'Month 6: $10k MRR', 'Year 1: $100k ARR'],
  risks: ['Market saturation', 'Technical challenges'],
  products: [
    { name: 'Starter Plan', description: 'Perfect for solo founders', price: 29, emoji: '🚀' },
    { name: 'Growth Plan', description: 'Scale your business', price: 79, emoji: '📈' },
    { name: 'Enterprise Plan', description: 'Full power for teams', price: 199, emoji: '⚡' },
  ],
});

const getFallbackResearch = () => ({
  overview: 'A growing market with significant opportunities.',
  marketSize: '$50 billion', growthRate: '15% annually', demandScore: 78, profitScore: 65,
  competitionLevel: 'Medium',
  topTrends: ['AI automation', 'Remote work', 'Sustainability', 'Personalization'],
  competitors: [{ name: 'Market Leader', description: 'Dominant player', pricing: '$99/mo', weakness: 'Complex UX' }],
  priceRanges: { low: '$19', mid: '$79', premium: '$299' },
  opportunities: ['Underserved segments', 'Geographic expansion', 'New features'],
  threats: ['New entrants', 'Economic shifts'],
  targetAudiences: [{ segment: 'SMBs', size: '2M businesses', spending: '$500-2000/yr' }],
  keywords: ['automation', 'business tools', 'AI software', 'growth', 'productivity'],
});

module.exports = { generateBusiness, generateMarketResearch, generateMarketing, generateTool, businessChat };
