const { EXPERT_COLORS, STATUS, ANSI, colorize } = require('./colors.js');

const EXPERTS = [
  { id: '01-policy', name: 'Policy', weight: 0.22 },
  { id: '02-eeat', name: 'E-E-A-T', weight: 0.17 },
  { id: '03-content', name: 'Content', weight: 0.15 },
  { id: '04-cookie', name: 'Cookie', weight: 0.13 },
  { id: '05-traffic', name: 'Traffic', weight: 0.08 },
  { id: '06-adplacement', name: 'AdPlacement', weight: 0.10 },
  { id: '07-tech', name: 'Tech', weight: 0.08 },
  { id: '08-legal', name: 'Legal', weight: 0.07 },
];

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

class AgentRunner {
  constructor(options = {}) {
    this.agents = EXPERTS.map((e) => ({
      ...e,
      status: 'waiting',
      message: '',
      score: null,
      startTime: null,
      endTime: null,
    }));
    this.spinnerIdx = 0;
    this.renderedLines = 0;
    this.interval = null;
    this.verbose = options.verbose ?? false;
    this.statusLine = null;
    this.traceLines = [];
  }

  setStatus(id, status, message = '') {
    const agent = this.agents.find((a) => a.id === id);
    if (!agent) return;
    agent.status = status;
    agent.message = message;
    if (status === 'running' && !agent.startTime) {
      agent.startTime = Date.now();
    }
    if (status === 'done' || status === 'failed') {
      agent.endTime = Date.now();
    }
    this.render();
  }

  setScore(id, score) {
    const agent = this.agents.find((a) => a.id === id);
    if (agent) agent.score = score;
    this.render();
  }

  startSpinner() {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.spinnerIdx = (this.spinnerIdx + 1) % SPINNER_FRAMES.length;
      this.render();
    }, 80);
  }

  stopSpinner() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  clearPanel() {
    if (this.renderedLines > 0) {
      process.stdout.write(`\x1b[${this.renderedLines}A`);
      process.stdout.write('\x1b[0J');
    }
  }

  render() {
    this.clearPanel();
    const lines = [];

    const header = `${ANSI.bold}AdSense Lint — 8 Expert Audit${ANSI.reset}`;
    lines.push('');
    lines.push(`  ${header}`);
    lines.push(`  ${colorize('═'.repeat(42), ANSI.gray)}`);

    for (const agent of this.agents) {
      const color = EXPERT_COLORS[agent.id] || ANSI.white;
      const name = colorize(agent.name.padEnd(12), color);
      const statusIcon = agent.status === 'running'
        ? colorize(SPINNER_FRAMES[this.spinnerIdx], ANSI.brightYellow)
        : STATUS[agent.status] || STATUS.waiting;
      const statusLabel = agent.status === 'waiting' ? 'waiting'
        : agent.status === 'running' ? 'running'
        : agent.status === 'done' ? 'done'
        : 'failed';
      const label = colorize(statusLabel.padEnd(8), ANSI.dim);
      const msg = agent.message ? `  ${ANSI.dim}${agent.message}${ANSI.reset}` : '';
      const score = agent.score !== null ? colorize(String(agent.score).padStart(3), ANSI.bold) : '   ';
      const scoreLabel = agent.score !== null ? `  score: ${score}` : '';

      lines.push(`  ${statusIcon}  ${name}  ${label}${scoreLabel}${msg}`);
    }

    const running = this.agents.filter((a) => a.status === 'running').length;
    const done = this.agents.filter((a) => a.status === 'done').length;
    const failed = this.agents.filter((a) => a.status === 'failed').length;
    const progress = colorize(`${done}/${this.agents.length}`, ANSI.bold);
    lines.push(`  ${colorize('─'.repeat(42), ANSI.gray)}`);
    lines.push(`  ${ANSI.dim}Progress:${ANSI.reset} ${progress}  ${ANSI.dim}Running:${ANSI.reset} ${running}  ${ANSI.dim}Failed:${ANSI.reset} ${failed}`);

    if (this.statusLine) {
      lines.push(`  ${this.statusLine}`);
    }
    for (const tl of this.traceLines.slice(-3)) {
      lines.push(`  ${ANSI.dim}${tl.slice(0, 80)}${ANSI.reset}`);
    }
    lines.push('');

    for (const line of lines) {
      process.stdout.write(line + '\n');
    }
    this.renderedLines = lines.length;
  }

  async run(handler, options = {}) {
    const agentTimeout = options.agentTimeout ?? 120_000;
    const retries = options.retries ?? 1;
    const globalTimeoutMs = options.globalTimeout ?? 600_000;

    this.render();
    this.startSpinner();

    const runAgent = async (agent) => {
      this.setStatus(agent.id, 'running', 'starting...');
      let lastErr = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) {
          this.setStatus(agent.id, 'running', `retry ${attempt}/${retries}...`);
          await delay(3000);
        }

        try {
          const task = handler(agent, (msg) => this.setStatus(agent.id, 'running', msg));
          const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`timeout after ${agentTimeout}ms`)), agentTimeout)
          );
          await Promise.race([task, timeout]);
          this.setStatus(agent.id, 'done', 'completed');
          return;
        } catch (err) {
          lastErr = err;
          this.setStatus(agent.id, 'running', `error: ${err.message}`);
        }
      }

      this.setStatus(agent.id, 'failed', lastErr?.message || 'error');
      this.setScore(agent.id, 0);
    };

    const globalTask = Promise.all(this.agents.map((agent) => runAgent(agent)));
    const globalTimeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('global timeout')), globalTimeoutMs)
    );

    try {
      await Promise.race([globalTask, globalTimeoutPromise]);
    } catch (err) {
      for (const agent of this.agents) {
        if (agent.status === 'running' || agent.status === 'waiting') {
          this.setStatus(agent.id, 'failed', 'global timeout');
          this.setScore(agent.id, 0);
        }
      }
    }

    this.stopSpinner();
    this.render();
    return this.agents;
  }

  async simulate(duration = 3000) {
    return this.run(async (agent, log) => {
      await delay(Math.random() * duration);
      log('analyzing...');
      await delay(Math.random() * duration);
      const score = Math.floor(Math.random() * 40) + 60;
      this.setScore(agent.id, score);
    });
  }

  summary() {
    const scores = this.agents
      .filter((a) => a.score !== null)
      .map((a) => ({ name: a.name, score: a.score, weight: a.weight }));

    if (scores.length === 0) return null;

    const weightedSum = scores.reduce((s, a) => s + a.score * a.weight, 0);
    const totalWeight = scores.reduce((s, a) => s + a.weight, 0);
    const final = Math.round(weightedSum / totalWeight);

    const policy = this.agents.find((a) => a.id === '01-policy');
    const veto = policy && policy.score !== null && policy.score < 60;

    let grade, risk;
    if (veto) {
      grade = '不合格';
      risk = 'HIGH (Policy veto)';
    } else if (final >= 95) { grade = '优秀'; risk = 'LOW'; }
    else if (final >= 90) { grade = '待提升'; risk = 'LOW'; }
    else if (final >= 80) { grade = '基本满足'; risk = 'MEDIUM'; }
    else { grade = '不合格'; risk = 'HIGH'; }

    // Lower score → higher priority
    const sorted = [...scores].sort((a, b) => a.score - b.score);
    const priorities = sorted.map((s, i) => ({
      ...s,
      priority: s.score < 60 ? 'Critical' : s.score < 80 ? 'High' : s.score < 90 ? 'Medium' : 'Low',
    }));

    return { final, grade, risk, scores: priorities, veto };
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { AgentRunner, EXPERTS, delay };
