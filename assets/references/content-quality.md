# 内容质量评估维度

## 最低字数要求
- 每个有意义的页面必须包含 ≥300 字的实质性文本
- 字数统计中排除导航、页脚模板文本、代码块和导入语句
- 工具页面（隐私政策、服务条款、联系页面）不受 300 字最低限制，但不得为空

## 占位文本检测
标记包含以下任何内容的页面：
- `lorem ipsum`
- `placeholder`
- `todo`
- `coming soon`
- `under construction`
- `insert text here`
- `sample text`

## AI 写作模式检测
表示 AI 生成内容的陈词滥调。如果全站出现 3 种以上不同实例，则标记：

- "in conclusion"
- "it is important to note"
- "it is worth noting"
- "it should be noted"
- "delve into"
- "navigate the complexities"
- "landscape of"
- "tapestry of"
- "multifaceted"
- "ever-evolving"
- "crucial"
- "paramount"
- "underscores the importance"
- "serves as a testament"
- "a myriad of"
- "plethora of"
- "robust"
- "holistic"
- "seamless"

## 图片可访问性
- 每个 `<img>` 标签必须有 `alt` 属性
- 装饰性图片的 `alt` 可以为空（`alt=""`），但必须存在

## 素材图片检测
标记图片来源包含以下内容：
- `shutterstock` 后跟数字
- `istock` 后跟数字
- `gettyimages` 后跟数字
- `stock_photo` 或 `stock-photo` 后跟数字
- `depositphotos` 后跟数字
- `adobestock` 后跟数字

## 页面结构要求
每个页面必须有：
- `<title>` 标签或元数据标题导出
- 元描述（`<meta name="description">` 或元数据导出）
- 一个 `<h1>` 标题

## 更新频率
- 时效性内容（新闻、评论、科技）应在 12 个月内更新
- 常青内容应在 24 个月内审查
- 文章上的陈旧日期属于轻微扣分项
