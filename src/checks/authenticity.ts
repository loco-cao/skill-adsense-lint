import type { Check, CheckContext, CheckResult } from '../types.js';

const WEIGHT = 15;

const SUSPICIOUS_EMAIL_DOMAINS = [
  'example.com',
  'test.com',
  'email.com',
  'domain.com',
  'yourdomain.com',
  'company.com',
  'sample.com',
  'demo.com',
];

const TEMPLATE_PLACEHOLDERS = [
  '{{date}}',
  '{{company}}',
  '{{company_name}}',
  '{{site_name}}',
  '{{domain}}',
  '{{email}}',
  '{{address}}',
  '{{year}}',
  '{{name}}',
];

const FAKE_ADDRESS_PATTERNS = [
  '123 example street',
  '123 main st',
  '123 test street',
  'sample address',
  'your city',
  'your country',
  '123 anywhere',
];

const COPYRIGHT_YEAR_PATTERN = /©\s*(\d{4})/gi;

const STOCK_PHOTO_PATTERNS = [
  /shutterstock[\-_]?\d+/i,
  /istock[\-_]?\d+/i,
  /gettyimages[\-_]?\d+/i,
  /stock[\-_]?photo[\-_]?\d+/i,
  /depositphotos[\-_]?\d+/i,
  /adobestock[\-_]?\d+/i,
];

const AI_PATTERN_WORDS = [
  'in conclusion',
  'it is important to note',
  'it is worth noting',
  'it should be noted',
  'delve into',
  'navigate the complexities',
  'landscape of',
  'tapestry of',
  'multifaceted',
  'ever-evolving',
  'crucial',
  'paramount',
  'underscores the importance',
  'serves as a testament',
  'a myriad of',
  'plethora of',
  'robust',
  'holistic',
  'seamless',
];

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'and', 'in', 'on', 'at', 'by', 'for', 'with', 'about',
  'from', 'up', 'out', 'over', 'under', 'again', 'further', 'then', 'once',
  'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our',
  'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them',
  'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all',
  'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'should', 'now',
]);

export const authenticityCheck: Check = {
  name: 'Authenticity',
  weight: WEIGHT,
  async check(context: CheckContext): Promise<CheckResult> {
    const issues: CheckResult['issues'] = [];
    let totalDeduction = 0;
    const maxDeduction = WEIGHT;

    const allContent = context.pages.map((p) => p.content).join('\n');
    const lowerContent = allContent.toLowerCase();

    // 1. Detect placeholder emails
    for (const domain of SUSPICIOUS_EMAIL_DOMAINS) {
      if (lowerContent.includes(`@${domain}`)) {
        issues.push({
          message: `Detected placeholder email domain (@${domain}) — reviewers verify contact info`,
          fixable: false,
        });
        totalDeduction += 3;
        break;
      }
    }

    // 2. Detect template placeholders
    for (const placeholder of TEMPLATE_PLACEHOLDERS) {
      if (allContent.includes(placeholder)) {
        issues.push({
          message: `Detected template placeholder "${placeholder}" — replace with real info`,
          fixable: false,
        });
        totalDeduction += 3;
        break;
      }
    }

    // 3. Detect fake address patterns
    for (const addr of FAKE_ADDRESS_PATTERNS) {
      if (lowerContent.includes(addr)) {
        issues.push({
          message: `Detected suspicious address text "${addr}" — use a real address or city only`,
          fixable: false,
        });
        totalDeduction += 2;
        break;
      }
    }

    // 4. Detect outdated copyright year
    const currentYear = new Date().getFullYear();
    const copyrightMatches = [...allContent.matchAll(COPYRIGHT_YEAR_PATTERN)];
    for (const match of copyrightMatches) {
      const year = parseInt(match[1], 10);
      if (currentYear - year > 2) {
        issues.push({
          message: `Copyright year ${year} is outdated (current year ${currentYear}) — update footer`,
          fixable: false,
        });
        totalDeduction += 2;
        break;
      }
    }

    // 5. Detect brand name mismatches across pages
    const brandMismatches = detectBrandMismatches(context);
    if (brandMismatches.length > 0) {
      for (const msg of brandMismatches.slice(0, 1)) {
        issues.push({ message: msg, fixable: false });
        totalDeduction += 2;
      }
    }

    // 6. Doorway page detection (thin content, duplicates)
    for (const page of context.pages) {
      if (totalDeduction >= maxDeduction) break;
      const text = stripTagsAndCode(page.content);
      const wordCount = countWords(text);

      // Very thin pages (<50 words) that are not utility pages
      if (wordCount < 50 && !isUtilityPage(page.route)) {
        issues.push({
          message: `${page.route} looks like a doorway page (${wordCount} words) — thin content triggers rejection`,
          route: page.route,
          fixable: false,
        });
        totalDeduction += 3;
      }
    }

    // Duplicate content detection
    const duplicates = detectDuplicatePages(context);
    if (duplicates.length > 0) {
      for (const msg of duplicates.slice(0, 1)) {
        issues.push({ message: msg, fixable: false });
        totalDeduction += 3;
      }
    }

    // 7. Stock photo / missing alt detection
    for (const page of context.pages) {
      if (totalDeduction >= maxDeduction) break;
      const imgMatches = page.content.match(/<img[^>]+>/gi) || [];
      for (const imgTag of imgMatches) {
        const hasAlt = /alt\s*=\s*["'][^"]*["']/i.test(imgTag);
        if (!hasAlt) {
          issues.push({
            message: `${page.route} has images without alt text — accessibility and trust signal`,
            route: page.route,
            fixable: false,
          });
          totalDeduction += 2;
          break;
        }
      }

      const srcMatch = page.content.match(/src\s*=\s*["']([^"']+)["']/gi);
      if (srcMatch) {
        for (const src of srcMatch) {
          for (const pattern of STOCK_PHOTO_PATTERNS) {
            if (pattern.test(src)) {
              issues.push({
                message: `${page.route} uses stock photo filename — reviewers prefer original visuals`,
                route: page.route,
                fixable: false,
              });
              totalDeduction += 2;
              break;
            }
          }
        }
      }
    }

    // 8. AI writing pattern detection
    const aiPatterns = detectAIPatterns(context);
    if (aiPatterns.length > 0) {
      for (const msg of aiPatterns.slice(0, 2)) {
        issues.push({ message: msg, fixable: false });
        totalDeduction += 2;
      }
    }

    // 9. Keyword stuffing detection
    const keywordStuffing = detectKeywordStuffing(context);
    if (keywordStuffing.length > 0) {
      for (const msg of keywordStuffing.slice(0, 1)) {
        issues.push({ message: msg, fixable: false });
        totalDeduction += 3;
      }
    }

    // 10. Hidden text detection
    const hiddenText = detectHiddenText(context);
    if (hiddenText.length > 0) {
      for (const msg of hiddenText.slice(0, 1)) {
        issues.push({ message: msg, fixable: false });
        totalDeduction += 3;
      }
    }

    // 11. Self-assessment items (not auto-deducted, but must appear in report)
    issues.push({
      message: '[Self-Check] Is all content original (not AI-spun or copied)? Impact: ±5 pts',
      fixable: false,
    });
    issues.push({
      message: '[Self-Check] Are team/author photos original or properly licensed? Impact: ±3 pts',
      fixable: false,
    });
    issues.push({
      message: '[Self-Check] Do images match their captions / surrounding descriptions? Impact: ±3 pts',
      fixable: false,
    });
    issues.push({
      message: '[Self-Check] Is the phone number real and reachable? Impact: ±3 pts',
      fixable: false,
    });
    issues.push({
      message: '[Self-Check] Does the stated company match WHOIS / social profiles? Impact: ±2 pts',
      fixable: false,
    });
    issues.push({
      message: '[Self-Check] Are there doorway pages created just for SEO/ads? Impact: ±5 pts',
      fixable: false,
    });

    const score = Math.max(0, 100 - (Math.min(totalDeduction, maxDeduction) / maxDeduction) * 100);

    return {
      name: this.name,
      weight: WEIGHT,
      passed: score >= 70,
      score: Math.round(score),
      issues,
    };
  },
};

const GENERIC_TITLES = new Set([
  'us', 'home', 'page', 'information', 'details', 'more', 'here',
  'welcome', 'overview', 'introduction',
]);

function detectBrandMismatches(context: CheckContext): string[] {
  const mismatches: string[] = [];
  const pages = context.pages;
  if (pages.length < 2) return mismatches;

  const aboutPage = pages.find((p) => p.route.toLowerCase().includes('about'));
  const contactPage = pages.find((p) => p.route.toLowerCase().includes('contact'));

  if (!aboutPage || !contactPage) return mismatches;

  const aboutTitle = extractTitleText(aboutPage.content);
  const contactTitle = extractTitleText(contactPage.content);

  if (aboutTitle && contactTitle && aboutTitle !== contactTitle) {
    const aboutBase = aboutTitle.replace(/^(about|contact|privacy|terms)\s*[\|\-–]\s*/i, '').trim();
    const contactBase = contactTitle.replace(/^(about|contact|privacy|terms)\s*[\|\-–]\s*/i, '').trim();
    // Skip if one side resolves to a generic title (not a brand name)
    if (
      aboutBase &&
      contactBase &&
      aboutBase !== contactBase &&
      !GENERIC_TITLES.has(aboutBase.toLowerCase()) &&
      !GENERIC_TITLES.has(contactBase.toLowerCase())
    ) {
      mismatches.push(`Brand name mismatch: About page title "${aboutBase}" vs Contact page title "${contactBase}"`);
    }
  }

  return mismatches;
}

function extractTitleText(content: string): string | null {
  const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].trim();
  const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) return h1Match[1].trim();
  return null;
}

function isUtilityPage(route: string): boolean {
  const r = route.toLowerCase();
  return r.includes('privacy') || r.includes('terms') || r.includes('contact') || r.includes('cookie');
}

function stripTagsAndCode(content: string): string {
  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^}\n]+\}/g, ' ')
    .replace(/import\s+.*?from\s+['"][^'"]+['"];?/g, ' ')
    .replace(/export\s+default\s+/g, ' ')
    .replace(/export\s+const\s+metadata\s*=\s*\{[^{}]*\};?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function detectDuplicatePages(context: CheckContext): string[] {
  const duplicates: string[] = [];
  const stripped = context.pages.map((p) => ({ route: p.route, text: stripTagsAndCode(p.content) }));

  for (let i = 0; i < stripped.length; i++) {
    for (let j = i + 1; j < stripped.length; j++) {
      const a = stripped[i];
      const b = stripped[j];
      if (a.text.length < 50 || b.text.length < 50) continue;
      const sim = textSimilarity(a.text, b.text);
      if (sim > 0.75) {
        duplicates.push(`High content similarity (${Math.round(sim * 100)}%) between ${a.route} and ${b.route} — possible doorway/duplicate pages`);
        return duplicates;
      }
    }
  }
  return duplicates;
}

function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w)));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w)));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}

function detectAIPatterns(context: CheckContext): string[] {
  const found: string[] = [];
  const allText = context.pages.map((p) => stripTagsAndCode(p.content)).join(' ').toLowerCase();
  let patternCount = 0;

  for (const phrase of AI_PATTERN_WORDS) {
    const regex = new RegExp(phrase.replace(/\s+/g, '\\s+'), 'gi');
    const matches = allText.match(regex);
    if (matches) patternCount += matches.length;
  }

  if (patternCount >= 3) {
    found.push(`Content contains ${patternCount} AI-writing cliches (e.g. "delve into", "robust", "ever-evolving") — rewrite in natural voice`);
  }
  return found;
}

function detectKeywordStuffing(context: CheckContext): string[] {
  const found: string[] = [];

  for (const page of context.pages) {
    const text = stripTagsAndCode(page.content).toLowerCase();
    const words = text.split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w));
    const freq: Record<string, number> = {};
    for (const w of words) {
      freq[w] = (freq[w] || 0) + 1;
    }
    for (const [word, count] of Object.entries(freq)) {
      const density = count / words.length;
      if (density > 0.08) {
        found.push(`${page.route} keyword "${word}" appears ${(density * 100).toFixed(1)}% of text — possible keyword stuffing`);
        return found;
      }
    }
  }
  return found;
}

function detectHiddenText(context: CheckContext): string[] {
  const found: string[] = [];
  for (const page of context.pages) {
    // Detect hidden text via inline styles
    const hiddenStylePattern = /style\s*=\s*["'][^"']*(color\s*:\s*transparent|display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0)[^"']*["']/gi;
    if (hiddenStylePattern.test(page.content)) {
      found.push(`${page.route} contains inline CSS that hides text — AdSense sees this as deceptive`);
      return found;
    }

    // Detect text color matching background (simple mode)
    const sameColorPattern = /style\s*=\s*["'][^"']*color\s*:\s*#?fff[^"']*background\s*:\s*#?fff|background\s*:\s*#?fff[^"']*color\s*:\s*#?fff[^"']*["']/gi;
    if (sameColorPattern.test(page.content)) {
      found.push(`${page.route} text color matches background — hidden text violation`);
      return found;
    }
  }
  return found;
}
