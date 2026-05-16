# adsense-lint

> AdSense 多专家 AI 审查系统 — 8 位领域专家并行审计网站或本地项目，输出加权评分和优先级行动计划。

AIT 技能仓库。通过 [ai-terminal](https://github.com/lococao/ai-terminal) CLI 安装和运行，支持 Claude Code 和 Codex CLI。

## 快速开始

```bash
# 1. 注册技能
ait register gh:lococao/skill-adsense-lint

# 2. 安装到 AI CLI
ait install
# → 选择 adsense-lint
# → 勾选 Claude Code / Codex CLI

# 3. 运行审计
ait run skills/adsense-lint https://example.com     # 远程网站
ait run skills/adsense-lint --local                  # 本地项目
ait run skills/adsense-lint https://example.com --auto  # 跳过确认
```

## 审查维度

8 位 AI 专家并行审计，各司其职：

| 专家 | 权重 | 否决权 | 职责 |
|------|------|--------|------|
| Policy | 22% | **是**（<60 = 不通过） | 禁止内容、欺骗性行为、门页、重复内容 |
| E-E-A-T | 17% | 否 | 经验/专业/权威/可信度信号 |
| Content | 15% | 否 | 原创性、深度、AI 写作痕迹、图片 alt、meta 标签 |
| Cookie | 13% | 否 | GDPR/CCPA Cookie 横幅、AdSense Consent Mode |
| AdPlacement | 10% | 否 | 广告单元数量、移动端限制、与交互元素间距 |
| Traffic | 8% | 否 | 参与信号、流量交换脚本、点击诱饵 |
| Tech | 8% | 否 | HTTPS、viewport、robots.txt、sitemap.xml、安全头 |
| Legal | 7% | 否 | 隐私政策、服务条款、DMCA、真实联系信息 |

## 评分与等级

加权总分 = Σ(专家得分 × 权重) / Σ权重

| 总分 | 等级 | 风险 |
|------|------|------|
| 95–100 | 优秀 | LOW |
| 90–94 | 待提升 | LOW |
| 80–89 | 基本满足 | MEDIUM |
| 0–79 | 不合格 | HIGH |

Policy 专家得分 <60 时，无论总分多少，最终等级强制为 **不合格**。

各专家得分对应的处理优先级：

| 得分 | 优先级 |
|------|------|
| <60 | Critical |
| 60–79 | High |
| 80–89 | Medium |
| ≥90 | Low |

## 输出文件

审计完成后，结果保存在 `.adsense-lint/session-{时间戳}/`：

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
  ├── report-final.json
  ├── report-final.html
  └── action-plan.md
```

## 实时仪表盘

`ait run` 通过 PTY 伪终端启动 AI CLI，自动应答信任/权限提示，并显示实时刷新的彩色面板：

```
  AIT — Skill Audit
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

## 本地 vs 远程

| | 远程模式 | 本地模式 |
|---|---|---|
| 输入 | `https://example.com` | 当前项目目录 |
| Agent 工具 | WebFetch + Read + Grep | Read + Grep |
| 分析对象 | 线上实时页面 | 本地源码文件 |
| 网络依赖 | 需要 | 不需要 |

## 架构

```
ait run skills/adsense-lint <url>
  │
  ▼
AIT CLI (PTY 伪终端)
  │  自动应答 trust/permission 提示
  │  轮询 report.json 更新仪表盘
  ▼
AI CLI (Claude Code / Codex)
  │  加载 SKILL.md
  ▼
SKILL.md (直接编排)
  │  并行调度 8 位专家
  ├─ Policy      (22%, 否决权)
  ├─ E-E-A-T     (17%)
  ├─ Content     (15%)
  ├─ Cookie      (13%)
  ├─ AdPlacement (10%)
  ├─ Traffic     (8%)
  ├─ Tech        (8%)
  └─ Legal       (7%)
  │
  ▼
99-summary/ — 汇总评分 + HTML 报告 + 行动计划
```

## 项目结构

```
adsense-lint/
├── ait.yaml                          # AIT 技能元数据
├── claude/
│   ├── SKILL.md                      # 技能入口
│   └── agents/

│       ├── ads-policy-expert.md      # 政策合规
│       ├── ads-eeat-expert.md        # E-E-A-T 评估
│       ├── ads-content-expert.md     # 内容质量
│       ├── ads-cookie-expert.md      # Cookie 合规
│       ├── ads-traffic-expert.md     # 流量分析
│       ├── ads-adplacement-expert.md # 广告位规划
│       ├── ads-tech-expert.md        # 技术合规
│       └── ads-legal-expert.md       # 法律合规
├── references/                       # 参考文档
│   ├── ad-policy-rules.md
│   ├── adplacement-guidelines.md
│   ├── content-quality.md
│   ├── cookie-compliance.md
│   ├── eeat-criteria.md
│   ├── legal-compliance.md
│   ├── report-template.md
│   ├── scoring-rubric.md
│   ├── tech-compliance.md
│   └── traffic-analysis.md
└── workflows/
    └── full-audit.md
```

## 常见问题

**Q: 能保证 AdSense 一定通过吗？**

不能。这是 AI 辅助审查系统，最终审批由 Google 人工审核员决定。

**Q: 远程模式需要联网吗？**

需要。Agent 使用 WebFetch 抓取线上页面分析。

**Q: 本地模式需要联网吗？**

不需要抓取页面，但 Agent 运行本身需要 AI CLI（云端模型）。

**Q: 可以添加自定义 Agent 吗？**

可以。在 `claude/agents/` 下放入新 agent 文件，更新 `shared/adsense-lint.md` 中的权重表和编排逻辑。

## License

MIT © [lococao](https://github.com/loco-cao)
