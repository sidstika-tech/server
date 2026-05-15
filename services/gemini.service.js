const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function geminiChat(prompt, systemInstruction) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemInstruction || 'You are Double Eight AI, an expert business advisor. Be detailed, professional, and actionable. Use markdown formatting with clear headers and sections.',
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function generateAcademyDaily() {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: 'You are a business news curator. Return ONLY valid JSON. No markdown, no explanation, no code blocks, no backticks.',
  });

  const today = new Date().toISOString().slice(0, 10);

  const prompt = `Today is ${today}. Generate 3 trending business news cards for entrepreneurs. Rules:
Card 1: CRYPTO or STOCK MARKET or FOREX — most relevant current trend.
Card 2: Global business success story or breakthrough. From country A.
Card 3: Trending business opportunity or creative marketing success. From country B (different from A).
All 3 must be from different countries. sourceUrl must be a real URL to Bloomberg, Reuters, Forbes, CNBC, CoinDesk, TechCrunch, BBC Business, or similar reputable outlet.

Return ONLY this JSON:
{"cards":[{"id":"card1","type":"market","icon":"📈","country":"USA","countryFlag":"🇺🇸","category":"Crypto / Markets","title":"short headline","summary":"2 sentences on trend and why it matters","opportunity":"one sentence on entrepreneur action","source":"Bloomberg","sourceUrl":"https://www.bloomberg.com/markets"},{"id":"card2","type":"success","icon":"🏆","country":"country name","countryFlag":"flag emoji","category":"Business Success","title":"short headline","summary":"2 sentences","opportunity":"one lesson","source":"outlet name","sourceUrl":"real url"},{"id":"card3","type":"opportunity","icon":"🚀","country":"different country","countryFlag":"flag emoji","category":"Trending Opportunity","title":"short headline","summary":"2 sentences","opportunity":"one sentence","source":"outlet name","sourceUrl":"real url"}],"generatedAt":"${today}"}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim()
    .replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'').trim();
  return JSON.parse(text);
}

module.exports = { geminiChat, generateAcademyDaily };
