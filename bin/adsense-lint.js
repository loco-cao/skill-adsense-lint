#!/usr/bin/env node

const { program } = require('commander');
const { selectPlatforms, confirmUninstall } = require('../lib/prompts.js');
const { installClaude, installCursor, uninstallClaude, uninstallCursor } = require('../lib/installer.js');
const { createSessionDirs } = require('../lib/session.js');
const { AgentRunner } = require('../lib/runner.js');
const { ANSI, colorize } = require('../lib/colors.js');
const fs = require('fs');
const path = require('path');
let pty;
try {
  pty = require('node-pty');
} catch (_) {
  pty = null;
}

program
  .name('adsense-lint')
  .description('AdSense multi-expert AI review system installer')
  .version(require('../package.json').version);

program
  .command('install', { isDefault: true })
  .description('Install AdSense Lint skills and agents')
  .action(async () => {
    let platforms;
    try {
      platforms = await selectPlatforms();
    } catch (err) {
      if (err.name === 'AbortPromptError') {
        console.log('\nCancelled.');
        process.exit(0);
      }
      throw err;
    }

    console.log('');
    console.log(colorize('[Installing...]', ANSI.bold));

    if (platforms.includes('claude')) {
      console.log('\nClaude Code:');
      installClaude();
    }

    if (platforms.includes('cursor')) {
      console.log('\nCursor:');
      installCursor();
    }

    console.log('');
    console.log(colorize('Installation complete!', ANSI.brightGreen));
    console.log('');
    console.log('Usage:');
    console.log('  /adsense-lint <https://example.com> [--auto]');
    console.log('  /adsense-lint --local');
    console.log('');
  });

program
  .command('uninstall')
  .description('Remove AdSense Lint skills and agents')
  .action(async () => {
    let confirmed;
    try {
      confirmed = await confirmUninstall();
    } catch (err) {
      if (err.name === 'AbortPromptError') {
        console.log('\nCancelled.');
        process.exit(0);
      }
      throw err;
    }

    if (!confirmed) {
      console.log('Uninstall cancelled.');
      process.exit(0);
    }

    console.log('\n[Uninstalling...]');
    uninstallClaude();
    uninstallCursor();
    console.log('\nUninstalled.');
  });

program
  .command('session')
  .description('Create a new audit session directory structure (cross-platform)')
  .option('-d, --dir <path>', 'Base directory for sessions', '.adsense-lint')
  .option('-t, --timestamp <ts>', 'Custom timestamp (format: YYYYMMDD-HHMMSS)')
  .action((options) => {
    const result = createSessionDirs(options.dir, options.timestamp);
    console.log('');
    console.log(`Session created: ${result.sessionDir}`);
    console.log('');
    for (let i = 0; i < result.experts.length; i++) {
      console.log(`  ${result.experts[i].id}/  (${result.experts[i].name})`);
    }
    console.log('');
  });

program
  .command('run [target]')
  .description('Run an audit with live agent status dashboard.')
  .option('--demo', 'Simulated demo (fake data, no real audit)')
  .option('--local', 'Audit the current local project directory instead of a remote URL')
  .action(async (target, options) => {
    const runner = new AgentRunner();

    console.log('');

    if (options.demo) {
      await runner.simulate(2000);
    } else if (options.local || target) {
      let label, skillCmd, cwd;

      if (options.local) {
        const projectPath = target ? path.resolve(target) : process.cwd();
        const absPath = path.resolve(projectPath);

        if (!fs.existsSync(absPath)) {
          console.log(colorize(`  Error: path not found: ${absPath}`, ANSI.red));
          console.log('');
          process.exit(1);
        }

        const hasFiles = checkWebProject(absPath);
        if (!hasFiles.ok) {
          console.log(colorize(`  Warning: ${hasFiles.reason}`, ANSI.yellow));
          console.log('');
        }

        label = `Local Audit — ${absPath}`;
        skillCmd = '/adsense-lint --local';
        cwd = absPath;
      } else {
        if (!/^https?:\/\//.test(target)) {
          console.log(colorize(`  Error: URL must start with http:// or https://`, ANSI.red));
          console.log(`  Got: ${target}`);
          console.log(`  Use --local flag for local project audits.`);
          console.log('');
          process.exit(1);
        }
        label = `Remote Audit — ${target}`;
        skillCmd = `/adsense-lint ${target}`;
        cwd = process.cwd();
      }

      console.log(`  ${colorize(label, ANSI.bold)}`);
      console.log('');

      // Show initial dashboard
      for (const agent of runner.agents) {
        runner.setStatus(agent.id, 'waiting', '');
      }
      runner.render();

      // Try to find claude and spawn it via PTY
      const claudeBin = pty ? findClaude() : null;
      if (claudeBin) {
        runner.statusLine = colorize('  Launching Claude Code via PTY...', ANSI.brightCyan);
        runner.render();
        runner.startSpinner();

        await spawnClaudeAndMonitor(claudeBin, skillCmd, cwd, runner);
      } else {
        // No PTY or no claude found — monitor-only mode
        runner.statusLine = colorize(`  Run in Claude Code chat: ${skillCmd}`, ANSI.brightCyan);
        runner.render();
        runner.startSpinner();
        if (!pty) {
          console.log(colorize('  node-pty not available (install with: npm i node-pty)', ANSI.yellow));
        }
        if (!findClaude()) {
          console.log(colorize('  Claude CLI not found.', ANSI.yellow));
        }
        console.log(colorize(`  Or run manually: ${skillCmd}`, ANSI.bold));
        console.log('');

        await monitorReportsOnly(runner, skillCmd, cwd);
      }
    } else {
      console.log(colorize('  Usage:', ANSI.bold));
      console.log('    adsense-lint run <url>         Remote audit via Claude Code');
      console.log('    adsense-lint run --local [dir] Local project audit');
      console.log('    adsense-lint run --demo        Simulated demo');
      console.log('');
      console.log('  In Claude Code chat:');
      console.log('    /adsense-lint <url>');
      console.log('    /adsense-lint --local');
      console.log('');
      process.exit(0);
    }

    const summary = runner.summary();
    if (summary) {
      const gradeColor = summary.grade === '不合格' ? ANSI.brightRed
        : summary.grade === '基本满足' ? ANSI.brightYellow
        : summary.grade === '待提升' ? ANSI.brightCyan
        : ANSI.brightGreen;
      const riskColor = summary.risk.includes('HIGH') ? ANSI.brightRed : ANSI.yellow;

      console.log(`\n  ${colorize('═'.repeat(62), ANSI.gray)}`);
      console.log(`  ${ANSI.bold}综合评分:${ANSI.reset} ${colorize(summary.final, ANSI.bold)}  等级: ${colorize(summary.grade, gradeColor)}  风险: ${colorize(summary.risk, riskColor)}`);
      if (summary.veto) {
        console.log(`  ${colorize('⚠ Policy 否决生效 — Policy 得分 <60，最终等级强制为不合格', ANSI.brightRed)}`);
      }
      console.log(`  ${colorize('═'.repeat(62), ANSI.gray)}`);
      console.log(`  ${ANSI.dim}专家          得分   权重    加权      优先级${ANSI.reset}`);
      console.log(`  ${ANSI.dim}────          ──    ──     ──       ────${ANSI.reset}`);
      if (summary.scores.length > 0) {
        for (const s of summary.scores) {
          const priorityColor = s.priority === 'Critical' ? ANSI.brightRed
            : s.priority === 'High' ? ANSI.brightYellow
            : s.priority === 'Medium' ? ANSI.brightCyan
            : ANSI.dim;
          const bar = '█'.repeat(Math.round(s.score / 5));
          console.log(`  ${s.name.padEnd(12)} ${colorize(String(s.score).padStart(3), ANSI.bold)}  × ${(s.weight * 100).toFixed(0).padStart(2)}%  = ${colorize((s.score * s.weight).toFixed(1).padStart(5), ANSI.dim)}  ${colorize(s.priority.padEnd(8), priorityColor)}  ${colorize(bar, ANSI.dim)}`);
        }
      }
      console.log('');
    }
  });

// ── Spawn claude in interactive mode, send skill command via stdin, monitor reports ──

async function spawnClaudeAndMonitor(claudeBin, skillCmd, cwd, runner) {
  return new Promise((resolve) => {
    let watchedSession = null;
    let bestCount = 0;
    const startTime = Date.now();
    const globalTimeout = 600_000;
    let claudeExited = false;
    let claudeCode = null;
    let resolved = false;
    let claudeOut = '';

    const done = (ok) => {
      if (resolved) return;
      resolved = true;
      resolve(ok);
    };

    const p = pty.spawn(claudeBin, [], {
      name: 'xterm-color',
      cols: 120,
      rows: 30,
      cwd,
      env: process.env,
    });

    const pid = p.pid;

    p.onData((d) => {
      claudeOut += d;
      // Extract stderr-like info (last few lines without ANSI)
      const plain = d.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
      const lines = plain.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length > 0) {
        runner.traceLines = [...runner.traceLines, ...lines].slice(-4);
      }
    });

    p.onExit(({ exitCode }) => {
      claudeExited = true;
      claudeCode = exitCode;
    });

    // Step 1: answer workspace trust prompt with option 2 (Yes + remember)
    setTimeout(() => {
      if (claudeExited) return;
      p.write('2\r');
      runner.statusLine = colorize('  Claude launched — answering trust prompt...', ANSI.dim);
      runner.render();
    }, 1500);

    // Step 2: send skill command
    setTimeout(() => {
      if (claudeExited) return;
      p.write(skillCmd + '\r');
      runner.statusLine = colorize(`  Claude pid ${pid} — ${skillCmd}`, ANSI.dim);
      runner.render();
    }, 5000);

    // Monitor loop
    const check = setInterval(() => {
      if (resolved) {
        clearInterval(check);
        return;
      }

      const elapsed = Date.now() - startTime;

      if (claudeExited) {
        runner.statusLine = colorize(`  Claude exited (code ${claudeCode}) — ${Math.floor(elapsed / 1000)}s`, ANSI.yellow);
      } else {
        runner.statusLine = colorize(`  Claude pid ${pid} — ${Math.floor(elapsed / 1000)}s — ${bestCount}/8 reports`, ANSI.dim);
      }

      // Auto-answer permission prompts ("Yes, and don't ask again")
      if (!claudeExited && runner.traceLines.length > 0) {
        const recent = runner.traceLines.slice(-5).join(' ');
        if (/Yes.*don.*t ask again/i.test(recent) && /Tab to amend|Esc to cancel/i.test(recent)) {
          if (!runner._lastAutoAnswer || Date.now() - runner._lastAutoAnswer > 3000) {
            runner._lastAutoAnswer = Date.now();
            p.write('2\r');
            runner.statusLine = colorize(`  Claude pid ${pid} — auto-answering permission prompt...`, ANSI.yellow);
          }
        }
      }

      // Find session with most reports
      const baseDir = path.join(cwd, '.adsense-lint');
      if (fs.existsSync(baseDir)) {
        try {
          const dirs = fs.readdirSync(baseDir).filter((d) => d.startsWith('session-'));
          for (const dir of dirs) {
            const sessionPath = path.join(baseDir, dir);
            let reports = 0;
            for (const agent of runner.agents) {
              if (fs.existsSync(path.join(sessionPath, agent.id, 'report.json'))) {
                reports++;
              }
            }
            if (reports > bestCount) {
              bestCount = reports;
              watchedSession = sessionPath;
            }
          }
        } catch (_) {}
      }

      if (watchedSession) {
        runner.statusLine = colorize(`  Claude pid ${pid} — ${path.basename(watchedSession)} — ${bestCount}/8 reports`, ANSI.brightCyan);
      }

      // Update agent status from reports
      if (watchedSession) {
        for (const agent of runner.agents) {
          if (agent.status === 'done' || agent.status === 'failed') continue;

          const reportPath = path.join(watchedSession, agent.id, 'report.json');
          if (fs.existsSync(reportPath)) {
            try {
              const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
              if (data && typeof data.score === 'number') {
                runner.setScore(agent.id, data.score);
                runner.setStatus(agent.id, data.status === 'failed' ? 'failed' : 'done',
                  data.status === 'failed' ? 'agent reported failure' : 'completed');
              }
            } catch (_) {
              if (agent.status !== 'running') {
                runner.setStatus(agent.id, 'running', 'detected...');
              }
            }
          } else if (bestCount > 0 && agent.status === 'waiting') {
            runner.setStatus(agent.id, 'running', 'pending...');
          }
        }
      }

      // Early death: claude exited with 0 reports after some time
      if (claudeExited && bestCount === 0 && elapsed > 15000) {
        clearInterval(check);
        runner.stopSpinner();
        runner.render();
        console.log(colorize('\n  Claude exited before any agents produced reports.', ANSI.yellow));
        const plain = claudeOut.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');
        console.log(colorize('  Last output: ' + plain.slice(-200).replace(/\n/g, ' '), ANSI.dim));
        console.log(colorize(`  Falling back — run manually: ${skillCmd}`, ANSI.bold));
        console.log('');
        runner.startSpinner();
        monitorReportsOnly(runner, skillCmd, cwd).then(() => done(true));
        return;
      }

      const allDone = runner.agents.every((a) => a.status === 'done' || a.status === 'failed');
      const timedOut = elapsed >= globalTimeout;

      if (allDone || timedOut) {
        clearInterval(check);
        runner.stopSpinner();

        if (timedOut && !allDone) {
          for (const agent of runner.agents) {
            if (agent.status !== 'done' && agent.status !== 'failed') {
              runner.setStatus(agent.id, 'failed', 'global timeout (10 min)');
              runner.setScore(agent.id, 0);
            }
          }
        }

        // Wait for orchestrator to generate summary files
        if (!timedOut && watchedSession) {
          runner.statusLine = colorize('  Waiting for final summary...', ANSI.brightCyan);
          runner.render();
          const summaryDir = path.join(watchedSession, '99-summary');
          const summaryStart = Date.now();
          const summaryPoll = setInterval(() => {
            const hasFinal = fs.existsSync(path.join(summaryDir, 'report-final.json'));
            if (hasFinal || Date.now() - summaryStart > 30000) {
              clearInterval(summaryPoll);
              // Tell claude to exit
              try { p.write('/exit\r'); } catch (_) {}
              setTimeout(() => { try { p.kill(); } catch (_) {} }, 5000);
              done(true);
            }
          }, 1000);
        } else {
          try { p.write('/exit\r'); } catch (_) {}
          setTimeout(() => { try { p.kill(); } catch (_) {} }, 5000);
          done(true);
        }
      }
    }, 1500);
  });
}

// ── Monitor-only mode: poll for sessions without spawning claude ──

async function monitorReportsOnly(runner, skillCmd, cwd) {
  const startTime = Date.now();
  const globalTimeout = 600_000;
  let watchedSession = null;
  let bestCount = 0;

  return new Promise((resolve) => {
    const check = setInterval(() => {
      const elapsed = Date.now() - startTime;

      const baseDir = path.join(cwd, '.adsense-lint');
      if (fs.existsSync(baseDir)) {
        const dirs = fs.readdirSync(baseDir).filter((d) => d.startsWith('session-'));
        for (const dir of dirs) {
          const sessionPath = path.join(baseDir, dir);
          let reports = 0;
          for (const agent of runner.agents) {
            if (fs.existsSync(path.join(sessionPath, agent.id, 'report.json'))) {
              reports++;
            }
          }
          if (reports > bestCount) {
            bestCount = reports;
            watchedSession = sessionPath;
          }
        }
      }

      if (watchedSession) {
        runner.statusLine = colorize(`  Monitoring: ${path.basename(watchedSession)} — ${bestCount}/8 reports`, ANSI.dim);
      }

      let doneCount = 0;
      if (watchedSession) {
        for (const agent of runner.agents) {
          if (agent.status === 'done' || agent.status === 'failed') {
            doneCount++;
            continue;
          }

          const reportPath = path.join(watchedSession, agent.id, 'report.json');
          if (fs.existsSync(reportPath)) {
            try {
              const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
              if (data && typeof data.score === 'number') {
                runner.setScore(agent.id, data.score);
                runner.setStatus(agent.id, data.status === 'failed' ? 'failed' : 'done',
                  data.status === 'failed' ? 'agent reported failure' : 'completed');
                doneCount++;
              }
            } catch (_) {
              if (agent.status !== 'running') {
                runner.setStatus(agent.id, 'running', 'detected...');
              }
            }
          } else if (bestCount > 0 && agent.status === 'waiting') {
            runner.setStatus(agent.id, 'running', 'pending...');
          }
        }
      }

      const allDone = runner.agents.every((a) => a.status === 'done' || a.status === 'failed');
      const timedOut = elapsed >= globalTimeout;

      if (allDone || timedOut) {
        clearInterval(check);
        runner.stopSpinner();

        if (timedOut && !allDone) {
          for (const agent of runner.agents) {
            if (agent.status !== 'done' && agent.status !== 'failed') {
              runner.setStatus(agent.id, 'failed', 'timeout — no Skill activity detected');
              runner.setScore(agent.id, 0);
            }
          }
          if (bestCount === 0) {
            runner.clearPanel();
            console.log(colorize(`\n  No audit detected.`, ANSI.yellow));
            console.log(colorize(`  Run manually: ${skillCmd}`, ANSI.bold));
            console.log('');
          }
        }

        resolve();
      }
    }, 1500);
  });
}

// ── Find claude binary (Windows-aware) ──

function findClaude() {
  const { execSync } = require('child_process');
  try {
    const isWin = process.platform === 'win32';
    const cmd = isWin
      ? 'where claude 2>nul'
      : 'which claude 2>/dev/null';
    const out = execSync(cmd, { shell: true, encoding: 'utf8', timeout: 5000 });
    const lines = out.trim().split(/\r?\n/).filter(Boolean);

    let best = null;
    for (const raw of lines) {
      const cleaned = raw.trim();
      if (!cleaned || !fs.existsSync(cleaned)) continue;
      if (isWin) {
        if (cleaned.endsWith('.exe')) return cleaned;
        if (cleaned.endsWith('.cmd') && !best) best = cleaned;
      } else {
        return cleaned;
      }
    }
    return best;
  } catch (_) {
    return null;
  }
}

function checkWebProject(projectPath) {
  const webIndicators = [
    'package.json', 'index.html', 'index.htm',
    'tsconfig.json', 'jsconfig.json',
    'next.config.js', 'next.config.ts', 'next.config.mjs',
    'nuxt.config.js', 'nuxt.config.ts',
    'vite.config.js', 'vite.config.ts',
    'webpack.config.js', 'webpack.config.cjs',
    'gatsby-config.js', 'gatsby-config.ts',
    'astro.config.mjs', 'astro.config.ts',
    'remix.config.js', 'remix.config.ts',
    'svelte.config.js',
    'angular.json',
    'src/', 'pages/', 'app/', 'components/', 'public/', 'static/',
    'Cargo.toml', 'go.mod', 'Gemfile', 'requirements.txt', 'pyproject.toml',
    '.git/',
  ];

  let found = 0;
  const top = fs.readdirSync(projectPath, { withFileTypes: true });
  const names = new Set(top.map((d) => d.name));

  for (const indicator of webIndicators) {
    if (indicator.endsWith('/')) {
      if (names.has(indicator.slice(0, -1))) found++;
    } else {
      if (names.has(indicator)) found++;
    }
  }

  if (found === 0) {
    return {
      ok: false,
      reason: `Directory "${projectPath}" doesn't look like a web project. ` +
        'Audit may produce low-quality results. Proceeding anyway...',
    };
  }
  return { ok: true, reason: '' };
}

program.parse();
