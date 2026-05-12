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
      score: found ? WEIGHT : 0,
      issues,
    };
  },
};
