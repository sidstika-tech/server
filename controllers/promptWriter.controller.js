const Report = require('../models/report.model');
const User = require('../models/user.model');
const { chat, sanitizeInputs } = require('../services/ai.service');
const { markdownToHTML } = require('../services/generator.service');

const PLATFORM_PROFILES = {
  grok: {
    name: 'Grok (xAI)', icon: '𝕏',
    style: 'Grok is built by xAI and trained on real-time Twitter/X data. It is sharp, witty, contrarian, unfiltered, and loves nuance. Grok responds well to direct, bold, specific prompts that challenge conventional wisdom. It handles controversy and current events well. Use energetic, punchy language. Avoid over-polite or corporate tone.',
  },
  chatgpt: {
    name: 'ChatGPT (OpenAI)', icon: '🟢',
    style: 'ChatGPT responds best to clear, structured prompts with explicit roles, context, format instructions, and examples. It benefits from chain-of-thought cues like "think step by step". Be explicit about output format (markdown, JSON, bullet points). Works great with persona assignments.',
  },
  claude: {
    name: 'Claude (Anthropic)', icon: '🟠',
    style: 'Claude excels with nuanced, thoughtful, long-form prompts. It appreciates context, reasoning, and ethical framing. Use XML tags like <task>, <context>, <format> for precision. Claude handles long documents, analysis, and creative writing with high fidelity. Avoid vague instructions — be specific about depth and tone.',
  },
  gemini: {
    name: 'Gemini (Google)', icon: '♊',
    style: 'Gemini is multimodal and strong at factual, research-heavy, and analytical tasks. It performs well with prompts that ask for structured data, comparison tables, and sourced reasoning. Works great for Google ecosystem tasks, code generation, and multi-step reasoning. Use clear section headers in prompts.',
  },
  midjourney: {
    name: 'Midjourney', icon: '🎨',
    style: 'Midjourney is an image generation AI. Prompts should be rich visual descriptions: art style, medium, lighting, mood, camera angle, color palette, artist references. Use double colons :: for weight. Add --ar for aspect ratio, --style, --v 6 for version. No full sentences — use comma-separated descriptors.',
  },
  dalle: {
    name: 'DALL·E (OpenAI)', icon: '🖼',
    style: 'DALL·E generates images from natural language. Write clear scene descriptions with subject, setting, style, mood, lighting. It understands natural language better than Midjourney. Describe what you want literally. Mention art style (photorealistic, oil painting, cartoon). Avoid prohibited content hints.',
  },
  runway: {
    name: 'Runway / Sora (Video AI)', icon: '🎬',
    style: 'Video AI models like Runway and Sora need cinematic, scene-by-scene descriptions. Include: shot type (close-up, wide shot, aerial), camera movement (pan left, zoom in, tracking shot), lighting conditions, subject motion, environment, mood, duration hint, and visual style. Be very specific about time and motion.',
  },
  llama: {
    name: 'Llama (Meta)', icon: '🦙',
    style: 'Llama is a highly capable open-source model. Works well with instruction-following formats. Use [INST] style structuring mentally. Be direct and specific. Include system context, role, task, and desired output format. Good for code, analysis, and structured generation tasks.',
  },
  perplexity: {
    name: 'Perplexity AI', icon: '🔍',
    style: 'Perplexity is a research AI that searches the web. Frame prompts as research questions that benefit from up-to-date sources. Ask for cited answers, comparisons, recent data, and expert opinions. Use question format. Works best for fact-finding, market data, and current events.',
  },
  general: {
    name: 'General / Universal', icon: '🤖',
    style: 'Create a universal, well-structured prompt that works across all major AI platforms. Use clear role assignment, context, explicit task description, format requirements, and quality guidelines. Follow best prompt engineering practices.',
  },
};

const PROMPT_TYPES = {
  image:       { name: 'Image Generation',    system: 'You are a world-class prompt engineer specializing in AI image generation. Create highly detailed, technically precise image prompts. Include: subject/composition, art style, medium, lighting, color palette, mood, camera angle/lens, artist references, quality modifiers. Structure for maximum visual impact.' },
  video:       { name: 'Video Generation',    system: 'You are an expert in AI video generation prompting. Create cinematic, motion-rich prompts that specify: scene setup, camera movement, shot types, subject motion, lighting changes, transitions, pacing, visual style, duration guidance. Think like a film director writing shot notes.' },
  script:      { name: 'Video Script',        system: 'You are a professional scriptwriter and content strategist. Create complete, production-ready video scripts with: hook (first 3 seconds), structured sections, voiceover text, on-screen text suggestions, B-roll directions, CTA. Format with clear timestamps and speaker notes.' },
  cinema:      { name: 'Cinema Scenario',     system: 'You are a Hollywood-level screenwriter and story architect. Create rich cinematic scenarios with: logline, genre, tone, character arcs, three-act structure, scene-by-scene breakdown, dialogue snippets, visual motifs, soundtrack mood, and production notes. Write like a professional screenplay treatment.' },
  information: { name: 'Information / Research', system: 'You are an expert research prompt engineer. Create precise, comprehensive prompts that extract maximum structured knowledge from AI. Include: specific question framing, required depth, source quality requirements, format (tables, bullets, sections), and follow-up angles. Optimize for accuracy and completeness.' },
  plan:        { name: 'Strategy / Plan',     system: 'You are a strategic planning prompt engineer. Create prompts that generate actionable, structured plans with: goal definition, step-by-step frameworks, timelines, KPIs, resource requirements, risk considerations, and success metrics. Optimize for practical, executable outputs.' },
  marketing:   { name: 'Marketing / Copy',    system: 'You are a direct-response copywriting prompt engineer. Create prompts that produce high-converting marketing content: hooks, value propositions, emotional triggers, CTAs, A/B variants. Frame prompts with target audience psychology, brand voice, and conversion goals.' },
  chat:        { name: 'Chat / Conversation', system: 'You are a conversational AI prompt designer. Create system prompts and conversation starters that establish clear AI personas, behavioral guidelines, expertise domains, tone of voice, and response patterns. Include edge case handling and personality nuances.' },
};

exports.generatePrompt = async (req, res) => {
  try {
    const { topic, promptType, platform, context, tone, length, outputFormat } = req.body;
    if (!topic || !promptType || !platform) {
      return res.status(400).json({ error: 'Topic, prompt type, and platform are required' });
    }

    const clean = sanitizeInputs({ topic, context, tone });
    const platformProfile = PLATFORM_PROFILES[platform] || PLATFORM_PROFILES.general;
    const typeProfile = PROMPT_TYPES[promptType] || PROMPT_TYPES.chat;

    const systemPrompt = `${typeProfile.system}

PLATFORM EXPERTISE — You are optimizing this prompt for: ${platformProfile.name}
PLATFORM STYLE GUIDE: ${platformProfile.style}

Your job: Generate a MASTERCLASS-level, ready-to-use prompt that:
1. Is perfectly calibrated for ${platformProfile.name}'s strengths and syntax preferences
2. Follows best practices for ${typeProfile.name} prompt engineering
3. Produces the best possible output when used
4. Includes all necessary context, constraints, and quality directives

After the main prompt, add a brief "💡 Pro Tips" section with 2-3 platform-specific tips to get even better results.`;

    const userMessage = `Create a ${typeProfile.name} prompt for ${platformProfile.name} about:

Topic/Subject: ${clean.topic}
${clean.context ? `Additional Context: ${clean.context}` : ''}
Desired Tone: ${clean.tone || 'Professional & engaging'}
Output Length Preference: ${length || 'Comprehensive'}
Output Format: ${outputFormat || 'Standard'}

Generate the complete, polished, ready-to-use prompt now. Make it exceptional.`;

    const content = await chat([{ role: 'user', content: userMessage }], 'chat');

    const htmlContent = buildPromptHTML({ topic: clean.topic, platform: platformProfile, type: typeProfile, content, tone: clean.tone, length });
    const title = `${typeProfile.name} Prompt — ${clean.topic.slice(0, 50)} (${platformProfile.name})`;

    const report = await Report.create({
      user: req.user._id, title, type: 'business_plan', content, htmlContent,
      inputs: { topic: clean.topic, promptType, platform, context: clean.context, tone: clean.tone, length, outputFormat },
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'usage.reportsGenerated': 1 } });
    res.json({ success: true, report: { ...report.toObject(), htmlContent } });
  } catch (error) {
    console.error('generatePrompt error:', error);
    res.status(500).json({ error: 'Prompt generation failed. Please try again.' });
  }
};

exports.getPlatforms = (req, res) => {
  const platforms = Object.entries(PLATFORM_PROFILES).map(([id, p]) => ({ id, name: p.name, icon: p.icon }));
  res.json({ success: true, platforms });
};

exports.getPromptTypes = (req, res) => {
  const types = Object.entries(PROMPT_TYPES).map(([id, t]) => ({ id, name: t.name }));
  res.json({ success: true, types });
};

exports.getPromptHistory = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id, 'inputs.promptType': { $exists: true } })
      .select('title inputs createdAt').sort('-createdAt').limit(50);
    res.json({ success: true, reports });
  } catch (error) {
    console.error('getPromptHistory error:', error);
    res.status(500).json({ error: 'Failed to load prompt history.' });
  }
};

function buildPromptHTML({ topic, platform, type, content, tone, length }) {
  const processedContent = content
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${topic} — Double Eight AI Prompt</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',sans-serif;background:#030305;color:#e8e8f4;line-height:1.8}
  .cover{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 60px;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(201,168,76,0.12) 0%,transparent 60%),#030305}
  .cover-badge{display:inline-flex;align-items:center;gap:10px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.25);border-radius:99px;padding:8px 20px;margin-bottom:32px;font-size:13px;color:#c9a84c;letter-spacing:2px}
  .cover-title{font-size:3rem;font-weight:800;line-height:1.1;margin-bottom:16px;max-width:700px}
  .cover-title span{color:#c9a84c}
  .content-page{max-width:860px;margin:0 auto;padding:60px}
  .prompt-box{background:#0c0c18;border:1px solid rgba(201,168,76,0.2);border-radius:16px;padding:36px;margin:24px 0}
  .prompt-content h2{font-size:1.2rem;color:#c9a84c;margin:24px 0 10px}
  .prompt-content p{margin:10px 0;color:#c0c0d8}
  .prompt-content strong{color:#f0eff8}
  .prompt-content li{margin:6px 0;color:#c0c0d8}
  .prompt-content pre{background:#060610;border-radius:10px;padding:20px;margin:16px 0}
  .prompt-content code{font-family:monospace;font-size:13px;color:#c9a84c}
</style>
</head>
<body>
<div class="cover">
  <div class="cover-badge">${platform.icon} ${type.name} · ${platform.name}</div>
  <h1 class="cover-title"><span>${topic}</span></h1>
</div>
<div class="content-page">
  <div class="prompt-box">
    <div class="prompt-content"><p>${processedContent}</p></div>
  </div>
</div>
</body>
</html>`;
}
