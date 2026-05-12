import type { CheckResult } from './types.js';

export interface ReportOptions {
  json?: boolean;
  fixableCount?: number;
}

export function report(results: CheckResult[], options: ReportOptions = {}): void {
  if (options.json) {
    console.log(JSON.stringify(toJsonOutput(results), null, 2));
    return;
  }

  reportConsole(results, options.fixableCount ?? 0);
}

function toJsonOutput(results: CheckResult[]) {
  const totalScore = calculateTotalScore(results);
  const grade = getGrade(totalScore);

  const selfAssessment: Array<{ question: string; impact: string }> = [];
  for (const result of results) {
    for (const issue of result.issues) {
      if (issue.message.startsWith('[Self-Check]')) {
        const match = issue.message.match(/Impact: (.+)$/);
        selfAssessment.push({
          question: issue.message.replace(/^\[Self-Check\]\s*/, '').replace(/\s*—?\s*Impact: .+$/, ''),
          impact: match ? match[1] : '±? pts',
        });
      }
    }
  }

  return {
    score: Math.round(totalScore),
    pass: grade === 'PASS',
    grade,
    checks: results.map((r) => ({
      name: r.name.toLowerCase().replace(/\s+/g, '-'),
      score: r.score,
      weight: r.weight,
      passed: r.passed,
      issues: r.issues
        .filter((i) => !i.message.startsWith('[Self-Check]'))
        .map((i) => ({
          message: i.message,
          route: i.route,
          fixable: i.fixable,
          template: i.template,
        })),
    })),
    selfAssessment: selfAssessment.length > 0 ? selfAssessment : undefined,
  };
}

function reportConsole(results: CheckResult[], fixableCount: number): void {
  const totalScore = calculateTotalScore(results);
  const grade = getGrade(totalScore);
  const icon = grade === 'PASS' ? '✅' : grade === 'WARN' ? '⚠️' : '❌';

  console.log('');
  console.log(`AdSense Readiness Score: ${Math.round(totalScore)}/100 ${icon}`);
  console.log('');

  const selfChecks: Array<{ question: string; impact: string }> = [];

  for (const result of results) {
    const checkIcon = result.passed ? '✓' : '❌';
    const paddedName = result.name.padEnd(18, ' ');
    const scoreStr = `[${result.score}/${result.weight}]`.padEnd(8, ' ');
    console.log(`${paddedName} ${scoreStr} ${checkIcon}`);

    const autoIssues = result.issues.filter((i) => !i.message.startsWith('[Self-Check]'));
    const resultSelfChecks = result.issues.filter((i) => i.message.startsWith('[Self-Check]'));

    for (const issue of autoIssues.slice(0, 3)) {
      console.log(`  → ${issue.message}`);
    }
    if (autoIssues.length > 3) {
      console.log(`  → ... and ${autoIssues.length - 3} more issues`);
    }

    for (const issue of resultSelfChecks) {
      const match = issue.message.match(/Impact: (.+)$/);
      selfChecks.push({
        question: issue.message.replace(/^\[Self-Check\]\s*/, '').replace(/\s*—?\s*Impact: .+$/, ''),
        impact: match ? match[1] : '±? pts',
      });
    }
  }

  if (selfChecks.length > 0) {
    console.log('');
    console.log('────────────────────────────────────────');
    console.log('Self-Assessment (requires manual review)');
    console.log('────────────────────────────────────────');
    for (const check of selfChecks) {
      console.log(`[?] ${check.question} — impact: ${check.impact}`);
    }
  }

  console.log('');
  if (fixableCount > 0) {
    console.log(`Run \`npx adsense-lint --fix\` to auto-fix ${fixableCount} issue${fixableCount > 1 ? 's' : ''}.`);
    console.log('');
  }
}

export function calculateTotalScore(results: CheckResult[]): number {
  return results.reduce((sum, r) => sum + (r.score * r.weight) / 100, 0);
}

export function getGrade(score: number): 'PASS' | 'WARN' | 'FAIL' {
  if (score >= 90) return 'PASS';
  if (score >= 70) return 'WARN';
  return 'FAIL';
}
