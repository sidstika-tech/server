# Website Templates Folder

This folder holds ready-made HTML templates that the Website Creator tool uses.
Instead of asking Gemini to write a website from scratch (which times out and fails
unpredictably), the tool now loads ONE of these templates and asks Gemini to make
**targeted edits** based on what the user filled in.

## How it works

1. User picks "Restaurant / Cafe" in the Website Creator form
2. Backend loads `restaurant.html` from this folder
3. Gemini receives the template + user inputs (brand name, colors, fonts, extra details)
4. Gemini returns the same HTML but personalized to the user's business
5. If Gemini fails for any reason, a deterministic find-replace fallback runs so the
   user STILL gets a working website (just with less polish)

## Required files

You must provide AT LEAST these 4 HTML files in this folder:

| File              | Used for the dropdown value     |
|-------------------|---------------------------------|
| `business.html`   | "Business / Company" (also used as fallback for SaaS, Gym, Real Estate, Medical) |
| `portfolio.html`  | "Portfolio / Personal"          |
| `restaurant.html` | "Restaurant / Cafe"             |
| `ecommerce.html`  | "E-Commerce / Store"            |

If a file is missing, the tool falls back to `business.html`. If `business.html`
is also missing, the user gets a clear error message.

## Requirements for each template file

Each `.html` file must be a **complete, standalone, single-file website**:

- Starts with `<!DOCTYPE html>`
- Ends with `</html>`
- All CSS inside ONE `<style>` tag in `<head>`
- All JavaScript inside ONE `<script>` tag at end of `<body>`
- Google Fonts imported via `<link>` in `<head>` if used
- Fully responsive (mobile + tablet + desktop)
- Self-contained — no external image hosts, no broken links
- Modern design, real example content (not Lorem Ipsum)

## Optional placeholders (recommended for fallback quality)

The AI auto-detects what to replace, but if you ALSO want the deterministic
fallback to work cleanly when Gemini is down, use these markers in your template:

```html
<title>{{BRAND_NAME}}</title>
<h1>Welcome to {{BRAND_NAME}}</h1>
```

```css
:root {
  --primary: {{PRIMARY_COLOR}};
  --accent: {{ACCENT_COLOR}};
  --bg: {{BG_COLOR}};
  --text: {{TEXT_COLOR}};
}
```

Supported placeholders (find-replace fallback):
- `{{BRAND_NAME}}` / `{{BUSINESS_NAME}}` / `{{COMPANY_NAME}}` → user's business name
- `{{PRIMARY_COLOR}}` → main brand color (from selected scheme)
- `{{ACCENT_COLOR}}` → secondary/accent color
- `{{BG_COLOR}}` → background color
- `{{TEXT_COLOR}}` → text color

If you don't use placeholders, Gemini still does the work — these just make the
"if AI fails" fallback also look nice.

## Color schemes (used by the fallback)

These are the colors mapped from the user's dropdown selection:

| Dropdown value             | Primary  | Accent   | Background | Text     |
|----------------------------|----------|----------|------------|----------|
| Dark & Gold (Luxury)       | #f59e0b  | #d97706  | #0a0a0f    | #fefce8  |
| Light & Clean (Minimal)    | #1f2937  | #3b82f6  | #ffffff    | #1f2937  |
| Dark & Blue (Tech)         | #3b82f6  | #06b6d4  | #0f172a    | #f1f5f9  |
| White & Green (Health)     | #10b981  | #059669  | #f9fafb    | #064e3b  |
| Dark & Purple (Creative)   | #a855f7  | #ec4899  | #1a0a2e    | #fae8ff  |

## Template length

Keep each template under ~50 KB. Gemini has context limits — very long templates
will be truncated or cause failures. A typical good template is 8-25 KB.
