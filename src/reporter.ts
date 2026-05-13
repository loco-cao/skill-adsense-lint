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

  console.log(`${'Dimension'.padEnd(18)} ${'Raw Score'.padEnd(12)} ${'Weight'.padEnd(10)} ${'Weighted'.padEnd(10)} Status`);
  console.log(`${'-'.repeat(18)} ${'-'.repeat(12)} ${'-'.repeat(10)} ${'-'.repeat(10)} ${'-'.repeat(6)}`);

  for (const result of results) {
    const checkIcon = result.passed ? '✓' : '❌';
    const paddedName = result.name.padEnd(18, ' ');
    const rawScore = `${result.score}/100`.padEnd(12, ' ');
    const weightStr = `${result.weight}%`.padEnd(10, ' ');
    const weighted = ((result.score * result.weight) / 100).toFixed(1).padEnd(10, ' ');
    console.log(`${paddedName} ${rawScore} ${weightStr} ${weighted} ${checkIcon}`);

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

  console.log(`${'-'.repeat(18)} ${'-'.repeat(12)} ${'-'.repeat(10)} ${'-'.repeat(10)}`);
  const totalStr = 'Total'.padEnd(18, ' ');
  const blank1 = ''.padEnd(12, ' ');
  const blank2 = ''.padEnd(10, ' ');
  const totalWeighted = Math.round(totalScore).toString().padEnd(10, ' ');
  console.log(`${totalStr} ${blank1} ${blank2} ${totalWeighted}`);

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
