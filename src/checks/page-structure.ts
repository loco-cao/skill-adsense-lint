import type { Check, CheckContext, CheckResult } from '../types.js';

const WEIGHT = 15;

export const pageStructureCheck: Check = {
  name: 'Page Structure',
  weight: WEIGHT,
  async check(context: CheckContext): Promise<CheckResult> {
    const issues: CheckResult['issues'] = [];
    let totalDeduction = 0;
    const deductionPerIssue = 3;
    const maxDeduction = WEIGHT;

    for (const page of context.pages) {
      const content = page.content;

      const hasTitle = hasTitleTag(content, context.projectType);
      const hasMetaDesc = hasMetaDescription(content, context.projectType);
      const hasH1 = /<h1[\s>]/i.test(content) || content.includes('# ');

      if (!hasTitle) {
        issues.push({
          message: `Missing <title> or metadata.title on ${page.route}`,
          route: page.route,
          filePath: page.filePath,
          fixable: false,
        });
        totalDeduction += deductionPerIssue;
      }

      if (!hasMetaDesc) {
        issues.push({
          message: `Missing meta description on ${page.route}`,
          route: page.route,
          filePath: page.filePath,
          fixable: false,
        });
        totalDeduction += deductionPerIssue;
      }

      if (!hasH1) {
        issues.push({
          message: `Missing <h1> on ${page.route}`,
          route: page.route,
          filePath: page.filePath,
          fixable: false,
        });
        totalDeduction += deductionPerIssue;
      }

      if (totalDeduction >= maxDeduction) break;
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

function hasTitleTag(content: string, projectType: CheckContext['projectType']): boolean {
  if (projectType === 'nextjs-app') {
    if (/export\s+const\s+metadata\s*[:=]/s.test(content)) {
      if (/title\s*:/.test(content)) return true;
    }
  }
  if (/<title[\s>]/i.test(content)) return true;
  if (/metadata\.title/.test(content)) return true;
  return false;
}

function hasMetaDescription(content: string, projectType: CheckContext['projectType']): boolean {
  if (projectType === 'nextjs-app') {
    if (/export\s+const\s+metadata\s*[:=]/s.test(content)) {
      if (/description\s*:/.test(content)) return true;
    }
  }
  if (/<meta[^>]+name=["']description["']/i.test(content)) return true;
  if (/metadata\.description/.test(content)) return true;
  return false;
}
