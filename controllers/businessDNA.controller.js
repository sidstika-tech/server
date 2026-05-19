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

    const prompt = `You are about to make one of the most important recommendations of ${userName}'s life. They are trusting you to look at WHO they actually are — not just plug their inputs into a template — and recommend the SPECIFIC business that fits THEM in ${country} right now.

══════════════════════════════════════════════════════════════════
WHO YOU ARE ANALYZING
══════════════════════════════════════════════════════════════════
Name: ${userName}
Country: ${country} (${ctx.hub})
City: ${city || ctx.hub}
Industry they're drawn to: ${industry}
Their actual skills and background: ${skills}
Their starting budget: ${budget}
Time they can dedicate: ${timeAvailable} per week
Business experience: ${experience}
Their main goal: ${goal}

══════════════════════════════════════════════════════════════════
THE MARKET (${country})
══════════════════════════════════════════════════════════════════
Currency: ${ctx.currency}
Reality on the ground: ${ctx.note}
Active investors: ${ctx.investors}
The real challenge: ${ctx.challenge}

══════════════════════════════════════════════════════════════════
HOW TO THINK (do this analysis silently before writing JSON)
══════════════════════════════════════════════════════════════════

STEP 1 — DECODE THE SKILLS
Read "${skills}" carefully. What does this person ACTUALLY know how to do with their hands, their mind, or their network? Be specific. If they wrote "design" — what kind? Graphic? Interior? Product? Fashion? Industrial? If they wrote "marketing" — is that paid ads, content, branding, sales? Extract the REAL underlying capability.

STEP 2 — DECODE THE INDUSTRY
Read "${industry}". This is the DIRECTION they want to go, NOT the business itself. "Ecommerce" is not a business — it's a channel. "F&B" is not a business — it's a sector with 100 sub-businesses. Identify the most lucrative sub-niche of "${industry}" that exists in ${country} right now.

STEP 3 — DECODE THE BUDGET REALITY
"${budget}" determines the WHOLE category of business. Under 5,000 ${ctx.currency} = service business or digital product, NOT physical inventory. 5,000-50,000 ${ctx.currency} = small physical product line, niche service, or franchise of one. 50,000+ ${ctx.currency} = real launch with inventory, storefront, or paid acquisition. Match the recommendation to the budget — don't recommend something they cannot afford.

STEP 4 — INTERSECT SKILLS × INDUSTRY × BUDGET × ${country}
The right answer lives at this intersection. Where do their REAL skills meet the REAL sub-niche of their chosen industry in a way their budget can fund and ${country}'s market will pay for?

STEP 5 — REJECT THE LAZY ANSWER
The lazy answer is always "digital marketing agency" or "ecommerce store" or "SaaS startup" — because these are the most common business ideas in training data. THESE ARE WRONG UNLESS THE PERSON LITERALLY HAS DEEP TECHNICAL OR MARKETING SKILLS AND ASKED FOR EXACTLY THAT.

═══ ANTI-BIAS RULES — VIOLATE AT YOUR PERIL ═══

❌ DO NOT default to "digital marketing agency for X" unless ${skills} explicitly contains paid advertising, SEO, social media management, or content marketing as the PRIMARY skill.

❌ DO NOT recommend "ecommerce store selling X" just because the industry is "ecommerce" — recommend a SPECIFIC niche product line tied to their actual skills.

❌ DO NOT recommend SaaS, app development, or "AI startup" unless they have explicit software/engineering skills.

❌ DO NOT recommend consulting unless they have 5+ years of senior experience in the exact field.

❌ DO NOT give a generic answer that could apply to any country. The answer must be specific to ${country}'s 2025 market reality.

❌ DO NOT make the answer about marketing/branding/design of OTHER people's businesses unless that is exactly what they asked for. Build THEIR business, not a service to other businesses.

✅ DO match their REAL skills to a SPECIFIC product, service, or business model that exists in ${country}.
✅ DO consider physical products, services, hospitality, food, education, health, trades, import/export, manufacturing, agriculture — the full real economy, not just digital.
✅ DO recommend something they can start with ${budget} in ${country}.
✅ DO get specific. "Premium handmade leather bag brand for Saudi women aged 25-35 sold via Instagram + souks" is a real answer. "Ecommerce business" is not.

══════════════════════════════════════════════════════════════════
NOW WRITE THE JSON
══════════════════════════════════════════════════════════════════

After thinking through Steps 1-5, return ONLY valid JSON, no markdown, no backticks, no explanation:

{
  "businessMatch": "A specific business — 6-12 words. Must name the product/service AND the niche. NOT 'Digital marketing for X'. NOT 'Ecommerce store'. NOT 'Consulting'. Real example: 'Premium handcrafted oud-based perfume brand for Saudi men' or 'Industrial CNC parts manufacturing for UAE construction sector' or 'Arabic-language children's educational toys for the GCC family market'.",
  "whyMatch": "3-4 sentences. Use ${userName}'s name. Explicitly connect 2-3 specific phrases from their skills (${skills}) to specific reasons this business wins in ${country}. The reader must finish reading and think 'no one else could have written this about me'.",
  "marketOpportunity": "2-3 sentences on the REAL ${country} market in 2025 for this SPECIFIC business. Include one concrete number, statistic, or trend if you know one. Reference specific neighborhoods, customer segments, or buying behaviors that exist in ${country}.",
  "startingSteps": [
    "Step 1: Specific first action in ${country} this week — name a real platform, real cost in ${ctx.currency}, real timeline. Not 'do market research'. Something like 'Spend 200 ${ctx.currency} on 20 customer interviews at [specific real location in ${city || ctx.hub}] this week'.",
    "Step 2: Real second action with platform name and cost",
    "Step 3: Real third action — should validate demand",
    "Step 4: Real fourth action — first version of the offer",
    "Step 5: Real fifth action — should result in a first paying customer or pre-order"
  ],
  "estimatedRevenue": "Realistic Month 6 revenue range in ${ctx.currency} based on this SPECIFIC business model with this budget — show the math in one sentence (e.g., '15-25 customers/month × 400 ${ctx.currency} avg ticket')",
  "riskLevel": "Low / Medium / High — followed by one honest sentence on the primary risk for THIS specific business in ${country}",
  "score": <overall viability 0-100 based on: market opportunity in ${country} + how well their skills match + budget realism + competition + execution difficulty>,
  "scoreBreakdown": {
    "marketOpportunity": <0-100, how big and accessible is this specific market in ${country}>,
    "financialViability": <0-100, can this be built profitably with ${budget} in ${country}>,
    "competitionRisk": <0-100, higher score = less direct competition in ${country}>,
    "executionReadiness": <0-100, how ready are ${userName}'s SPECIFIC skills (${skills}) for this exact business>,
    "marketingStrength": <0-100, how easy is it to reach the target customer in ${country} with this budget>,
    "fundability": <0-100, how attractive would this be to ${country} investors if they wanted to raise>
  },
  "investorsToContact": "2-3 specific investor names or programs in ${country} that ACTUALLY fund this category — pick from: ${ctx.investors}. If this business is too small for formal VC, say so honestly and recommend angels/grants/family funding instead.",
  "biggestRisk": "The single most likely reason this specific business fails in ${country} — stated honestly — followed by the specific way to avoid it.",
  "unfairAdvantage": "The unique combination of ${userName}'s actual skills (quote 1-2 phrases from ${skills}) + their location in ${country} + the current timing in 2025 that creates an advantage competitors cannot copy.",
  "firstMilestone": "The ONE measurable thing to achieve in the first 30 days — must be specific and measurable, e.g., '10 paying customers' or '50,000 ${ctx.currency} in pre-orders' or '500 qualified email signups'"
}`;

    const raw = await geminiChat(
      prompt,
      `You are a senior business strategist who has personally advised 500+ founders across ${country} and the broader MENA region over 15 years. You have seen what works and what fails on the ground in ${country}. You despise generic answers. You despise lazy defaults like "start a digital marketing agency". You always match real skills to real market opportunities with specificity. You only recommend businesses you would personally start in this person's exact situation. Return ONLY valid JSON.`,
      {
        // Higher temperature pushes the model away from training-data clichés
        // (digital marketing, generic ecommerce, SaaS) toward creative synthesis.
        temperature: 0.9,
        topP: 0.95,
        // Force structured JSON — no more markdown stripping needed.
        json: true,
      }
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
