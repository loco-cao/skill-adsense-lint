import type { Check, CheckContext, CheckResult } from '../types.js';

const KEYWORDS = [
  'cookie-consent',
  'CookieConsent',
  'gdpr',
  'ccpa',
  'cookie-banner',
  'cookie_banner',
  'cookieconsent',
];

const LIBRARIES = [
  'react-cookie-consent',
  '@segment/consent-manager',
  'cookiebot',
  'cookiebot-react',
  'vanilla-cookieconsent',
  'cookie-consent-js',
];

// Detect client-side rendered consent components (imported or JSX-used)
const COMPONENT_REFS = [
  /<CookieConsent[\s>]/,
  /import\s+\{?\s*CookieConsent\s*\}?/,
  /import\s+\{?\s*ConsentManager\s*\}?/,
  /import\s+\{?\s*CookieBanner\s*\}?/,
];

// Detect custom client-side implementations (useEffect + localStorage + cookie keywords)
const CUSTOM_IMPL_PATTERNS = [
  /useEffect\s*\([^)]*\)\s*\{[\s\S]{0,800}?(?:localStorage|sessionStorage)[\s\S]{0,400}?cookie/i,
  /useEffect\s*\([^)]*\)\s*\{[\s\S]{0,800}?cookie[\s\S]{0,400}?(?:localStorage|sessionStorage)/i,
  /(?:showBanner|setShowBanner|setCookieConsent|cookieConsent|consentGiven)/,
];

const WEIGHT = 10;

export const cookieConsentCheck: Check = {
  name: 'Cookie Consent',
  weight: WEIGHT,
  async check(context: CheckContext): Promise<CheckResult> {
    const issues: CheckResult['issues'] = [];
    let found = false;

    const allContent = context.pages.map((p) => p.content).join('\n');
    const lowerContent = allContent.toLowerCase();

    for (const keyword of KEYWORDS) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        found = true;
        break;
      }
    }

    if (!found) {
      for (const lib of LIBRARIES) {
        if (lowerContent.includes(lib.toLowerCase())) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      for (const pattern of COMPONENT_REFS) {
        if (pattern.test(allContent)) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      for (const pattern of CUSTOM_IMPL_PATTERNS) {
        if (pattern.test(allContent)) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      issues.push({
        message: 'No cookie consent mechanism detected',
        fixable: true,
        template: 'cookie-banner.tsx',
      });
    }

    return {
      name: this.name,
      weight: WEIGHT,
      passed: found,
      score: found ? 100 : 0,
      issues,
    };
  },
};
