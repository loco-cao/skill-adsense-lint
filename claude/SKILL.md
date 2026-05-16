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

## 启动

首先，读取核心审计指令：

```
Read: shared/adsense-lint.md
```

该文件包含完整的审计流程：参数解析、模式判断、飞行前检查、会话设置、专家编排、汇总规则和输出格式。按其中定义的逻辑执行。

## Claude-Specific 适配

以下是与 Claude Code 平台绑定的具体实现细节。

### 飞行前检查 — 文件验证

验证工作流和参考文件存在：

```bash
SKILL_DIR="$HOME/.claude/skills/adsense-lint"
test -f "$SKILL_DIR/references/scoring-rubric.md" && echo "OK: rubric" || echo "MISSING: rubric"
test -f "$SKILL_DIR/references/report-template.md" && echo "OK: template" || echo "MISSING: template"
```

如有缺失：**立即停止**，提示用户运行 `ait install` 重新安装。

### 分两批并行启动 8 位专家

为避免单次并行过多导致 timeout，将 8 位专家分为两批，每批 4 个。第一批完成后立即启动第二批。

**第一批（轻量/中等负载）：**

| 专家 | subagent_type | 输出路径 |
|------|--------------|----------|
| Policy | `ads-policy-expert` | `<SESSION_DIR>/01-policy/report.json` |
| E-E-A-T | `ads-eeat-expert` | `<SESSION_DIR>/02-eeat/report.json` |
| Cookie | `ads-cookie-expert` | `<SESSION_DIR>/04-cookie/report.json` |
| Tech | `ads-tech-expert` | `<SESSION_DIR>/07-tech/report.json` |

**第二批（重负载）：**

| 专家 | subagent_type | 输出路径 |
|------|--------------|----------|
| Content | `ads-content-expert` | `<SESSION_DIR>/03-content/report.json` |
| Traffic | `ads-traffic-expert` | `<SESSION_DIR>/05-traffic/report.json` |
| AdPlacement | `ads-adplacement-expert` | `<SESSION_DIR>/06-adplacement/report.json` |
| Legal | `ads-legal-expert` | `<SESSION_DIR>/08-legal/report.json` |

调用示例（远程模式）：

```
Agent(subagent_type="ads-policy-expert", description="Policy audit",
  prompt="审查 <url>。将结果写入 <SESSION_DIR>/01-policy/report.json。评分 0-100。输出合法 JSON，字段：expert, score, maxScore, weight, status, findings[], summary。每个 finding 必须有 severity/category/title/description/evidence/recommendation。")
```

调用示例（本地模式）：

```
Agent(subagent_type="ads-policy-expert", description="Policy audit",
  prompt="你是 AdSense 政策合规专家。这是本地代码审查——不要使用 WebFetch。使用 Read 和 Grep 扫描项目 <project_path> 中的所有 HTML/JSX/TSX/Vue/Markdown 文件。查找：禁止内容、隐藏文本、关键词堆砌、门页、重复内容。将结果写入 <SESSION_DIR>/01-policy/report.json。评分 0-100。输出合法 JSON。")
```

**关键：每批 4 个 Agent 调用必须在同一轮中发出，利用并行 tool calls。两批之间串行，等第一批全部完成后再发第二批。不得使用中介 agent 做编排。**

### 超时与重试

等待每批 4 个 Agent 返回结果：
- 若某位专家返回 **timeout** 或 **failed**，在发下一批之前单独对该专家**重试一次**。
- 重试时精简 prompt，仅保留核心审查指令和输出路径，避免重复说明背景规则。
- 若重试仍失败，汇总阶段为该专家写入备用 report.json：
  - `score: 0`, `status: "failed"`
  - 一条 critical 发现，标题 `审计执行失败`，描述说明超时或失败原因。
- **不要因为单个专家失败而阻塞整体审计。**

### 交互确认

远程模式下，如果未指定 `--auto`，使用 `AskUserQuestion` 向用户确认 URL 和审计范围。

### 汇总

参考 `shared/adsense-lint.md` 中的评分公式和输出格式，生成 `report-final.json`、`report-final.html` 和 `action-plan.md`。
