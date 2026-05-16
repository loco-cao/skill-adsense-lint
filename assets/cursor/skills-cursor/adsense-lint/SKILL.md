---
name: adsense-lint
description: "AdSense 多专家 AI 审查系统（Cursor 版）— 全面的网站 AdSense 合规性审计"
argument-hint: "<url> [--auto]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
  - WebFetch
  - Grep
---

# AdSense Lint Skill (Cursor 版)

> 注意：Cursor 不支持 Agent 工具。本 skill 在单个会话中按顺序执行全部 8 项专家审查。

## 参数

- `<url>` — 要审计的目标网站 URL（必填）
- `[--auto]` — 跳过交互式确认（可选）

## 飞行前检查

1. 验证 URL 格式。
2. **测试网络可达性**：
   ```bash
   curl -I --max-time 10 --connect-timeout 5 "<target-url>" > /dev/null 2>&1 && echo "REACHABLE" || echo "UNREACHABLE"
   ```
   如果不可达，警告用户并询问是否继续。
3. 创建会话目录：
   ```bash
   SESSION_DIR=".adsense-lint/session-$(date +%Y%m%d-%H%M%S)"
   mkdir -p "$SESSION_DIR"/{01-policy,02-eeat,03-content,04-cookie,05-traffic,06-adplacement,07-tech,08-legal,99-summary}
   ```

## 弹性与超时规则

- **每次 WebFetch 必须设置 15 秒超时。** 最多再重试 2 次（共 3 次尝试），每次间隔 2 秒。
- **每次 Bash curl 必须使用 `--max-time 15 --connect-timeout 10 --retry 2`。**
- **如果目标网站在所有重试后仍不可达**，写入失败的 `report.json`，其中 `score: 0`、`status: "failed"`，并添加一个标题为 `目标网站不可达` 的严重发现。
- **不要无限等待。** 如果单项审查在 60 秒内无法完成，中止并写入失败的报告，然后继续下一项审查。
- **全局超时**：整个顺序审计必须在 10 分钟内完成。如果超时，跳过剩余审查并使用已有报告进行汇总。

## 顺序审查流程

逐一执行以下 8 项审查。每项完成后，将 `report.json` 写入对应的子目录。

### 1. 政策审查 (`01-policy/`)
- 获取首页和主要页面。
- 扫描禁止内容、隐藏文本、关键词堆砌（密度 >8%）、门页（<50 字）、重复内容（相似度 >75%）。
- 写入 `01-policy/report.json`。

### 2. E-E-A-T 审查 (`02-eeat/`)
- 获取 About、Contact、首页。
- 检查是否存在占位邮箱（`@example.com` 等）、虚假地址、模板变量（`{{company}}` 等）、过时的版权信息（>2 年）。
- 检查 About 和 Contact 页面标题之间的品牌一致性。
- 写入 `02-eeat/report.json`。

### 3. 内容审查 (`03-content/`)
- 获取 5 个代表性页面。
- 检查每页字数（最少 300）、占位文本、AI 写作陈词滥调（3 处以上）、缺失的图片 `alt`、库存照片文件名、title/meta/h1 是否存在。
- 写入 `03-content/report.json`。

### 4. Cookie 审查 (`04-cookie/`)
- 获取首页。
- 检测同意横幅（关键词、库、组件）。
- 验证接受 + 拒绝选项、AdSense 同意模式、预同意跟踪。
- 写入 `04-cookie/report.json`。

### 5. 流量审查 (`05-traffic/`)
- 检查互动信号（评论、分享、订阅、近期日期）。
- 标记流量交换小部件、自动刷新、弹窗下广告、点击诱饵。
- 写入 `05-traffic/report.json`。

### 6. 广告位审查 (`06-adplacement/`)
- 统计每页的 `<ins class="adsbygoogle">` 数量。
- 确保移动端视口广告数 ≤2。
- 检查与按钮、输入框、二维码的接近程度（±5 行）。
- 标记覆盖式广告、404/登录页面上的广告。
- 写入 `06-adplacement/report.json`。

### 7. 技术审查 (`07-tech/`)
- 验证 HTTPS、viewport meta、图片尺寸、alt 文本。
- 获取 `/robots.txt`（确保未屏蔽 Googlebot）和 `/sitemap.xml`。
- 扫描可疑脚本。
- 写入 `07-tech/report.json`。

### 8. 法律审查 (`08-legal/`)
- 定位 About、Privacy、Contact、Terms 页面。
- 获取 Privacy 和 Terms。检查必要条款（数据收集、第三方共享、Cookie 使用、用户权利、DMCA、联系信息）。
- 验证真实联系信息（邮箱、电话、地址、表单）。
- 写入 `08-legal/report.json`。

## 汇总

在所有 8 份报告都存在后，计算加权总分：

| 维度 | 权重 |
|-----------|--------|
| policy | 22% |
| eeat | 17% |
| content | 15% |
| cookie | 13% |
| adplacement | 10% |
| traffic | 8% |
| tech | 8% |
| legal | 7% |

否决：如果 policy 分数 < 60，等级 = F。

在 `99-summary/` 中生成：
- `report-final.json`
- `report-final.html`（可视化仪表板）
- `action-plan.md`（按严重程度排序）

## 终端摘要

输出：
```
AdSense Lint Review Complete
==============================
Score: <total>/100 (Grade <grade>)
Risk: <LOW|MEDIUM|HIGH>
Critical Issues: <N>

Reports saved to: <SESSION_DIR>/99-summary/
```
