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

### 并行启动 8 位专家

使用 Claude Code 的 `Agent` 工具在同一轮中并行启动全部 8 位专家。每个专家使用对应的 `subagent_type`：

| 专家 | subagent_type | 输出路径 |
|------|--------------|----------|
| Policy | `ads-policy-expert` | `<SESSION_DIR>/01-policy/report.json` |
| E-E-A-T | `ads-eeat-expert` | `<SESSION_DIR>/02-eeat/report.json` |
| Content | `ads-content-expert` | `<SESSION_DIR>/03-content/report.json` |
| Cookie | `ads-cookie-expert` | `<SESSION_DIR>/04-cookie/report.json` |
| Traffic | `ads-traffic-expert` | `<SESSION_DIR>/05-traffic/report.json` |
| AdPlacement | `ads-adplacement-expert` | `<SESSION_DIR>/06-adplacement/report.json` |
| Tech | `ads-tech-expert` | `<SESSION_DIR>/07-tech/report.json` |
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

**关键：全部 8 个 Agent 调用必须在同一轮中发出，利用并行 tool calls。不得使用 ads-orchestrator 中介 agent。**

### 交互确认

远程模式下，如果未指定 `--auto`，使用 `AskUserQuestion` 向用户确认 URL 和审计范围。

### 汇总

参考 `shared/adsense-lint.md` 中的评分公式和输出格式，生成 `report-final.json`、`report-final.html` 和 `action-plan.md`。
