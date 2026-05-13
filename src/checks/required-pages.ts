import type { Check, CheckContext, CheckResult } from '../types.js';

const REQUIRED_PAGES = ['about', 'privacy', 'contact', 'terms'];
const WEIGHT = 30;

export const requiredPagesCheck: Check = {
  name: 'Required Pages',
  weight: WEIGHT,
  async check(context: CheckContext): Promise<CheckResult> {
    const issues: CheckResult['issues'] = [];
    const foundRoutes = new Set(context.pages.map((p) => p.route.toLowerCase()));

    for (const page of REQUIRED_PAGES) {
      const routeVariants = [`/${page}`, `/${page}-us`, `/${page}-us-1`, `/${page}-us-2`];
      const hasPage = routeVariants.some((r) => foundRoutes.has(r));

      if (!hasPage) {
        issues.push({
          message: `Missing /${page} page`,
          fixable: true,
          template: `${page}.md`,
        });
      }
    }

    const score = Math.max(0, 100 - issues.length * (100 / REQUIRED_PAGES.length));
    const passed = score >= 70;

    if (score === 100) {
      issues.unshift({
        message: 'All 4 required pages exist (about, privacy, contact, terms)',
        fixable: false,
      });
    }

    return {
      name: this.name,
      weight: WEIGHT,
      passed,
      score: Math.round(score),
      issues,
    };
  },
};
