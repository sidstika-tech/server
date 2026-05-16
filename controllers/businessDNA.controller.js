const BusinessDNA = require('../models/businessDNA.model');
const User = require('../models/user.model');
const { geminiChat } = require('../services/gemini.service');

const COUNTRY_CONTEXT = {
  'UAE':          { currency:'AED', hub:'Dubai / Abu Dhabi', note:'Most business-friendly country in MENA. Free zones offer 100% foreign ownership. Vision 2031 creating massive demand in tech, logistics, tourism, health.', investors:'Hub71 (Abu Dhabi), DTEC (Dubai), Dubai Angel Investors, ADIO grants', challenge:'High operating costs. Competitive market. Build premium or niche.' },
  'Saudi Arabia': { currency:'SAR', hub:'Riyadh / Jeddah / NEOM', note:'Fastest-growing economy in MENA. Vision 2030 spending $1 trillion across entertainment, tourism, tech, sports. Saudization (Nitaqat) creates B2B opportunities for compliant businesses.', investors:'SVC (Saudi Venture Capital), Wa\'ed (Aramco), Sanabil, Impact46, 500 Global MENA', challenge:'Local ownership rules in some sectors. Regulatory approvals can be slow. Relationships (wasta) still matter enormously.' },
  'Egypt':        { currency:'EGP', hub:'Cairo / Alexandria', note:'Largest Arabic-speaking market — 105 million people. Young population. Growing middle class despite economic pressure. Massive opportunity in e-commerce, edtech, fintech, food delivery.', investors:'EFG EV, Sawari Ventures, A15, Flat6Labs Cairo, Algebra Ventures', challenge:'Currency devaluation risk. Price sensitivity is extreme. Cash transactions still dominate. Trust is hard to build with new brands.' },
  'Jordan':       { currency:'JOD', hub:'Amman', note:'Most educated workforce in MENA relative to size. Startup ecosystem is mature. Strong in IT, services, healthcare. Gateway to Gulf markets and refugee market opportunities.', investors:'Oasis500, MEVP, Endeavor Jordan, Wamda Capital', challenge:'Small domestic market — must plan for regional expansion from day 1. Brain drain is real.' },
  'Morocco':      { currency:'MAD', hub:'Casablanca / Rabat', note:'Gateway between Europe and Africa. French + Arabic + Amazigh market. Growing tech scene. Africa Free Trade Agreement benefits. Strong manufacturing and tourism.', investors:'Maroc Numeric Fund, CDG Invest, Azur Innovation Fund', challenge:'Regulatory complexity. Slow bureaucracy. But less competition than Gulf markets.' },
  'Kuwait':       { currency:'KWD', hub:'Kuwait City', note:'Highest purchasing power in MENA. Conservative market. Government contracts are gold. Luxury and premium brands perform extremely well. Family business culture dominates.', investors:'Kuwait Investment Authority ecosystem, KFAS', challenge:'Very relationship-driven. Outsiders find it hard to break in without local partnerships or wasta.' },
  'Qatar':        { currency:'QAR', hub:'Doha', note:'World Cup legacy investment still flowing. Massive hospitality, tech, education, and sports sector growth. Small population but enormous purchasing power. Vision 2030 actively funding entrepreneurs.', investors:'Qatar Development Bank (QDB), QDB Accelerator, Al-Attiyah Foundation', challenge:'Small local market. Dependence on government contracts. Requires Qatari partnership in many sectors.' },
  'Bahrain':      { currency:'BHD', hub:'Manama', note:'Fintech capital of MENA. Central Bank of Bahrain regulatory sandbox is the most startup-friendly in the region. Low cost of doing business vs UAE. Good test market for Gulf expansion.', investors:'Al Waha Fund, Bahrain Development Bank, YAS (Young Arab Leaders)', challenge:'Small market. Use Bahrain as a base to expand to Saudi Arabia — the real prize.' },
  'Oman':         { currency:'OMR', hub:'Muscat', note:'Vision 2040 creating diversification opportunities in tourism, logistics, mining, manufacturing. Less competitive than UAE. Authentic culture attracts high-value tourists.', investors:'Oman Technology Fund, Business Incubation Center, OIA', challenge:'Smaller ecosystem. Less startup culture. More traditional business environment — relationships first.' },
  'Lebanon':      { currency:'USD (de facto)', hub:'Beirut', note:'Despite the economic crisis, Lebanon has exceptional talent, strong diaspora capital, and a resilient entrepreneur class. Many of the Arab world\'s best founders are Lebanese.', investors:'Berytech, Speed Lebanon, Cedar Mundi, Diaspora angels', challenge:'Banking crisis. Political instability. But diaspora remittances create real purchasing power. Survival-mode businesses here are incredibly strong.' },
};

exports.getDNA = async (req, res) => {
  try {
    const dna = await BusinessDNA.findOne({ user: req.user._id });
    res.json({ success: true, dna: dna || null });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateDNA = async (req, res) => {
  try {
    const { fullName, country, city, industry, skills, budget, timeAvailable, experience, goal } = req.body;

    if(!country || !industry || !skills || !budget || !timeAvailable || !experience || !goal) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const userName = fullName || req.user.name;
    const ctx = COUNTRY_CONTEXT[country] || {
      currency:'USD', hub: city || country,
      note:'A market with real opportunity for entrepreneurs who understand it.',
      investors:'Local angel networks, regional VCs, and government startup programs.',
      challenge:'Every market has its unique challenges — knowing yours gives you the advantage.'
    };

    const prompt = `You are analyzing a real person who has the courage to build a business. Your job is to be the mentor they never had — honest, specific, and deeply encouraging of their potential.

ABOUT THIS PERSON:
Name: ${userName}
Country: ${country} (${ctx.hub})
City: ${city || ctx.hub}
Industry they want to enter: ${industry}
Their skills and background: ${skills}
Their starting budget: ${budget}
Time they can dedicate: ${timeAvailable} per week
Business experience: ${experience}
Their main goal: ${goal}

ABOUT THEIR MARKET (${country}):
Currency: ${ctx.currency}
Key opportunity: ${ctx.note}
Active investors there: ${ctx.investors}
Key challenge: ${ctx.challenge}

WHAT YOU MUST DO:
1. Use their EXACT name (${userName}) throughout — not "the entrepreneur" or "you"
2. Reference their specific country (${country}) and city (${city || ctx.hub}) — not generic MENA
3. Use ${ctx.currency} for all money references
4. Base the business match on their ACTUAL skills — not just the industry they said they want
5. Be honest about risks — a mentor who only flatters you is useless
6. The "startingSteps" must be doable in ${country} with ${budget} — real places, real platforms, real people
7. The tone should feel like: "I've been through this. Here is what I wish someone told me."

Return ONLY valid JSON, no markdown, no backticks, no explanation:
{
  "businessMatch": "The specific business type you recommend — 6-10 words, concrete and specific",
  "whyMatch": "3-4 sentences. Use ${userName}'s name. Reference ${country} specifically. Connect their exact skills to the exact market opportunity. Make them feel this was written for them alone. Be warm but honest.",
  "marketOpportunity": "2-3 sentences on the REAL market opportunity for this business in ${country} RIGHT NOW. Include one specific market insight that shows you know ${country}'s current economic reality.",
  "startingSteps": [
    "Step 1: Specific first action in ${country} — include real platform name, real cost in ${ctx.currency}, real timeline",
    "Step 2: Second action — equally specific",
    "Step 3: Third action",
    "Step 4: Fourth action",
    "Step 5: Fifth action — should result in first paying customer or validated demand"
  ],
  "estimatedRevenue": "Realistic Month 6 revenue range in ${ctx.currency} with one sentence explaining the assumption",
  "riskLevel": "Low / Medium / High — followed by one honest sentence on the primary risk",
  "score": <overall business viability score 0-100 based on: market opportunity + skills fit + budget realism + competition level>,
  "scoreBreakdown": {
    "marketOpportunity": <0-100, how big and accessible is this market in ${country}>,
    "financialViability": <0-100, can this be built profitably with their budget>,
    "competitionRisk": <0-100, higher score = less competition>,
    "executionReadiness": <0-100, how ready are THEIR specific skills for this>,
    "marketingStrength": <0-100, how easy is it to reach customers in ${country} for this business>,
    "fundability": <0-100, how attractive is this to investors in ${country}>
  },
  "investorsToContact": "2-3 specific investor names or programs in ${country} that fund this type of business: relevant from ${ctx.investors}",
  "biggestRisk": "The single most likely reason this specific business fails in ${country} — stated honestly but with the path to avoid it",
  "unfairAdvantage": "What unique combination of ${userName}'s skills, location in ${country}, and timing gives them an advantage competitors cannot easily copy",
  "firstMilestone": "The single most important thing to achieve in the first 30 days — specific and measurable"
}`;

    const raw = await geminiChat(prompt,
      `You are the world's most trusted business mentor for Arab entrepreneurs. You have helped hundreds of first-generation founders across ${country} and the MENA region build businesses from nothing. You are honest, specific, and deeply invested in their success. Return ONLY valid JSON.`
    );
    const clean = raw.trim()
      .replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'').trim();
    const result = JSON.parse(clean);

    const dna = await BusinessDNA.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        fullName: userName, country, city, industry, skills, budget, timeAvailable, experience, goal,
        matchResult: {
          businessMatch:     result.businessMatch,
          whyMatch:          result.whyMatch,
          marketOpportunity: result.marketOpportunity,
          startingSteps:     result.startingSteps,
          estimatedRevenue:  result.estimatedRevenue,
          riskLevel:         result.riskLevel,
          score:             result.score,
          scoreBreakdown:    result.scoreBreakdown,
          fullContent:       JSON.stringify(result),
        },
        journeyStage: 'idea',
        completedAt: new Date(),
      },
      { upsert:true, new:true }
    );

    if(fullName && fullName !== req.user.name) {
      await User.findByIdAndUpdate(req.user._id, { name: fullName });
    }

    res.json({ success:true, dna, result });
  } catch(err) {
    console.error('DNA generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate your business match. Please try again in a moment.' });
  }
};

exports.updateStage = async (req, res) => {
  try {
    const { stage } = req.body;
    const valid = ['idea','validated','branded','marketing','launched','growing'];
    if(!valid.includes(stage)) return res.status(400).json({ error:'Invalid stage' });
    const dna = await BusinessDNA.findOneAndUpdate({ user:req.user._id }, { journeyStage:stage }, { new:true });
    res.json({ success:true, dna });
  } catch(err) { res.status(500).json({ error:err.message }); }
};

exports.resetDNA = async (req, res) => {
  try {
    await BusinessDNA.findOneAndDelete({ user:req.user._id });
    res.json({ success:true });
  } catch(err) { res.status(500).json({ error:err.message }); }
};
