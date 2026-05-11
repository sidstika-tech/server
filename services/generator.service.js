function markdownToHTML(markdown, title = 'Report') {
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Double Eight AI</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; background: #0a0a0f; color: #e8e8f0; line-height: 1.8; }
    .container { max-width: 900px; margin: 0 auto; padding: 60px 40px; }
    .header { text-align: center; margin-bottom: 60px; padding-bottom: 40px; border-bottom: 1px solid #88f; }
    .logo { font-size: 14px; letter-spacing: 4px; color: #8888ff; text-transform: uppercase; margin-bottom: 20px; }
    h1 { font-size: 2.5rem; color: #fff; font-weight: 300; margin-bottom: 10px; }
    .meta { font-size: 13px; color: #666; }
    h2 { font-size: 1.5rem; color: #8888ff; margin: 40px 0 16px; padding-top: 20px; border-top: 1px solid #1a1a2e; font-weight: 400; letter-spacing: 1px; }
    h3 { font-size: 1.1rem; color: #aabbff; margin: 24px 0 10px; font-weight: 600; }
    p { margin: 12px 0; color: #ccc; }
    ul, ol { margin: 12px 0 12px 24px; color: #ccc; }
    li { margin: 6px 0; }
    strong { color: #fff; }
    .footer { text-align: center; margin-top: 80px; padding-top: 30px; border-top: 1px solid #1a1a2e; font-size: 12px; color: #444; letter-spacing: 2px; }
    @media print { body { background: white; color: black; } h2 { color: #333; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Double Eight AI</div>
      <h1>${title}</h1>
      <div class="meta">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
    <div class="content">
      <p>${html}</p>
    </div>
    <div class="footer">DOUBLE EIGHT AI &mdash; AI BUSINESS BUILDER &mdash; CONFIDENTIAL</div>
  </div>
</body>
</html>`;
}

function generateReportId() {
  return `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function extractTitle(content) {
  const lines = content.split('\n');
  for (const line of lines) {
    const clean = line.replace(/^#+\s*/, '').trim();
    if (clean.length > 5 && clean.length < 80) return clean;
  }
  return 'Business Report';
}

module.exports = { markdownToHTML, generateReportId, extractTitle };
