const os = require('os');
const path = require('path');

function getHomeDir() {
  return os.homedir();
}

function getClaudePaths() {
  const home = getHomeDir();
  return {
    skills: path.join(home, '.claude', 'skills'),
    agents: path.join(home, '.claude', 'agents'),
    workflows: path.join(home, '.claude', 'adsense-lint', 'workflows'),
    references: path.join(home, '.claude', 'adsense-lint', 'references'),
  };
}

function getCursorPaths() {
  const home = getHomeDir();
  return {
    skills: path.join(home, '.cursor', 'skills-cursor'),
  };
}

module.exports = {
  getHomeDir,
  getClaudePaths,
  getCursorPaths,
};
