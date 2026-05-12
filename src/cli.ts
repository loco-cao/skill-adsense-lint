#!/usr/bin/env node

import { Command } from 'commander';
import { scanProject } from './scanner.js';
import { checks } from './checks/index.js';
import { report, calculateTotalScore, getGrade } from './reporter.js';
import { applyFixes } from './fixer.js';
import type { CheckContext, CheckResult } from './types.js';

const program = new Command();

program
  .name('adsense-lint')
  .description('Check if your website meets Google AdSense approval requirements')
  .version('0.1.0')
  .option('--json', 'Output results as JSON')
  .option('--fix', 'Auto-fix issues where possible')
  .option('--pages-dir <dir>', 'Custom pages directory (relative to cwd)')
  .option('--dry-run', 'Show what --fix would do without making changes')
  .action(async (options) => {
    try {
      const context = await scanProject({ pagesDir: options.pagesDir });

      if (context.pages.length === 0 && context.projectType === 'unknown') {
        console.error('Could not detect project type or find any pages.');
        console.error('Supported: Next.js (app/pages), Vite, plain HTML.');
        process.exit(1);
      }

      const results: CheckResult[] = [];
      for (const check of checks) {
        try {
          const result = await check.check(context);
          results.push(result);
        } catch (err) {
          results.push({
            name: check.name,
            weight: check.weight,
            passed: false,
            score: 0,
            issues: [
              {
                message: `Check failed with error: ${(err as Error).message}`,
                fixable: false,
              },
            ],
          });
        }
      }

      let fixableCount = 0;
      for (const result of results) {
        for (const issue of result.issues) {
          if (issue.fixable) fixableCount++;
        }
      }

      if (options.fix) {
        const fixResult = await applyFixes(context, results, { dryRun: options.dryRun });
        if (!options.json) {
          console.log(`Fixed ${fixResult.applied} issue(s), skipped ${fixResult.skipped}.`);
          if (fixResult.details.length > 0) {
            console.log('');
            for (const detail of fixResult.details) {
              console.log(detail);
            }
          }
          console.log('');
        }
      }

      report(results, { json: options.json, fixableCount });

      const totalScore = calculateTotalScore(results);
      const grade = getGrade(totalScore);
      process.exit(grade === 'PASS' ? 0 : 1);
    } catch (err) {
      console.error('Unexpected error:', (err as Error).message);
      process.exit(1);
    }
  });

program.parse();
