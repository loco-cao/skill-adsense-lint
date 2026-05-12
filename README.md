# adsense-lint

Check if your website meets Google AdSense approval requirements. Outputs a score, detailed findings, and fix suggestions. Supports auto-fix for recoverable issues.

## Install & Build

```bash
npm install
npm run build
```

After building, run via:

```bash
# Direct run
node ./bin/adsense-lint.js

# Or link globally
npm link
adsense-lint
```

## Usage

```bash
# Default scan, table report
adsense-lint

# JSON output (for AI parsing)
adsense-lint --json

# Auto-fix recoverable issues
adsense-lint --fix

# Preview fixes without writing files
adsense-lint --fix --dry-run

# Custom pages directory (for monorepos or sub-projects)
adsense-lint --pages-dir src/app
adsense-lint --pages-dir src/pages
adsense-lint --pages-dir ./my-html-site
```

## Supported Project Types

The tool auto-detects the project type from the current working directory:

| Type | Detection Rule |
|------|---------------|
| **Next.js App Router** | `next.config.*` exists **and** `app/layout.tsx` (or `src/app/layout.tsx`) exists |
| **Next.js Pages Router** | `next.config.*` exists **and** `pages/` (or `src/pages/`) exists |
| **Vite** | `vite.config.*` exists |
| **Plain HTML** | `*.html` files exist in the root |
| **unknown** | None of the above matched |

When `--pages-dir` is used, the tool also infers type from the target directory:
- Directory contains `layout.tsx` → treated as Next.js App Router
- Directory contains `_app.tsx` → treated as Next.js Pages Router
- Directory contains `*.html` → treated as plain HTML

## Scoring System (Fully Transparent)

### Total Score Formula

```
totalScore = Σ (check.score × check.weight / 100)
```

### Grade Thresholds

| Score | Grade | Meaning |
|-------|-------|---------|
| 90 ~ 100 | **PASS** | Ready to apply for AdSense |
| 70 ~ 89 | **WARN** | Close, fix the red items |
| < 70 | **FAIL** | Hard deficiencies, do not apply yet |

---

## Check Details

### 1. Required Pages

**Weight: 30**

AdSense reviewers check these first. Missing any is a strong negative signal.

| Page | Route Match |
|------|-------------|
| About | `/about` |
| Privacy Policy | `/privacy` |
| Contact | `/contact` |
| Terms of Service | `/terms` |

**Sub-score Calculation:**

```
Per-page value = 30 / 4 = 7.5
Missing n pages deducts n × 7.5
Score = max(0, 30 - missing_count × 7.5)
```

**Examples:**
- All 4 present → 30/30
- Missing Contact + Terms → 30 - 15 = **15/30**
- Missing 3 pages → 30 - 22.5 = **7.5/30**
- All 4 missing → **0/30**

**Auto-fixable:** Yes. `--fix` generates pages from `templates/`.

**Route Mapping by Project Type:**

- **Next.js App Router**: scans `app/` or `src/app/` for `page.tsx|ts|jsx|js`
  - `app/page.tsx` → `/`
  - `app/about/page.tsx` → `/about`
  - `app/(marketing)/contact/page.tsx` → `/contact` (group dirs like `(marketing)` ignored)
  - `app/blog/[slug]/page.tsx` → `/blog/:slug`

- **Next.js Pages Router**: scans `pages/` or `src/pages/`
  - `pages/index.tsx` → `/`
  - `pages/about.tsx` → `/about`
  - `pages/contact/index.tsx` → `/contact`
  - `_app.tsx`, `_document.tsx`, `_error.tsx`, `api/` excluded

- **Plain HTML**: scans `*.html` in root
  - `index.html` → `/`
  - `about.html` → `/about`

---

### 2. Content Quality

**Weight: 25**

The **#1 global reason** for AdSense rejection. Thin content, placeholders, or widespread "Coming Soon" pages almost guarantee rejection.

**Dimensions:**

| Dimension | Threshold | Deduction |
|-----------|-----------|-----------|
| Word count too low | < 300 words | **-5** per page |
| Placeholder text | Detected | **-5** per occurrence |

**Sub-score Calculation:**

```
Score = max(0, 25 - min(total_deduction, 25))
total_deduction = low_word_count × 5 + placeholder_count × 5
```

**Placeholder Keywords (case-insensitive):**

- `lorem ipsum`
- `placeholder`
- `todo`
- `coming soon`
- `under construction`
- `insert text here`
- `sample text`

**Word Count Method:**

1. Strip HTML tags `<...>`
2. Strip code blocks ` ```...``` `
3. Strip inline code `` `...` ``
4. Strip single-line JSX expressions `{...}` (does NOT remove multi-line function bodies)
5. Strip `import ... from ...` statements
6. Strip `export default ...` and `export const metadata = { ... }`
7. Split remaining text by whitespace and count words

**Auto-fixable:** No. Content must be authored manually.

---

### 3. Page Structure

**Weight: 15**

AdSense treats basic page structure (title, meta description, h1) as a **professionalism signal**. Less critical than content, but widespread missing fields create a negative impression.

**Dimensions (per page):**

| Dimension | Detection Rule | Deduction |
|-----------|---------------|-----------|
| Title | `<title>`, `metadata.title`, or `title:` inside `export const metadata` | **-3** per missing |
| Meta Description | `<meta name="description">`, `metadata.description`, or `description:` inside `export const metadata` | **-3** per missing |
| H1 | `<h1>` tag, or Markdown `# ` heading | **-3** per missing |

**Sub-score Calculation:**

```
Score = max(0, 15 - min(total_deduction, 15))
total_deduction = missing_items × 3
```

**Detection Logic by Project Type:**

| Type | Title Detection | Meta Description Detection |
|------|----------------|---------------------------|
| Next.js App Router | `export const metadata = { title: ... }` first; fallback to `<title>` and `metadata.title` | `export const metadata = { description: ... }` first; fallback to `<meta name="description">` and `metadata.description` |
| Next.js Pages Router | `<title>` and `metadata.title` | `<meta name="description">` and `metadata.description` |
| Plain HTML | `<title>` | `<meta name="description">` |

**Auto-fixable:** No. Must be added manually by the developer.

---

### 4. Cookie Consent

**Weight: 10**

Google's **EU User Consent Policy** requires cookie consent for European users. Some US-only sites get approved without it initially, but importance is rising yearly.

**Detection:**

Scans the **concatenated source of all pages**, case-insensitive. Passing if any match:

**Keywords:**
- `cookie-consent`
- `CookieConsent`
- `gdpr`
- `ccpa`
- `cookie-banner`
- `cookie_banner`
- `cookieconsent`

**Known Libraries:**
- `react-cookie-consent`
- `@segment/consent-manager`
- `cookiebot`
- `cookiebot-react`
- `vanilla-cookieconsent`
- `cookie-consent-js`

**Sub-score:**

```
Detected = 10/10
Not detected = 0/10
```

**Auto-fixable:** Yes.

- **Next.js**: generates `components/CookieBanner.tsx` (or `src/components/CookieBanner.tsx`) and attempts to inject import + component into `layout.tsx` / `_app.tsx`
- **HTML / Vite**: generates `cookie-banner.html` snippet

> Note: auto-injected import uses `../components/CookieBanner`. Adjust to your project structure if needed.

---

### 5. Ads Placement

**Weight: 5**

Focuses on **post-approval compliance**. Initial reviewers rarely reject for missing ads (you need approval first to get the ad code). But severe placement violations can lead to bans after approval.

**Dimensions:**

| Dimension | Deduction |
|-----------|-----------|
| Ad near interactive elements (button, input, textarea, select, QR code) within 5 lines | **-5** per page |
| Mobile (`@media ... max-width: 767`) ads > 2 | **-5** |
| No `<ins class="adsbygoogle">` detected site-wide | **-5** |

**Sub-score Calculation:**

```
Score = max(0, 5 - min(total_deduction, 5))
```

**Auto-fixable:** No. Ad placement requires manual adjustment.

---

### 6. Authenticity

**Weight: 15**

AdSense review is fundamentally a **trust review**. Google must confirm you are a **real, credible, long-term entity** before placing ads. Split into **auto-detection** and **self-assessment**.

#### Auto-Detection (Tool Deducts Directly)

| Dimension | Detection Logic | Deduction |
|-----------|----------------|-----------|
| **Placeholder email** | `example.com`, `test.com`, `yourdomain.com`, etc. | **-3** |
| **Template placeholders** | `{{date}}`, `{{company}}`, `{{address}}`, etc. | **-3** |
| **Fake address patterns** | `123 Example Street`, `Your City`, `Sample Address` | **-2** |
| **Outdated copyright** | `© 20xx` more than 2 years old | **-2** |
| **Brand name mismatch** | `<title>` or `<h1>` site name differs between About and Contact | **-2** |
| **Doorway pages** | Non-utility pages with < 50 words; or two pages > 75% similar | **-3** each |
| **Images without alt** | `<img>` missing `alt` attribute | **-2** per page |
| **Stock photo filenames** | Filename contains `shutterstock_`, `istock_`, `gettyimages_`, etc. | **-2** per page |
| **AI-writing cliches** | 3+ occurrences of AI typical phrases (e.g. "delve into", "robust", "ever-evolving", "it is important to note") | **-2** |
| **Keyword stuffing** | Any non-stopword appears > 8% of text (e.g. "SEO SEO SEO...") | **-3** per page |
| **Hidden text** | Inline styles like `color: transparent`, `display: none`, `font-size: 0` used to hide text | **-3** per page |

#### Self-Assessment (Listed in Report, Manual Review Required)

Items the tool **cannot auto-judge** but reviewers **do check manually**:

| Check Item | Impact | Notes |
|------------|--------|-------|
| Is all content original (not AI-spun or copied)? | **±5 pts** | AI-generated content can be rejected even with sufficient word count |
| Are team/author photos original or properly licensed? | **±3 pts** | Stock images and AI-generated portraits are easily spotted |
| Do images match their captions / descriptions? | **±3 pts** | Mismatched image-text is a low-quality signal |
| Is the phone number real and reachable? | **±3 pts** | Reviewers may attempt to call |
| Does the stated company match WHOIS / social profiles? | **±2 pts** | Cross-verification of identity |
| Are there doorway pages created just for SEO/ads? | **±5 pts** | Doorway pages are explicit policy violations |

**Sub-score Calculation:**

```
Score = max(0, 15 - min(total_auto_deduction, 15))
```

Self-assessment items **do NOT affect the automatic score**, but appear in a `Self-Assessment` block at the end of the report. Review each item; if any are false, mentally deduct the corresponding points from your total.

**Auto-fixable:** No. Authenticity must be ensured by humans.

---

## Auto-Fix (`--fix`) Behavior

Running `adsense-lint --fix` will:

1. **Required Pages**: Generate base pages for missing `/about`, `/privacy`, `/contact`, `/terms`
   - Next.js App Router → `app/{page}/page.tsx`
   - Next.js Pages Router → `pages/{page}.tsx`
   - HTML → `{page}.html`
   - Content pulled from `templates/{page}.md`, auto-wrapped for the target framework

2. **Cookie Consent**: Generate a base Cookie Banner component/script

3. **Non-fixable items**: Page Structure, Content Quality, Ads Placement, and Authenticity issues are marked `fixable: false` and require manual action

Use `--dry-run` to preview fixes without writing any files.

---

## JSON Output Format

Running `adsense-lint --json` produces:

```json
{
  "score": 62,
  "pass": false,
  "grade": "FAIL",
  "checks": [
    {
      "name": "required-pages",
      "score": 15,
      "weight": 30,
      "passed": false,
      "issues": [
        {
          "message": "Missing /contact page",
          "fixable": true,
          "template": "contact.md"
        }
      ]
    }
  ],
  "selfAssessment": [
    {
      "question": "Is all content original (not AI-spun or copied)?",
      "impact": "±5 pts"
    }
  ]
}
```

---

## Scoring Example

A site with:
- Missing Contact (-7.5) and Terms (-7.5) → Required Pages **15/30**
- No cookie banner → Cookie Consent **0/10**
- 2 pages missing meta description → Page Structure **9/15**
- 1 page low word count, 1 placeholder → Content Quality **15/25**
- Ad placement OK → Ads Placement **5/5**
- Placeholder email + outdated copyright → Authenticity **10/15**

**Total:**

```
15 × 30/100 + 0 × 10/100 + 9 × 15/100 + 15 × 25/100 + 5 × 5/100 + 10 × 15/100
= 4.5 + 0 + 1.35 + 3.75 + 0.25 + 1.5
= 11.35
```

> Note: The CLI rounds the final score to an integer.

---

## Tech Stack

- Node.js 20+
- TypeScript 5
- Commander.js (CLI)
- fast-glob (file scanning)

No AST parser. Everything uses regex and string matching to stay lightweight.
