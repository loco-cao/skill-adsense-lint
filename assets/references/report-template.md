# 报告模板规范

## 单个专家报告 (`report.json`)

```json
{
  "expert": "ads-policy-expert",
  "score": 78,
  "maxScore": 100,
  "weight": 0.22,
  "status": "pass|warning|fail",
  "findings": [
    {
      "severity": "critical|warning|info",
      "category": "...",
      "title": "Short finding title",
      "description": "Detailed explanation",
      "evidence": "Quoted snippet or URL",
      "recommendation": "How to fix"
    }
  ],
  "summary": "Overall assessment in 1-2 sentences."
}
```

### 字段规则

- `score`: 整数 0–100
- `status`: 由分数派生 — 通过 (≥70)、警告 (60–69)、不通过 (<60)
- `findings`: 数组，每位专家最多 20 项。按严重级别排序（严重优先）。
- `evidence`: 尽可能提供具体的引用、URL 或行号参考。
- `recommendation`: 必须可操作。使用 "添加..."、"移除..."、"更新..." 等动词。

## 最终报告 (`report-final.json`)

```json
{
  "sessionId": "20260513-143022",
  "url": "https://example.com",
  "totalScore": 76.5,
  "grade": "B",
  "riskLevel": "medium",
  "vetoTriggered": false,
  "scores": {
    "policy": { "score": 85, "weight": 0.22, "weighted": 18.70 },
    "eeat": { "score": 72, "weight": 0.17, "weighted": 12.24 },
    "content": { "score": 80, "weight": 0.15, "weighted": 12.00 },
    "cookie": { "score": 65, "weight": 0.13, "weighted": 8.45 },
    "adplacement": { "score": 78, "weight": 0.10, "weighted": 7.80 },
    "traffic": { "score": 82, "weight": 0.08, "weighted": 6.56 },
    "tech": { "score": 90, "weight": 0.08, "weighted": 7.20 },
    "legal": { "score": 70, "weight": 0.07, "weighted": 4.90 }
  },
  "criticalIssues": [
    {
      "expert": "ads-policy-expert",
      "title": "...",
      "description": "..."
    }
  ],
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "title": "...",
      "owner": "which expert dimension",
      "action": "..."
    }
  ],
  "generatedAt": "2026-05-13T14:30:22Z"
}
```

## HTML 报告 (`report-final.html`)

必须包含：
1. 页头：网站 URL、会话 ID、时间戳
2. 分数仪表盘（大号总分 + 等级徽章）
3. 所有 8 个维度的柱状图或表格（原始分数、权重、加权贡献）
4. 严重问题区块（红色卡片）
5. 警告区块（黄色卡片）
6. 信息 / 建议区块（蓝色卡片）
7. 按优先级排序的行动计划表格
8. 页脚免责声明："本报告为 AI 辅助审查。最终的 AdSense 审批决定由 Google 做出。"

使用内联 CSS 以保证可移植性。不依赖外部资源。

## 行动计划 (`action-plan.md`)

结构：

```markdown
# AdSense Lint 行动计划

**URL:** https://example.com  
**生成时间:** 2026-05-13 14:30:22  
**总分:** 76.5/100 (等级 B)

## 严重（申请前修复）

1. **[维度]** 标题 — 操作
   - 证据: ...
   - 修复方法: ...

## 高优先级（1 周内修复）
...

## 中优先级（1 个月内修复）
...

## 低优先级（锦上添花）
...
```
