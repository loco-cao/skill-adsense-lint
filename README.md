# adsense-lint

[![npm version](https://img.shields.io/npm/v/adsense-lint)](https://www.npmjs.com/package/adsense-lint)
[![Node.js](https://img.shields.io/node/v/adsense-lint)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/npm/l/adsense-lint)](LICENSE)
[![Downloads](https://img.shields.io/npm/dm/adsense-lint)](https://www.npmjs.com/package/adsense-lint)

> Audit your website against Google AdSense approval criteria. Get a transparent score, actionable fixes, and auto-generate missing compliance pages.

**adsense-lint** scans your project (Next.js, Vite, or plain HTML) and checks the six dimensions AdSense reviewers actually evaluate: required pages, content quality, page structure, cookie consent, ad placement, and authenticity. No black-box scoring — every deduction is explained.

## Table of Contents

- [Preview](#preview)
- [Features](#features)
- [Install](#install)
- [Usage](#usage)
- [Project Type Detection](#project-type-detection)
- [Scoring](#scoring)
- [Checks](#checks)
- [Auto-Fix](#auto-fix)
- [JSON Output](#json-output)
- [Exit Codes](#exit-codes)
- [FAQ](#faq)
- [License](#license)

## Preview

```bash
$ npx adsense-lint

AdSense Readiness Score: 62/100 ❌

Required Pages     [15/30]  ❌
  → Missing /contact page
  → Missing /terms page
Cookie Consent     [0/10]   ❌
  → No cookie consent mechanism detected
Page Structure     [15/15]  ✓
Content Quality    [15/25]  ❌
  → /about content too short (105 words, minimum 300)
Ads Placement      [5/5]    ✓
Authenticity       [10/15]  ❌
  → Detected placeholder email domain (@example.com)

────────────────────────────────────────
Self-Assessment (requires manual review)
────────────────────────────────────────
[?] Is all content original (not AI-spun or copied)? — impact: ±5 pts

Run `npx adsense-lint --fix` to auto-fix 3 issues.
```

## Features

- **Zero-config scanning** — auto-detects Next.js App Router, Next.js Pages Router, Vite, and plain HTML
- **6 check dimensions** — based on real-world AdSense rejection patterns
- **Fully transparent scoring** — every check shows its formula, thresholds, and deductions
- **Auto-fix** — generates missing About, Privacy, Contact, Terms pages and a cookie banner
- **JSON mode** — machine-readable output for CI/CD pipelines and AI agents
- **Self-assessment block** — flags items tools cannot verify but reviewers check manually

## Install

### npx (recommended)

```bash
npx adsense-lint
```

### Global install

```bash
npm install -g adsense-lint
adsense-lint
```

### Local development

```bash
git clone https://github.com/loco-cao/adsense-lint.git
cd adsense-lint
npm install
npm run build
npm link
```

## Usage

```bash
# Default scan — table report
adsense-lint

# JSON output (for CI or AI parsing)
adsense-lint --json

# Auto-fix recoverable issues
adsense-lint --fix

# Preview fixes without writing files
adsense-lint --fix --dry-run

# Scan a custom directory
adsense-lint --pages-dir src/app
```

### CLI Options

| Option | Description |
|--------|-------------|
| `--json` | Output results as JSON |
| `--fix` | Auto-fix issues where possible |
| `--dry-run` | Show what `--fix` would do without writing |
| `--pages-dir <dir>` | Custom pages directory relative to cwd |
| `-V, --version` | Show version number |
| `-h, --help` | Show help |

## Project Type Detection

| Type | Detection Rule |
|------|---------------|
| **Next.js App Router** | `next.config.*` exists **and** `app/layout.tsx` (or `src/app/layout.tsx`) exists |
| **Next.js Pages Router** | `next.config.*` exists **and** `pages/` (or `src/pages/`) exists |
| **Vite** | `vite.config.*` exists |
| **Plain HTML** | `*.html` files exist in the root |

When using `--pages-dir`, the tool infers the type from the target directory:
- Contains `layout.tsx` → Next.js App Router
- Contains `_app.tsx` → Next.js Pages Router
- Contains `*.html` → Plain HTML

## Scoring

### Formula

```
totalScore = Σ (check.score × check.weight / 100)
```

### Grade Thresholds

| Score | Grade | Meaning |
|-------|-------|---------|
| 90 – 100 | **PASS** | Ready to apply for AdSense |
| 70 – 89 | **WARN** | Close; fix the failing checks |
| < 70 | **FAIL** | Hard deficiencies; do not apply yet |

### Weights

| Check | Weight | Rationale |
|-------|--------|-----------|
| Required Pages | 30 | Reviewers check these first; missing any is a strong negative signal |
| Content Quality | 25 | The #1 global reason for AdSense rejection |
| Page Structure | 15 | Professionalism signal; less critical than content |
| Cookie Consent | 10 | Required for EU traffic; rising in importance |
| Ads Placement | 5 | Post-approval compliance; not a primary rejection cause |
| Authenticity | 15 | Trust review — reviewers verify you are a real entity |

## Checks

### Required Pages (weight: 30)

Checks for `/about`, `/privacy`, `/contact`, `/terms`.

**Scoring:** `30 - missing_count × 7.5`

**Auto-fixable:** Yes. `--fix` generates pages from `templates/`.

### Content Quality (weight: 25)

| Dimension | Threshold | Deduction |
|-----------|-----------|-----------|
| Word count too low | < 300 words | -5 per page |
| Placeholder text | Detected | -5 per occurrence |

**Placeholders detected:** `lorem ipsum`, `placeholder`, `todo`, `coming soon`, `under construction`, `insert text here`, `sample text`

**Auto-fixable:** No.

### Page Structure (weight: 15)

Per-page checks for Title, Meta Description, and H1. Each missing item deducts 3 points.

**Auto-fixable:** No.

### Cookie Consent (weight: 10)

Scans all page sources for cookie-consent keywords (`gdpr`, `ccpa`, `cookie-banner`, etc.) and known libraries (`react-cookie-consent`, `cookiebot`, etc.).

**Binary score:** 10 if detected, 0 if not.

**Auto-fixable:** Yes. Generates a CookieBanner component or HTML snippet.

### Ads Placement (weight: 5)

| Dimension | Deduction |
|-----------|-----------|
| Ad near interactive elements (within 5 lines) | -5 per page |
| Mobile ads > 2 | -5 |
| No AdSense units detected | -5 |

**Auto-fixable:** No.

### Authenticity (weight: 15)

#### Auto-detected (direct deduction)

| Signal | Deduction |
|--------|-----------|
| Placeholder email (`@example.com`, etc.) | -3 |
| Template placeholders (`{{date}}`, etc.) | -3 |
| Fake address patterns | -2 |
| Outdated copyright (> 2 years old) | -2 |
| Brand name mismatch across pages | -2 |
| Doorway page (< 50 words) | -3 |
| Duplicate content (> 75% similarity) | -3 |
| Images without `alt` | -2 |
| Stock photo filenames | -2 |
| AI-writing cliches (≥ 3 occurrences) | -2 |
| Keyword stuffing (> 8% density) | -3 |
| Hidden text via inline CSS | -3 |

#### Self-Assessment (manual review required)

These items are listed in the report but require human verification:

- Content originality (±5 pts)
- Photo licensing (±3 pts)
- Image-caption consistency (±3 pts)
- Phone number reachability (±3 pts)
- Company-WHOIS consistency (±2 pts)
- Doorway pages for SEO/ads (±5 pts)

## Auto-Fix

`adsense-lint --fix` handles the following automatically:

1. **Missing required pages** — generates `about`, `privacy`, `contact`, `terms` from templates
   - Next.js App Router → `app/{page}/page.tsx`
   - Next.js Pages Router → `pages/{page}.tsx`
   - HTML → `{page}.html`

2. **Missing cookie consent** — generates `CookieBanner.tsx` (or `cookie-banner.html`)

Use `--dry-run` to preview without writing files.

## JSON Output

```bash
adsense-lint --json
```

Produces:

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

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | PASS (score ≥ 90) |
| 1 | WARN or FAIL, or fatal error |

## FAQ

**Q: Will this guarantee AdSense approval?**

No. This tool catches technical and structural issues, but AdSense reviewers also perform manual trust checks (originality, brand consistency, photo authenticity) that cannot be fully automated. Use the Self-Assessment section as a checklist.

**Q: Can I run this on a Next.js project inside a monorepo?**

Yes. Use `--pages-dir` to point to the app or pages directory:

```bash
adsense-lint --pages-dir apps/web/src/app
```

**Q: Why does my score drop after auto-fix?**

Auto-fix generates base pages from templates. These pages satisfy the *existence* check but may still fail *content quality* if you do not replace the `[Your X]` placeholders with real information.

**Q: Does this work with React/Vue/Svelte?**

It works with Next.js (App and Pages Router), Vite, and plain HTML. Other frameworks are treated as `unknown` unless their file structure matches one of the detected types.

## License

MIT © [lococao](https://github.com/loco-cao)
