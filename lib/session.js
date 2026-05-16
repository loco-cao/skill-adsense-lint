const fs = require('fs');
const path = require('path');

const EXPERTS = [
  { id: '01-policy', name: 'Policy' },
  { id: '02-eeat', name: 'E-E-A-T' },
  { id: '03-content', name: 'Content' },
  { id: '04-cookie', name: 'Cookie' },
  { id: '05-traffic', name: 'Traffic' },
  { id: '06-adplacement', name: 'AdPlacement' },
  { id: '07-tech', name: 'Tech' },
  { id: '08-legal', name: 'Legal' },
  { id: '99-summary', name: 'Summary' },
];

function getTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function createSessionDirs(baseDir = '.adsense-lint', timestamp) {
  const ts = timestamp || getTimestamp();
  const sessionDir = path.join(baseDir, `session-${ts}`);

  const created = [];
  for (const expert of EXPERTS) {
    const dir = path.join(sessionDir, expert.id);
    fs.mkdirSync(dir, { recursive: true });
    created.push(dir);
  }

  return {
    sessionDir,
    timestamp: ts,
    dirs: created,
    experts: EXPERTS,
  };
}

function sessionExists(baseDir = '.adsense-lint', timestamp) {
  if (!timestamp) return false;
  const sessionDir = path.join(baseDir, `session-${timestamp}`);
  return fs.existsSync(sessionDir);
}

module.exports = {
  EXPERTS,
  getTimestamp,
  createSessionDirs,
  sessionExists,
};
