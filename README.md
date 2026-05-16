# adsense-lint

[![npm version](https://img.shields.io/npm/v/adsense-lint)](https://www.npmjs.com/package/adsense-lint)
[![Node.js](https://img.shields.io/node/v/adsense-lint)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/npm/l/adsense-lint)](LICENSE)

> AdSense 多专家 AI 审查系统。一键安装 Claude Code / Cursor 技能与智能体，通过 8 位领域专家并行审计网站或本地项目，输出加权评分、HTML 报告和优先级行动计划。

## v0.2 新特性

- **8 位 AI 专家并行审计**（Policy、E-E-A-T、Content、Cookie、Traffic、Ad Placement、Tech、Legal）
- **复选框安装器**——空格选中、回车确认
- **实时彩色仪表盘**——终端中显示 agent 状态、旋转动画、分数
- **PTY 伪终端自动启动 Claude Code**——CLI 一行命令自动拉起 Claude Code 交互会话，无需手动切换窗口
- **三种运行模式**：
  - `adsense-lint run <url>` ——远程网站审计，自动启动 Claude Code 并行调度 8 位专家
  - `adsense-lint run --local` ——本地项目源码审计，agent 通过 Read/Grep 分析项目文件
  - `adsense-lint run --demo` ——模拟演示，假数据快速预览仪表盘效果
- **双重运行路径**：CLI 自动模式（`adsense-lint run`）或 Skill 手动模式（`/adsense-lint`）
- **加权评分体系**，含透明评分标准和否决规则
- **HTML 可视化报告** + 优先级行动计划

---

## 安装

### npx（推荐）

```bash
npx adsense-lint
```

然后选择 AI 编程助手（空格切换、回车确认）：
- `◉ Claude Code` — 安装 Skill + 8 Agents + Workflows + References 到 `~/.claude/`
- `◯ Cursor` — 安装 Skill 到 `~/.cursor/`

### 全局安装

```bash
npm install -g adsense-lint
adsense-lint
```

### 卸载

```bash
adsense-lint uninstall
```

---

## 使用方式

### 自动审计（推荐）

一行命令，自动启动 Claude Code 并完成 8 维度审计，实时显示彩色仪表盘：

```bash
# 远程网站审计
adsense-lint run https://example.com

# 本地项目审计（当前目录）
adsense-lint run --local

# 本地项目审计（指定目录）
adsense-lint run --local /path/to/project

# 模拟演示（无需 claude，假数据预览效果）
adsense-lint run --demo
```

CLI 会自动：
1. 定位 Claude Code 可执行文件（Windows 优先 `.exe`）
2. 通过 PTY 伪终端启动 Claude Code 交互会话
3. 自动回答工作区信任提示
4. 发送 `/adsense-lint` 指令
5. 在审计过程中自动应答权限提示（"记住，不再询问"）
6. 轮询 `.adsense-lint/` 下的 `report.json`，实时更新仪表盘
7. 全部 8 位专家完成后，打印加权总分和逐专家明细

### 手动 Skill 方式

在 Claude Code 聊天窗口内手动运行（仅审计本身，不含仪表盘）：

```bash
# 远程
/adsense-lint https://example.com

# 本地
/adsense-lint --local

# 跳过交互确认
/adsense-lint https://example.com --auto
```

### Cursor

在 Cursor Chat 中运行 skill，8 项审查将在同一会话中顺序执行。

---

## 实时彩色仪表盘

`run` 命令会显示一个实时刷新的终端面板，每位专家有独立颜色和状态指示：

```
  AdSense Lint — 8 Expert Audit
  ══════════════════════════════════════════
  ⠋  Policy       running   score:        analyzing...
  ○  E-E-A-T      waiting
  ○  Content      waiting
  ○  Cookie       waiting
  ○  Traffic      waiting
  ○  AdPlacement  waiting
  ○  Tech         waiting
  ○  Legal        waiting
  ──────────────────────────────────────────
  Progress: 0/8  Running: 1  Failed: 0
```

状态符号：`○` 等待 → `⠋⠙⠹⠸` 运行中（旋转动画）→ `✓` 完成 → `✗` 失败

颜色映射：

| 专家 | 颜色 | 权重 | 否决权 |
|------|------|------|--------|
| Policy | 红色 | 22% | **是**（<60 = 不通过） |
| E-E-A-T | 青色 | 17% | 否 |
| Content | 绿色 | 15% | 否 |
| Cookie | 黄色 | 13% | 否 |
| Traffic | 蓝色 | 8% | 否 |
| AdPlacement | 品红 | 10% | 否 |
| Tech | 亮青 | 8% | 否 |
| Legal | 亮绿 | 7% | 否 |

---

## 审查维度

### ads-policy-expert · 政策合规（22%，有否决权）
审查禁止内容（成人/暴力/仇恨/毒品/武器）、欺骗性行为（误导声明、隐藏文本、关键词堆砌 >8%）、门页（<50 词）、重复内容（相似度 >75%）。得分 <60 触发否决，最终等级强制为 F。

### ads-eeat-expert · E-E-A-T 评估（17%）
检查经验/专业/权威/可信度信号：作者身份、品牌一致性、占位邮箱检测、模板变量、虚假地址、过时版权。

### ads-content-expert · 内容质量（15%）
分析原创性、深度（<300 词扣分）、AI 写作痕迹（3 处以上）、图片 alt 缺失、库存照片文件名、title/meta/h1 存在性。

### ads-cookie-expert · Cookie 合规（13%）
检查 GDPR/CCPA Cookie 横幅实现、接受+拒绝选项、AdSense Consent Mode、预同意跟踪拦截。

### ads-adplacement-expert · 广告位规划（10%）
统计 `<ins class="adsbygoogle">` 数量、移动端广告数 ≤2、与交互元素间距、禁止位置（覆盖广告、404/登录页面）。

### ads-traffic-expert · 流量分析（8%）
评估参与信号（评论/分享/订阅）、危险信号（流量交换脚本、自动刷新、点击诱饵）。

### ads-tech-expert · 技术合规（8%）
检查 HTTPS 配置、viewport meta、robots.txt、sitemap.xml、图片尺寸、alt 文本、可疑脚本、安全头。

### ads-legal-expert · 法律合规（7%）
审查隐私政策/服务条款/DMCA 页面存在性和条款深度、真实联系信息（邮箱/电话/地址/表单）。

---

## 等级与优先级

得分越低 → 优先级越高 → 越需优先处理。

| 总分 | 等级 | 风险 | 说明 |
|------|------|------|------|
| 95–100 | 优秀 | 低 | 各项指标表现良好，可提交 AdSense 审核 |
| 90–94 | 待提升 | 低 | 部分维度有改进空间，建议优化后提交 |
| 80–89 | 基本满足 | 中 | 勉强达标，存在明显短板需修复 |
| 0–79 | 不合格 | 高 | 多项关键指标不达标，不宜提交审核 |

**优先级划分**（按单个专家得分）：
| 专家得分 | 优先级 |
|------|------|
| <60 | Critical |
| 60–79 | High |
| 80–89 | Medium |
| ≥90 | Low |

若 Policy 专家得分 <60，无论总分如何，最终等级强制覆盖为 **不合格**。

---

## 输出文件

审计完成后，文件保存在 `.adsense-lint/session-{时间戳}/`：

```
01-policy/report.json
02-eeat/report.json
03-content/report.json
04-cookie/report.json
05-traffic/report.json
06-adplacement/report.json
07-tech/report.json
08-legal/report.json
99-summary/
  ├── report-final.json     # 结构化汇总数据
  ├── report-final.html     # 可视化仪表板（雷达图、等级徽章、逐专家明细）
  └── action-plan.md        # 优先级行动计划（Critical/High/Medium/Low）
```

---

## CLI 命令

| 命令 | 说明 |
|------|------|
| `adsense-lint` / `adsense-lint install` | 交互式安装（默认） |
| `adsense-lint uninstall` | 卸载全部文件 |
| `adsense-lint session` | 创建审计会话目录结构 |
| `adsense-lint run <url>` | 远程网站审计 + 实时仪表盘 |
| `adsense-lint run --local [dir]` | 本地项目审计 + 实时仪表盘 |
| `adsense-lint run --demo` | 模拟演示（假数据，无需 claude CLI） |

---

## 架构

```
用户运行: /adsense-lint <url>
          adsense-lint run <url>
          adsense-lint run --local
              │
              ▼
       Skill: adsense-lint (SKILL.md)
              │
              ▼
      Agent: ads-orchestrator (评审主管)
              │
    ┌─────────┼─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
    ▼         ▼         ▼         ▼         ▼         ▼         ▼         ▼
  Policy   E-E-A-T   Content   Cookie   Traffic  AdPlacement  Tech    Legal
    │         │         │         │         │         │         │         │
    └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
                                      │
                                      ▼
                              99-summary/
                           （汇总评分 + 报告生成）
```

### 本地模式 vs 远程模式

| | 远程模式 | 本地模式 |
|---|---|---|
| 输入 | `https://example.com` | 当前项目目录 |
| Agent 工具 | WebFetch + Read + Grep | Read + Grep（不用 WebFetch） |
| 分析对象 | 线上实时页面 | 本地源码文件 |
| 网络依赖 | 需要 | 不需要 |
| 适用场景 | 已部署网站 | 开发中的项目 |

---

## 原理

### 整体数据流

```
adsense-lint run --local
        │
        ▼
  ┌─────────────────────────────────────────────────────┐
  │  bin/adsense-lint.js (Node.js CLI)                  │
  │                                                     │
  │  1. findClaude()    定位 claude.exe/cmd             │
  │  2. node-pty.spawn() 创建伪终端 (PTY)               │
  │  3. pty.write("2\r") 自动应答工作区信任             │
  │  4. pty.write("/adsense-lint --local\r") 发送指令   │
  │  5. setInterval()    轮询 .adsense-lint/session-*/  │
  │  6. AgentRunner      渲染实时彩色仪表盘             │
  └──────────────┬──────────────────────────────────────┘
                 │ PTY (pseudo-terminal)
                 ▼
  ┌─────────────────────────────────────────────────────┐
  │  Claude Code (交互式 TUI)                           │
  │                                                     │
  │  → 加载 SKILL.md (adsense-lint skill)               │
  │  → skill 委托 ads-orchestrator agent                │
  │  → orchestrator 读取 workflow/full-audit.md         │
  └──────────────┬──────────────────────────────────────┘
                 │ Agent(subagent_type=...) ×8
                 ▼
  ┌─────────────────────────────────────────────────────┐
  │  8 位专家 Agent 并行执行                             │
  │                                                     │
  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐  │
  │  │ Policy  │ │ E-E-A-T  │ │ Content │ │ Cookie  │  │
  │  │ 22% 否决│ │   17%    │ │   15%   │ │   13%   │  │
  │  └────┬────┘ └────┬─────┘ └────┬────┘ └────┬────┘  │
  │       │           │            │           │        │
  │  ┌────┴────┐ ┌────┴─────┐ ┌────┴────┐ ┌────┴────┐  │
  │  │Traffic  │ │AdPlace.. │ │  Tech   │ │  Legal  │  │
  │  │   8%    │ │   10%    │ │   8%   │ │   7%    │  │
  │  └────┬────┘ └────┬─────┘ └────┬────┘ └────┬────┘  │
  │       │           │            │           │        │
  └───────┼───────────┼────────────┼───────────┼────────┘
          │           │            │           │
          ▼           ▼            ▼           ▼
     report.json  report.json  report.json  report.json
          │           │            │           │
          └───────────┴────────────┴───────────┘
                      │
                      ▼
  ┌─────────────────────────────────────────────────────┐
  │  CLI 汇总 (lib/runner.js → summary())               │
  │                                                     │
  │  weighted = Σ(score × weight) / Σweight             │
  │  等级: A(≥90) B(80-89) C(70-79) D(60-69) F(<60)   │
  │  Policy <60 → 强制 F (否决权)                       │
  └─────────────────────────────────────────────────────┘
```

### PTY 为什么必须？

Claude Code 的交互模式依赖完整 TTY 环境（raw mode、ANSI 转义序列、光标控制）。普通 `child_process.spawn()` 提供的 pipe 只能传输字节流，无法模拟终端行为。实测结果：

| 方式 | 结果 |
|------|------|
| `spawn(claude, [])` + pipe stdin | Claude 启动但不处理命令，3 秒后报 `no stdin data received` |
| `spawn(claude, ['-p', prompt])` | 单轮输出，**不支持 Agent 工具调用**（-p 模式无多轮交互） |
| `pty.spawn(claude, [])` | ✅ 正常启动，TUI 渲染正常，Agent 工具完整可用 |

`node-pty` 在 Windows 上使用 ConPTY（Windows 10 1809+ 内置），在 macOS/Linux 上使用 `forkpty(3)`，为子进程提供与真实终端无差别的伪终端。

### 权限自动应答

审计过程中 Claude Code 会弹出工具权限提示（首次使用 Bash、Write、Agent 等工具时）。CLI 监控 Claude 的终端输出（通过 ANSI 剥离后的纯文本），检测到权限提示特征（"Yes, and don't ask again" + "Tab to amend"）时自动发送 `2\r`（选项 2：授权并记住），实现无人值守运行。

### 仪表盘刷新机制

`AgentRunner` 使用 ANSI 转义序列 `\x1b[{N}A\x1b[0J` 上移 N 行并清屏，替代上一次渲染的仪表盘面板。80ms 间隔的 spinner 动画 + 1.5s 间隔的报告轮询，实现视觉流畅的实时状态更新。

---

## 项目结构（npm 包）

```
adsense-lint/
├── bin/
│   └── adsense-lint.js          # CLI 入口
├── lib/
│   ├── installer.js             # 文件安装逻辑
│   ├── platform-paths.js        # 跨平台路径映射
│   ├── prompts.js               # 复选框交互提示
│   ├── session.js               # 跨平台会话目录创建
│   ├── runner.js                # Agent 状态仪表盘与运行器
│   └── colors.js                # ANSI 颜色工具
├── assets/
│   ├── claude/
│   │   ├── skills/adsense-lint/SKILL.md
│   │   └── agents/
│   │       ├── ads-orchestrator.md      # 评审主管
│   │       ├── ads-policy-expert.md     # 政策合规
│   │       ├── ads-eeat-expert.md       # E-E-A-T 评估
│   │       ├── ads-content-expert.md    # 内容质量
│   │       ├── ads-cookie-expert.md     # Cookie 合规
│   │       ├── ads-traffic-expert.md    # 流量分析
│   │       ├── ads-adplacement-expert.md # 广告位规划
│   │       ├── ads-tech-expert.md       # 技术合规
│   │       └── ads-legal-expert.md      # 法律合规
│   ├── cursor/
│   │   └── skills-cursor/adsense-lint/SKILL.md
│   ├── workflows/
│   │   └── full-audit.md
│   └── references/
│       ├── scoring-rubric.md
│       ├── report-template.md
│       ├── ad-policy-rules.md
│       ├── eeat-criteria.md
│       ├── content-quality.md
│       ├── cookie-compliance.md
│       ├── traffic-analysis.md
│       ├── adplacement-guidelines.md
│       ├── tech-compliance.md
│       └── legal-compliance.md
├── package.json
├── README.md
└── LICENSE
```

---

## 常见问题

**Q: 能保证 AdSense 一定能通过吗？**

不能。这是 AI 辅助审查系统，最终审批由 Google 人工审核员决定。行动计划帮你向合规靠拢，但不能替代 Google 的评估。

**Q: 远程模式需要联网吗？**

需要。远程模式下 Agent 使用 WebFetch 抓取线上页面进行分析。

**Q: 本地模式需要联网吗？**

不需要。本地模式下 Agent 直接读取项目源码文件，不发起网络请求。但 Agent 运行本身需要 Claude Code（云端 AI）。

**Q: 可以添加自定义 Agent 吗？**

可以。在 `~/.claude/agents/` 下放入新的 `.md` agent 文件，更新 orchestrator 的权重表，并在 workflow 中引用。

**Q: v0.1 的静态扫描器去哪了？**

v0.1 是 Next.js/Vite/HTML 项目的静态代码扫描器。v0.2 用 AI 原生架构替代了它，因为 AdSense 审批本质上是质量审查，需要理解内容和上下文，而非简单的静态文件检查。

---

## License

MIT © [lococao](https://github.com/loco-cao)
