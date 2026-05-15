const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use Gemini 2.5 Flash for all tool generation
async function geminiChat(prompt, systemInstruction) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemInstruction || 'You are Double Eight AI, an expert business advisor. Be detailed, professional, and actionable. Use markdown formatting with clear headers and sections.',
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ── ACADEMY: Daily news + trends (called by cron) ─────────────────────────
async function generateAcademyDaily() {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: 'You are a business intelligence curator. Return ONLY valid JSON. No markdown, no explanation, no code blocks.',
  });

  const today = new Date().toISOString().slice(0, 10);

  const prompt = `Today is ${today}. Search your knowledge for the most important and trending business news, success stories, entrepreneurship insights, and mindset content from this week.

Return ONLY this exact JSON structure with no extra text:
{
  "featured": {
    "title": "string",
    "category": "strategy|mindset|marketing|finance|startup|sales|leadership",
    "description": "2-3 sentence description of this major business story or insight",
    "keyLesson": "The main takeaway in one sentence",
    "source": "Name of publication or person",
    "icon": "single relevant emoji"
  },
  "insights": [
    {
      "title": "string",
      "category": "strategy|mindset|marketing|finance|startup|sales|leadership",
      "summary": "1-2 sentence summary",
      "icon": "single emoji",
      "tag": "one word label"
    }
  ],
  "generatedAt": "${today}"
}

Make insights array have exactly 5 items. Focus on real, current, impactful business content entrepreneurs need to know today.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  // Strip markdown code blocks if present
  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(clean);
}

module.exports = { geminiChat, generateAcademyDaily };
