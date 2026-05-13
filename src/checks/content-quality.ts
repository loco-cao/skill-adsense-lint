import type { Check, CheckContext, CheckResult } from '../types.js';

const WEIGHT = 25;
const MIN_WORD_COUNT = 300;

const PLACEHOLDERS = [
  'lorem ipsum',
  'placeholder',
  'todo',
  'coming soon',
  'under construction',
  'insert text here',
  'sample text',
];

export const contentQualityCheck: Check = {
  name: 'Content Quality',
  weight: WEIGHT,
  async check(context: CheckContext): Promise<CheckResult> {
    const issues: CheckResult['issues'] = [];
    let totalDeduction = 0;
    const deductionPerIssue = 5;
    const maxDeduction = WEIGHT;

    for (const page of context.pages) {
      if (totalDeduction >= maxDeduction) break;

      const text = stripHtmlAndCode(page.content);
      const wordCount = countWords(text);

      if (wordCount < MIN_WORD_COUNT) {
        issues.push({
          message: `${page.route} content too short (${wordCount} words, minimum ${MIN_WORD_COUNT})`,
          route: page.route,
          filePath: page.filePath,
          fixable: false,
        });
        totalDeduction += deductionPerIssue;
      }

      const lowerText = text.toLowerCase();
      for (const placeholder of PLACEHOLDERS) {
        if (lowerText.includes(placeholder)) {
          issues.push({
            message: `${page.route} contains placeholder text: "${placeholder}"`,
            route: page.route,
            filePath: page.filePath,
            fixable: false,
          });
          totalDeduction += deductionPerIssue;
          break;
        }
      }
    }

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

function stripHtmlAndCode(content: string): string {
  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/\{[^}\n]+\}/g, ' ')
    .replace(/import\s+.*?from\s+['"][^'"]+['"];?/g, ' ')
    .replace(/export\s+default\s+/g, ' ')
    .replace(/export\s+const\s+metadata\s*=\s*\{[^{}]*\};?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  return words.length;
}
