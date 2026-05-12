import type { Check, CheckContext, CheckResult } from '../types.js';

const WEIGHT = 5;

export const adsPlacementCheck: Check = {
  name: 'Ads Placement',
  weight: WEIGHT,
  async check(context: CheckContext): Promise<CheckResult> {
    const issues: CheckResult['issues'] = [];
    let totalDeduction = 0;
    const deductionPerIssue = 5;
    const maxDeduction = WEIGHT;

    let totalAds = 0;
    let mobileAds = 0;

    for (const page of context.pages) {
      if (totalDeduction >= maxDeduction) break;
      const content = page.content;

      const adsMatches = content.match(/<ins\s+class=["']adsbygoogle["']/gi) || [];
      totalAds += adsMatches.length;

      const mobileMatches = content.match(/@media\s*\([^)]*max-width:\s*767/gi) || [];
      if (mobileMatches.length > 0) {
        mobileAds += adsMatches.length;
      }

      const hasInteractiveNearAd = checkInteractiveNearAd(content);
      if (hasInteractiveNearAd) {
        issues.push({
          message: `${page.route} has ads placed near interactive elements (buttons, inputs, QR codes)`,
          route: page.route,
          filePath: page.filePath,
          fixable: false,
        });
        totalDeduction += deductionPerIssue;
      }
    }

    if (mobileAds > 2) {
      issues.push({
        message: `More than 2 ads detected on mobile viewport (${mobileAds})`,
        fixable: false,
      });
      totalDeduction += deductionPerIssue;
    }

    if (totalAds === 0) {
      issues.push({
        message: 'No AdSense ad units detected on the site',
        fixable: false,
      });
      totalDeduction += deductionPerIssue;
    }

    const score = Math.max(0, WEIGHT - Math.min(totalDeduction, maxDeduction));

    return {
      name: this.name,
      weight: WEIGHT,
      passed: score >= WEIGHT * 0.7,
      score: Math.round(score),
      issues,
    };
  },
};

function checkInteractiveNearAd(content: string): boolean {
  const interactivePatterns = [
    /<button[\s>]/i,
    /<input[\s>]/i,
    /<textarea[\s>]/i,
    /<select[\s>]/i,
    /qr[\s_-]?code/i,
    /qrcode/i,
  ];

  const lines = content.split('\n');
  const adLineIndices: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (/<ins\s+class=["']adsbygoogle["']/i.test(lines[i])) {
      adLineIndices.push(i);
    }
  }

  for (const adIndex of adLineIndices) {
    const start = Math.max(0, adIndex - 5);
    const end = Math.min(lines.length, adIndex + 6);
    const nearby = lines.slice(start, end).join('\n');

    for (const pattern of interactivePatterns) {
      if (pattern.test(nearby)) {
        return true;
      }
    }
  }

  return false;
}
