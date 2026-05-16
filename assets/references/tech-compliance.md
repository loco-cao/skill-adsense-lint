# 技术合规检查清单

## HTTPS / SSL
- 网站必须通过 `https://` 加载
- 禁止混合内容：HTTPS 页面上的 `http://` 资源会被标记
- 有效证书（未过期，公开站点非自签名）

## 移动端响应式
- 视口元标签存在：`<meta name="viewport" content="width=device-width, initial-scale=1">`
- 无固定宽度容器导致移动端布局破坏
- 字体大小无需缩放即可阅读（正文建议最小 16px）
- 图片缩放至容器宽度（`max-width: 100%` 或等效）

## 核心网页指标（推断）
- 图片应有明确的 `width` 和 `height` 属性或 CSS `aspect-ratio` 以防止 CLS
- 避免 `<head>` 中的渲染阻塞同步 JS/CSS
- 首屏无巨大未优化图片（>200KB 且无懒加载）

## 无障碍访问
- 所有图片必须有 `alt` 属性
- 键盘导航的焦点指示器可见（`:focus` 样式）
- 颜色对比度充足（避免浅灰配白色、红色配绿色）
- 表单输入有关联的 `<label>` 元素

## robots.txt
- 必须存在于 `/robots.txt`
- 不得包含：
  ```
  User-agent: *
  Disallow: /
  ```
- 应允许 `Mediapartners-Google`（AdSense 爬虫）：
  ```
  User-agent: Mediapartners-Google
  Disallow:
  ```

## Sitemap.xml
- 应存在于 `/sitemap.xml`
- 不存在不会阻断，但会影响可抓取性
- 应列出规范 URL，而非重定向或 404

## 安全
- 无可疑混淆 JavaScript（过度使用 `eval`, `atob`, `fromCharCode`）
- 无意外第三方 iframe
- 无自动下载提示
- 脚本中无已知恶意域名引用

## 评分阈值

| 分数 | 含义 |
|-------|---------|
| 90–100 | 技术健康状况优秀 |
| 70–89 | 良好，轻微问题 |
| 60–69 | 有风险 |
| 0–59 | 严重（无 HTTPS、阻止爬虫、恶意软件） |
