---
name: adsense-lint
description: "AdSense 多专家 AI 审查系统 — 全面的网站 AdSense 合规性审计"
argument-hint: "<url> [--auto] [--local]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
  - Agent
  - Grep
  - Glob
---

# AdSense Lint Skill

你是 AdSense 多专家 AI 审查系统的入口点。

## 参数

- `<url>` — 要审计的目标网站 URL（远程模式）
- `[--auto]` — 跳过交互式确认并使用默认设置
- `[--local]` — 本地模式：审计当前项目目录的源代码文件（无需 URL，agent 用 Read/Grep 分析本地文件）

## 模式判断

**如果是 `--local` 模式：** 跳过 URL 验证和网络测试。使用当前工作目录作为项目路径。跳转到「编排」章节。

**如果是 URL 模式：** 继续执行下方飞行前检查。

## 飞行前检查（仅远程模式）

1. 验证 URL 格式（必须以 `http://` 或 `https://` 开头）。
2. 确保用户位于项目目录内（查找 `package.json`、`.git` 或标准 Web 项目文件）。
3. **关键：验证必需的 workflow 和 reference 文件是否存在。** 运行：
   ```bash
   test -f "$HOME/.claude/adsense-lint/workflows/full-audit.md" && echo "OK: workflow" || echo "MISSING: workflow"
   test -f "$HOME/.claude/adsense-lint/references/scoring-rubric.md" && echo "OK: rubric" || echo "MISSING: rubric"
   test -f "$HOME/.claude/adsense-lint/references/report-template.md" && echo "OK: template" || echo "MISSING: template"
   ```
   如果有任何文件缺失，**立即停止**。输出：
   ```
   ERROR: Required AdSense Lint files are missing.
   Please reinstall by running: npx adsense-lint install
   ```
   不要继续。
4. **在启动完整审计之前测试网络可达性**（强烈建议）：
   ```bash
   curl -I --max-time 10 --connect-timeout 5 "<target-url>" >/dev/null 2>&1 && echo "REACHABLE" || echo "UNREACHABLE"
   ```
   如果不可达，警告用户并询问是否继续 — 审计很可能会超时。
5. 如果未提供 URL 且不是 local 模式，通过 `AskUserQuestion` 向用户询问。

---

## 会话设置

为此审计会话创建一个本地工作目录：

```bash
SESSION_DIR=".adsense-lint/session-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$SESSION_DIR"/{01-policy,02-eeat,03-content,04-cookie,05-traffic,06-adplacement,07-tech,08-legal,99-summary}
```

---

## 审计仪表盘 — 启动前

在启动任何 agent 之前，**先输出以下状态面板**：

```
  AdSense Lint — 8 Expert Audit
  ══════════════════════════════════════════
  ○  Policy       waiting
  ○  E-E-A-T      waiting
  ○  Content      waiting
  ○  Cookie       waiting
  ○  Traffic      waiting
  ○  AdPlacement  waiting
  ○  Tech         waiting
  ○  Legal        waiting
  ──────────────────────────────────────────
  Progress: 0/8  Running: 0  Failed: 0

  Target: <url or project_path>
  Mode: <remote|local>
  Starting audit...
```

---

## 编排 — 直接并行启动 8 位专家

**这是最关键的步骤。不要使用 `ads-orchestrator` 作为中介！直接在当前上下文中并行启动全部 8 位专家 agent。**

**必须在同一轮 tool calls 中，一次性发出全部 8 个 Agent 调用。每个专家使用独立的 agent_type 和颜色：**

| 专家 | agent_type | 颜色 | 角色 |
|------|------------|------|------|
| Policy | `ads-policy-expert` | Red | 政策审查（有否决权） |
| E-E-A-T | `ads-eeat-expert` | Green | 权威度评估 |
| Content | `ads-content-expert` | Yellow | 内容质量 |
| Cookie | `ads-cookie-expert` | Orange | Cookie 合规 |
| Traffic | `ads-traffic-expert` | Purple | 流量质量 |
| AdPlacement | `ads-adplacement-expert` | Cyan | 广告位规划 |
| Tech | `ads-tech-expert` | Gray | 技术合规 |
| Legal | `ads-legal-expert` | Magenta | 法律页面 |

### 远程模式 — 8 个 Agent 调用：

在一轮中同时发出以下 8 个 Agent 调用：

1. `Agent(subagent_type="ads-policy-expert", description="Policy audit", prompt="审查 <url>。将结果写入 <SESSION_DIR>/01-policy/report.json。评分 0-100。输出合法 JSON，字段：expert, score, maxScore, weight, status, findings[], summary。每个 finding 必须有 severity/category/title/description/evidence/recommendation。")`

2. `Agent(subagent_type="ads-eeat-expert", description="E-E-A-T audit", prompt="评估 <url> 的 E-E-A-T 信号。将结果写入 <SESSION_DIR>/02-eeat/report.json。评分 0-100。输出合法 JSON，字段同上。")`

3. `Agent(subagent_type="ads-content-expert", description="Content audit", prompt="分析 <url> 的内容质量。将结果写入 <SESSION_DIR>/03-content/report.json。评分 0-100。输出合法 JSON，字段同上。")`

4. `Agent(subagent_type="ads-cookie-expert", description="Cookie audit", prompt="检查 <url> 的 Cookie/GDPR 合规性。将结果写入 <SESSION_DIR>/04-cookie/report.json。评分 0-100。输出合法 JSON，字段同上。")`

5. `Agent(subagent_type="ads-traffic-expert", description="Traffic audit", prompt="分析 <url> 的流量质量。将结果写入 <SESSION_DIR>/05-traffic/report.json。评分 0-100。输出合法 JSON，字段同上。")`

6. `Agent(subagent_type="ads-adplacement-expert", description="AdPlacement audit", prompt="评估 <url> 的广告位规划。将结果写入 <SESSION_DIR>/06-adplacement/report.json。评分 0-100。输出合法 JSON，字段同上。")`

7. `Agent(subagent_type="ads-tech-expert", description="Tech audit", prompt="检查 <url> 的技术合规性。将结果写入 <SESSION_DIR>/07-tech/report.json。评分 0-100。输出合法 JSON，字段同上。")`

8. `Agent(subagent_type="ads-legal-expert", description="Legal audit", prompt="审查 <url> 的法律页面。将结果写入 <SESSION_DIR>/08-legal/report.json。评分 0-100。输出合法 JSON，字段同上。")`

### 本地模式 — 8 个 Agent 调用：

在一轮中同时发出以下 8 个 Agent 调用。`<project_path>` 为当前工作目录的绝对路径。每个专家会使用 Read/Grep 分析本地文件。

1. `Agent(subagent_type="ads-policy-expert", description="Policy audit", prompt="你是 AdSense 政策合规专家。这是本地代码审查——不要使用 WebFetch。使用 Read 和 Grep 扫描项目 <project_path> 中的所有 HTML/JSX/TSX/Vue/Markdown 文件。查找：禁止内容（成人、暴力、仇恨言论、毒品、武器）、隐藏文本（display:none visibility:hidden color:transparent font-size:0）、关键词堆砌（单词密度 >8%）、门页（有意义内容 <50 词）、重复内容（页面间相似度 >75%）。将结果写入 <SESSION_DIR>/01-policy/report.json。评分 0-100。输出合法 JSON，字段：expert, score, maxScore, weight, status, findings[], summary。")`

2. `Agent(subagent_type="ads-eeat-expert", description="E-E-A-T audit", prompt="你是 E-E-A-T 评估专家。这是本地代码审查——不要使用 WebFetch。使用 Read 和 Grep 分析项目 <project_path>。查找 about/contact/作者页面，检查占位邮箱（@example.com @test.com）、模板变量（{{company}} {{date}}）、虚假地址、过时版权、品牌一致性。将结果写入 <SESSION_DIR>/02-eeat/report.json。评分 0-100。输出合法 JSON。")`

3. `Agent(subagent_type="ads-content-expert", description="Content audit", prompt="你是内容质量专家。这是本地代码审查——不要使用 WebFetch。使用 Read 和 Grep 分析 <project_path> 中的内容文件。检查：每页字数（<300）、占位文本、AI 写作痕迹（3 处以上）、图片 alt 缺失、库存照片文件名、title/meta/h1 存在性。将结果写入 <SESSION_DIR>/03-content/report.json。评分 0-100。输出合法 JSON。")`

4. `Agent(subagent_type="ads-cookie-expert", description="Cookie audit", prompt="你是 Cookie 合规专家。这是本地代码审查——不要使用 WebFetch。使用 Read 和 Grep 扫描 <project_path> 中的 JS/TS/JSX 文件。搜索 Cookie 同意实现、已知 Consent 库、Google 同意模式、预同意跟踪检查。将结果写入 <SESSION_DIR>/04-cookie/report.json。评分 0-100。输出合法 JSON。")`

5. `Agent(subagent_type="ads-traffic-expert", description="Traffic audit", prompt="你是流量分析专家。这是本地代码审查——不要使用 WebFetch。使用 Read 和 Grep 分析 <project_path>。检查参与信号（评论组件、社交按钮、订阅表单）、危险信号（流量交换脚本、自动刷新、点击诱饵）。将结果写入 <SESSION_DIR>/05-traffic/report.json。评分 0-100。输出合法 JSON。")`

6. `Agent(subagent_type="ads-adplacement-expert", description="AdPlacement audit", prompt="你是广告位规划专家。这是本地代码审查——不要使用 WebFetch。使用 Read 和 Grep 扫描 <project_path> 中的 HTML/JSX/Vue 文件。统计 <ins class='adsbygoogle'> 数量、移动端广告数 ≤2、检查与交互元素的间距、标记禁止位置。将结果写入 <SESSION_DIR>/06-adplacement/report.json。评分 0-100。输出合法 JSON。")`

7. `Agent(subagent_type="ads-tech-expert", description="Tech audit", prompt="你是技术合规专家。这是本地代码审查——不要使用 WebFetch。使用 Read 和 Grep 分析 <project_path>。检查 HTTPS 配置、viewport meta、图片尺寸、alt 文本、robots.txt、sitemap.xml、可疑脚本、安全头。将结果写入 <SESSION_DIR>/07-tech/report.json。评分 0-100。输出合法 JSON。")`

8. `Agent(subagent_type="ads-legal-expert", description="Legal audit", prompt="你是法律合规专家。这是本地代码审查——不要使用 WebFetch。使用 Read 和 Grep 检查 <project_path> 中的法律页面（privacy/terms/about/contact）。检查必需页面存在性、条款深度、DMCA、真实联系信息。将结果写入 <SESSION_DIR>/08-legal/report.json。评分 0-100。输出合法 JSON。")`

---

## 规则

- **所有 8 个 Agent 调用必须在同一轮发送，并行执行。不得逐个串行。**
- 每个 agent 独立运行，超时约 120 秒。
- 如果有 agent 失败或超时，不要阻塞整体审计。汇总阶段为该专家写 score:0, status:"failed" 的备用 report.json。
- 失败不阻塞整体审计。

---

## 汇总

等待所有 8 位专家完成后，逐一读取每份 report.json，计算加权总分：

```
total = policy×0.22 + eeat×0.17 + content×0.15 + cookie×0.13 + adplacement×0.10 + traffic×0.08 + tech×0.08 + legal×0.07
```

定级：优秀(≥95) 待提升(90-94) 基本满足(80-89) 不合格(<80)
若 policy < 60 → 等级强制覆盖为不合格
优先级：<60=Critical 60-79=High 80-89=Medium ≥90=Low（分数越低优先级越高，权重越大）

在 `<SESSION_DIR>/99-summary/` 中生成：
- `report-final.json`
- `report-final.html`（含雷达图、等级徽章、逐专家明细、严重问题列表）
- `action-plan.md`（按 Critical/High/Medium/Low 分组）

---

## 审计仪表盘 — 完成后

输出最终状态面板：

```
  AdSense Lint — Audit Complete
  ══════════════════════════════════════════
  ✓  Policy       score: 85   done
  ✓  E-E-A-T      score: 72   done
  ✓  Content      score: 90   done
  ✓  Cookie       score: 65   done
  ✓  Traffic      score: 78   done
  ✓  AdPlacement  score: 81   done
  ✓  Tech         score: 88   done
  ✓  Legal        score: 70   done
  ──────────────────────────────────────────
  Progress: 8/8  Running: 0  Failed: 0

  Final Score: 78.3  Grade: C  Risk: MEDIUM
  Critical Issues: 2
  Report: .adsense-lint/session-<ts>/99-summary/report-final.html
  Action Plan: .adsense-lint/session-<ts>/99-summary/action-plan.md
```

如果某些专家失败（`✗`），在面板中标记并说明原因。

返回终端摘要（URL/路径、总分、等级、风险、严重问题数、逐专家明细表）。
