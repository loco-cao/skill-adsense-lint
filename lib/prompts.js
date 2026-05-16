const { checkbox, confirm } = require('@inquirer/prompts');
const { ANSI, colorize } = require('./colors.js');

function printBanner() {
  console.log('');
  console.log(`  ${colorize('╔══════════════════════════════════════════════════════════════╗', ANSI.cyan)}`);
  console.log(`  ${colorize('║', ANSI.cyan)}       ${ANSI.bold}AdSense Lint — multi-expert AI review system${ANSI.reset}         ${colorize('║', ANSI.cyan)}`);
  console.log(`  ${colorize('╠══════════════════════════════════════════════════════════════╣', ANSI.cyan)}`);
  console.log(`  ${colorize('║', ANSI.cyan)}                                                              ${colorize('║', ANSI.cyan)}`);
  console.log(`  ${colorize('║', ANSI.cyan)}  Select the AI coding assistants to install AdSense Lint    ${colorize('║', ANSI.cyan)}`);
  console.log(`  ${colorize('║', ANSI.cyan)}                                                              ${colorize('║', ANSI.cyan)}`);
  console.log(`  ${colorize('║', ANSI.cyan)}  ${colorize('▸', ANSI.brightCyan)} Claude Code    → ~/.claude/                                ${colorize('║', ANSI.cyan)}`);
  console.log(`  ${colorize('║', ANSI.cyan)}  ${colorize('▸', ANSI.brightBlue)} Cursor         → ~/.cursor/                                ${colorize('║', ANSI.cyan)}`);
  console.log(`  ${colorize('║', ANSI.cyan)}                                                              ${colorize('║', ANSI.cyan)}`);
  console.log(`  ${colorize('╚══════════════════════════════════════════════════════════════╝', ANSI.cyan)}`);
  console.log('');
}

async function selectPlatforms() {
  printBanner();

  const choices = [
    { name: ` ${colorize('Claude Code', ANSI.brightCyan)}  — install Skill + 8 Agents + Workflows + References`, value: 'claude', checked: true },
    { name: ` ${colorize('Cursor', ANSI.brightBlue)}       — install Skill to ~/.cursor/skills-cursor/`, value: 'cursor' },
  ];

  const platforms = await checkbox({
    message: 'Select platforms (Space to toggle, Enter to confirm):',
    choices,
    loop: false,
    pageSize: 10,
    validate: (selected) => selected.length > 0 || 'Please select at least one platform.',
  });

  return platforms;
}

async function confirmUninstall() {
  return confirm({
    message: 'Are you sure you want to uninstall AdSense Lint?',
    default: false,
  });
}

module.exports = {
  selectPlatforms,
  confirmUninstall,
};
