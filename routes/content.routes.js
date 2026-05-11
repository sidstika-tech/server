const express = require('express');
const router = express.Router();
const { auth, requireCredits } = require('../middleware/auth.middleware');
const Generation = require('../models/Generation.model');


const CONTENT_TYPES = [
  { id: 'script', label: 'Video Script', icon: '🎬', desc: 'YouTube, TikTok, Reels, ads', credits: 3, maxTokens: 1800 },
  { id: 'prompt', label: 'AI Prompt Pack', icon: '🧠', desc: 'System prompts, mega-prompts, chains', credits: 2, maxTokens: 1200 },
  { id: 'longform', label: 'Long-Form Article', icon: '📄', desc: 'Blog posts, white papers, reports', credits: 4, maxTokens: 2000 },
  { id: 'presentation', label: 'Presentation', icon: '📊', desc: 'Slide outlines, pitch decks, keynotes', credits: 3, maxTokens: 1600 },
  { id: 'speech', label: 'Speech / Talk', icon: '🎙️', desc: 'Keynotes, TEDx, investor pitches, toasts', credits: 3, maxTokens: 1800 },
  { id: 'scenario', label: 'Scenario / Plan', icon: '🗺️', desc: 'Business scenarios, roadmaps, playbooks', credits: 3, maxTokens: 1600 },
  { id: 'email_sequence', label: 'Email Sequence', icon: '📧', desc: 'Full drip campaigns, onboarding flows', credits: 3, maxTokens: 1800 },
  { id: 'sop', label: 'SOP / Process Doc', icon: '📋', desc: 'Standard operating procedures, guides', credits: 2, maxTokens: 1400 },
];

const SYSTEM_PROMPTS = {
  script: `You are a world-class video scriptwriter who has written for top YouTubers, TikTok creators, and ad agencies. 
Write complete, engaging scripts with clear hooks, structured content, and strong CTAs. 
Include speaker notes, scene descriptions where relevant, and timing markers.
Format clearly with sections: [HOOK], [INTRO], [MAIN CONTENT], [CTA], [OUTRO].`,

  prompt: `You are a master prompt engineer who builds AI prompts for GPT-4, Claude, and other LLMs.
Create complete prompt packs with system prompts, user prompts, and usage examples.
Include variables in {{brackets}}, explain each prompt's purpose, and provide a usage guide.
Format: System Prompt, User Prompt Template, Example Usage, Tips.`,

  longform: `You are a senior content strategist and writer for top-tier publications.
Write comprehensive, SEO-optimized long-form content with proper structure: 
H1 title, executive summary, H2/H3 headers, bullet points, data references, and conclusion.
Aim for depth, authority, and actionable insights throughout.`,

  presentation: `You are a professional presentation designer and storyteller (ex-McKinsey, ex-Apple keynote team).
Create complete presentation outlines with: slide-by-slide breakdown, key messages per slide, 
speaker notes, data points to include, and visual suggestions. 
Follow the rule of 3, strong narrative arc, and memorable conclusions.`,

  speech: `You are a world-class speechwriter who has written for CEOs, politicians, and TED speakers.
Write complete, emotionally compelling speeches with: strong opening hook, personal stories,
key message repetition, rhetorical devices, audience engagement moments, and powerful closing.
Include delivery notes (pause here, emphasize this, look at audience).`,

  scenario: `You are a strategic business consultant and scenario planner.
Create detailed scenarios and strategic plans with: situation analysis, 3-5 scenarios (best/likely/worst),
action plans for each, key decision points, metrics to track, and timeline.
Be specific, practical, and data-driven.`,

  email_sequence: `You are a direct response copywriter specializing in email marketing.
Write complete email sequences with subject lines, preview text, full email body, and CTAs.
Each email should have a clear purpose in the sequence journey. 
Include personalization tokens, A/B test suggestions, and send timing recommendations.`,

  sop: `You are an operations expert who builds clear, actionable standard operating procedures.
Create complete SOPs with: purpose, scope, roles/responsibilities, step-by-step process,
decision trees where needed, quality checkpoints, and troubleshooting guide.
Use numbered steps, clear language, and include measurable success criteria.`,
};

router.get('/types', auth, (req, res) => {
  res.json({ success: true, types: CONTENT_TYPES });
});

router.post('/generate', auth, async (req, res) => {
  try {
    const { contentType, topic, context, tone, length, audience } = req.body;

    if (!contentType || !topic) {
      return res.status(400).json({ success: false, message: 'Content type and topic are required' });
    }

    const ct = CONTENT_TYPES.find(t => t.id === contentType);
    if (!ct) return res.status(400).json({ success: false, message: 'Invalid content type' });

    if (!req.user.hasCredits(ct.credits)) {
      return res.status(402).json({ success: false, message: 'Insufficient credits', code: 'NO_CREDITS' });
    }

    const systemPrompt = SYSTEM_PROMPTS[contentType] || SYSTEM_PROMPTS.longform;

    const userPrompt = `Create a ${ct.label} about: "${topic}"

${context ? `Additional Context: ${context}` : ''}
${tone ? `Tone/Style: ${tone}` : ''}
${length ? `Length/Scope: ${length}` : ''}
${audience ? `Target Audience: ${audience}` : ''}

Make it professional, complete, and ready to use. Do not add meta-commentary — just deliver the content.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.78,
      max_tokens: ct.maxTokens,
    });

    const content = response.choices[0].message.content;
    const wordCount = content.split(/\s+/).length;

    await req.user.useCredits(ct.credits);

    const gen = await Generation.create({
      userId: req.user._id,
      type: 'tool',
      title: `${ct.label}: ${topic.slice(0, 60)}`,
      input: topic,
      output: { content, contentType, topic, context, tone, length, audience, wordCount },
      creditsUsed: ct.credits,
      isSaved: true,
      status: 'completed',
      metadata: { contentType, wordCount },
      tags: [contentType, 'content-studio'],
    });

    res.json({
      success: true,
      content,
      wordCount,
      generationId: gen._id,
      credits: req.user.credits,
    });

  } catch (e) {
    console.error('Content studio error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
module.exports.CONTENT_TYPES = CONTENT_TYPES;
