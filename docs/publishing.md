# 发布指南

如何将 `adsense-lint` 发布到 npm 官方仓库。

## 前置条件

- Node.js 20+
- 一个启用了 2FA 的 npm 账号
- 一个 Granular Access Token，具有 `adsense-lint` 包的 **Read and write** 权限

## 检查当前镜像源

如果你在中国或之前切换过镜像源，先确认当前 registry：

```bash
npm config get registry
```

如果返回的不是 `https://registry.npmjs.org/`，请在下方所有命令后追加 `--registry https://registry.npmjs.org`，或临时切换：

```bash
npm config set registry https://registry.npmjs.org
# 发布完成后记得切回原镜像
```

## 步骤 1：生成 Access Token

因为该账号启用了 2FA，密码直接发布会被拦截，必须使用 Token。

1. 打开 https://www.npmjs.com/settings/tokens/new
2. 选择 **Granular Access Token**
3. 填写：
   - **Token name**：`publish-adsense-lint`
   - **Packages and scopes**：`Read and write`
   - **Allowed packages**：选择 `Only select packages`，输入 `adsense-lint`
4. 点击 **Generate**，复制 Token（`npm_...` 开头）

## 步骤 2：配置 Token（推荐方式）

直接把 Token 写入 npm 配置，绕过交互式登录的兼容性问题：

```bash
npm config set //registry.npmjs.org/:_authToken=你的Token
```

将 `你的Token` 替换为步骤 1 中复制的 `npm_...` 字符串。

验证配置：

```bash
npm whoami --registry https://registry.npmjs.org
```

应输出你的 npm 用户名。

### 备选：交互式登录

如果上述方式无效，可尝试：

```bash
npm login --auth-type=legacy --registry https://registry.npmjs.org
```

按提示输入用户名、Token（作为 Password）、邮箱。

## 步骤 3：构建

```bash
npm run build
```

## 步骤 4：发布

```bash
npm publish --registry https://registry.npmjs.org --access public
```

成功后会显示：

```
+ adsense-lint@0.1.0
```

## 步骤 5：验证

```bash
npm view adsense-lint
```

等待 1-2 分钟后，即可通过 npx 全局使用：

```bash
npx adsense-lint
```

## 常见问题

### `ENEEDAUTH` 错误

会话已过期，用新 Token 重新执行 `npm login --auth-type=legacy`。

### `403 Forbidden - Two-factor authentication ... is required`

原因：
- 未登录，或
- 用密码登录而不是 Token

解决：生成新的 Granular Access Token（见步骤 1），重新登录。

### `npm adduser` 崩溃，报错 "Exit handler never called"

这是 npm CLI 在某些终端上的已知 Bug。改用浏览器流程：

```bash
npm adduser --registry https://registry.npmjs.org
```

复制终端打印的 URL 到浏览器完成登录，然后回到终端执行 `npm whoami` 验证。

如果浏览器流程也失败，回退到 `npm login --auth-type=legacy` 的 Token 方式。

### 包名已被占用

执行 `npm view adsense-lint`，如果有返回数据说明名已被占。你需要联系原所有者转让，或在 `package.json` 中改名。

## 后续版本升级

首次发布后，再次发布前需要先升版本号：

```bash
npm version patch   # 0.1.0 -> 0.1.1
npm version minor   # 0.1.0 -> 0.2.0
npm version major   # 0.1.0 -> 1.0.0
```

然后重新执行 `npm run build` 和 `npm publish`。
