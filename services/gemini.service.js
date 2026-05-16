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

async function geminiChat(prompt, systemInstruction) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemInstruction || MASTER_IDENTITY,
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function generateAcademyDaily() {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: 'Business intelligence curator for Arab entrepreneurs. Return ONLY valid JSON. No markdown, no backticks.',
  });
  const today = new Date().toISOString().slice(0,10);
  const prompt = `Today is ${today}. Generate 3 business intelligence cards for MENA entrepreneurs.
Card 1: CRYPTO/STOCK/FOREX — most relevant market movement right now. What it means for their money.
Card 2: Real success story — preferably MENA or developing market founder who built from nothing. Country A.
Card 3: Trending opportunity or marketing strategy working RIGHT NOW, entrepreneur can act on this week. Country B.
sourceUrl must be real clickable URL from Bloomberg, Reuters, Forbes, Arab News, Gulf Business, CNBC, TechCrunch, or Zawya.
Return ONLY this JSON: {"cards":[{"id":"card1","type":"market","icon":"📈","country":"USA","countryFlag":"🇺🇸","category":"Markets","title":"under 10 words","summary":"2 sentences what happened and why it matters","opportunity":"one action they take now","source":"Bloomberg","sourceUrl":"https://www.bloomberg.com/markets"},{"id":"card2","type":"success","icon":"🏆","country":"country","countryFlag":"flag","category":"Success Story","title":"headline","summary":"2 sentences founder story","opportunity":"key lesson to steal","source":"source","sourceUrl":"real url"},{"id":"card3","type":"opportunity","icon":"🚀","country":"different country","countryFlag":"flag","category":"Opportunity","title":"headline","summary":"2 sentences on trend","opportunity":"how to act this week","source":"source","sourceUrl":"real url"}],"generatedAt":"${today}"}`;
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim().replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'').trim();
  return JSON.parse(text);
}

module.exports = { geminiChat, generateAcademyDaily, MASTER_IDENTITY };
