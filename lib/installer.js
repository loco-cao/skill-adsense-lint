const fs = require('fs');
const path = require('path');
const { getClaudePaths, getCursorPaths } = require('./platform-paths.js');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory not found: ${src}`);
  }
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function removeDirSync(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function verifyClaudeInstallation(paths) {
  const required = [
    path.join(paths.skills, 'adsense-lint', 'SKILL.md'),
    path.join(paths.agents, 'ads-orchestrator.md'),
    path.join(paths.workflows, 'full-audit.md'),
    path.join(paths.references, 'scoring-rubric.md'),
    path.join(paths.references, 'report-template.md'),
  ];
  let ok = true;
  for (const p of required) {
    if (!fs.existsSync(p)) {
      console.error(`  ✗ MISSING: ${p}`);
      ok = false;
    }
  }
  if (!ok) {
    throw new Error('Installation verification failed. Some required files were not copied.');
  }
}

function installClaude() {
  const paths = getClaudePaths();
  const srcClaude = path.join(ASSETS_DIR, 'claude');

  // Install Skill
  const skillSrc = path.join(srcClaude, 'skills', 'adsense-lint');
  const skillDest = path.join(paths.skills, 'adsense-lint');
  copyDirSync(skillSrc, skillDest);
  console.log('  ✓ Skill: adsense-lint → ~/.claude/skills/adsense-lint/');

  // Install Agents
  const agentsSrc = path.join(srcClaude, 'agents');
  if (fs.existsSync(agentsSrc)) {
    for (const file of fs.readdirSync(agentsSrc)) {
      const agentSrc = path.join(agentsSrc, file);
      const agentDest = path.join(paths.agents, file);
      fs.mkdirSync(paths.agents, { recursive: true });
      fs.copyFileSync(agentSrc, agentDest);
      console.log(`  ✓ Agent: ${file} → ~/.claude/agents/${file}`);
    }
  }

  // Install Workflows
  const wfSrc = path.join(ASSETS_DIR, 'workflows');
  const wfDest = paths.workflows;
  copyDirSync(wfSrc, wfDest);
  console.log('  ✓ Workflows → ~/.claude/adsense-lint/workflows/');

  // Install References
  const refSrc = path.join(ASSETS_DIR, 'references');
  const refDest = paths.references;
  copyDirSync(refSrc, refDest);
  console.log('  ✓ References → ~/.claude/adsense-lint/references/');

  // Verify everything is in place
  verifyClaudeInstallation(paths);
  console.log('  ✓ Installation verified successfully.');
}

function installCursor() {
  const paths = getCursorPaths();
  const srcCursor = path.join(ASSETS_DIR, 'cursor', 'skills-cursor', 'adsense-lint');
  const destCursor = path.join(paths.skills, 'adsense-lint');
  copyDirSync(srcCursor, destCursor);
  console.log('  ✓ Skill: adsense-lint → ~/.cursor/skills-cursor/adsense-lint/');
}

function uninstallClaude() {
  const paths = getClaudePaths();
  removeDirSync(path.join(paths.skills, 'adsense-lint'));
  console.log('  ✗ Removed ~/.claude/skills/adsense-lint/');

  const agents = [
    'ads-orchestrator.md',
    'ads-policy-expert.md',
    'ads-eeat-expert.md',
    'ads-content-expert.md',
    'ads-cookie-expert.md',
    'ads-traffic-expert.md',
    'ads-adplacement-expert.md',
    'ads-tech-expert.md',
    'ads-legal-expert.md',
  ];
  for (const agent of agents) {
    const p = path.join(paths.agents, agent);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      console.log(`  ✗ Removed ~/.claude/agents/${agent}`);
    }
  }

  removeDirSync(path.join(paths.workflows));
  console.log('  ✗ Removed ~/.claude/adsense-lint/workflows/');
  removeDirSync(path.join(paths.references));
  console.log('  ✗ Removed ~/.claude/adsense-lint/references/');
}

function uninstallCursor() {
  const paths = getCursorPaths();
  removeDirSync(path.join(paths.skills, 'adsense-lint'));
  console.log('  ✗ Removed ~/.cursor/skills-cursor/adsense-lint/');
}

module.exports = {
  installClaude,
  installCursor,
  uninstallClaude,
  uninstallCursor,
};
