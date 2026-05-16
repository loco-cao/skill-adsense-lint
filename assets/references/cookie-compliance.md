# GDPR / CCPA / AdSense Cookie 合规检查清单

## 同意横幅要求

### 必须存在
- 首次访问时显示可见的横幅、模态框或弹窗
- 必须在任何非必要 Cookie 设置之前出现

### 可检测信号
HTML/JS 中的关键词：
- `cookie-consent`, `CookieConsent`, `gdpr`, `ccpa`
- `cookie-banner`, `cookie_banner`, `cookieconsent`

已知库：
- `react-cookie-consent`
- `@segment/consent-manager`
- `cookiebot`, `cookiebot-react`
- `vanilla-cookieconsent`
- `cookie-consent-js`

组件引用：
- `<CookieConsent`, `import { CookieConsent }`
- `<ConsentManager`, `import { ConsentManager }`
- `<CookieBanner`, `import { CookieBanner }`

自定义实现：
- `useEffect` 结合 `localStorage`/`sessionStorage` 和 cookie 关键词
- 状态变量如 `showBanner`, `setCookieConsent`, `consentGiven`

### 横幅内容
必须说明：
1. 使用了哪些 Cookie（必要、分析、广告）
2. 使用原因（个性化、测量、广告）
3. 如适用，提及第三方广告（Google AdSense）
4. 用户如何管理或撤回同意

### 用户选择
- 必须提供 **接受** 选项
- 必须提供 **拒绝 /  decline / 管理偏好** 选项
- 仅包含 "OK" 或 "Got it" 的横幅不符合 GDPR 要求

## AdSense 同意模式

如果网站上存在 AdSense：
- 应实现 Google 同意模式（`gtag('consent', ...)`）
- 默认状态应拒绝 `ad_storage` 和 `analytics_storage`，直到获得同意
- 欧洲经济区/英国用户需要此功能才能展示个性化广告

## 同意前拦截

非必要脚本（分析、广告、社交像素）不得在用户同意前加载。

检查：
- Google Analytics 脚本是否在 `<head>` 中无条件加载
- AdSense 脚本是否在同意横幅之前加载
- Facebook Pixel 或其他跟踪像素是否无条件加载

## 评分

| 条件 | 扣分 |
|-----------|---------|
| 无横幅 | 严重 |
| 有横幅但无拒绝选项 | 警告 |
| 缺少 AdSense 同意模式 | 警告 |
| 同意前加载跟踪脚本 | 警告 |
| 横幅文本模糊（未提及广告） | 信息 |
