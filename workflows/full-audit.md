# 完整审计工作流

<purpose>
执行完整的 AdSense 多专家审查工作流。
默认流程：跨 8 个维度并行审查 → 加权汇总 → 报告生成
</purpose>

<required_reading>
@$HOME/.claude/adsense-lint/references/scoring-rubric.md
@$HOME/.claude/adsense-lint/references/report-template.md
</required_reading>

<available_agent_types>
- ads-policy-expert — AdSense 政策合规审查
- ads-eeat-expert — E-E-A-T 评估
- ads-content-expert — 内容质量分析
- ads-cookie-expert — Cookie 同意合规
- ads-traffic-expert — 流量和使用痕迹分析
- ads-adplacement-expert — 广告位评估
- ads-tech-expert — 技术合规（HTTPS、响应式、Core Web Vitals、无障碍）
- ads-legal-expert — 法律页面深度合规（隐私、条款、DMCA、年龄限制）
</available_agent_types>

<process>

## 1. 初始化

定义会话目录：

```bash
SESSION_DIR=".adsense-lint/session-$(date +%Y%m%d-%H%M%S)"
```

无需手动创建子目录。Write 工具写入文件时会自动创建缺失的目录。

## 2. 分两批并行审查

为避免单次并行过多导致 timeout，将 8 位专家分为两批，每批 4 个。

**第一批（轻量/中等负载）— 并行启动：**

| 专家 | 输出路径 |
|--------|-------------|
| @ads-policy-expert | 01-policy/report.json |
| @ads-eeat-expert | 02-eeat/report.json |
| @ads-cookie-expert | 04-cookie/report.json |
| @ads-tech-expert | 07-tech/report.json |

**第二批（重负载）— 第一批全部完成后并行启动：**

| 专家 | 输出路径 |
|--------|-------------|
| @ads-content-expert | 03-content/report.json |
| @ads-traffic-expert | 05-traffic/report.json |
| @ads-adplacement-expert | 06-adplacement/report.json |
| @ads-legal-expert | 08-legal/report.json |

## 3. 等待完成

轮询直到全部 8 个 `report.json` 文件存在。每批内并行，批次间串行。如果有专家在重试一次后仍失败，记分为 0 并记录失败。

## 4. 分数汇总

读取所有报告。使用固定权重计算加权总分：

- policy: 22%
- eeat: 17%
- content: 15%
- cookie: 13%
- adplacement: 10%
- traffic: 8%
- tech: 8%
- legal: 7%

应用否决规则：如果 policy 分数 < 60，无论总分如何最终等级均为 F。

## 5. 生成交付物

在 `99-summary/` 中产出：

- `report-final.json` — 结构化数据
- `report-final.html` — 可视化仪表板
- `action-plan.md` — 按优先级排序的修复项

## 6. 终端输出

向用户终端输出简洁的分数摘要。

</process>
