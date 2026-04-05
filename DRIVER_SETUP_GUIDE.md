# 驱动配置指南

本文档详细说明如何为每个驱动获取必要的 API 凭证和配置参数。

---

## 📦 GitHub Releases（最简单，推荐测试）

**无需注册开发者应用！** 这是最容易配置的驱动，适合快速测试。

### 基础配置（无需 token）

```json
{
  "owner": "alist-org",
  "repo": "alist"
}
```

- `owner`: GitHub 用户名或组织名
- `repo`: 仓库名称

**示例挂载路径**: `/alist`

**访问**: `http://localhost:8787/#/alist` 可以看到 alist 项目的所有 Release

### 高级配置（使用 token 提升速率限制）

如果需要更高的 API 速率限制（从 60次/小时 提升到 5000次/小时）：

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 勾选 `public_repo` 权限
4. 生成 token

```json
{
  "owner": "alist-org",
  "repo": "alist",
  "token": "ghp_xxxxxxxxxxxxxxxxxxxx"
}
```

---

## 🗄️ S3 兼容存储

支持 AWS S3、Cloudflare R2、MinIO、阿里云 OSS、腾讯云 COS 等。

### AWS S3

1. 登录 AWS Console
2. 进入 IAM → Users → Create user
3. 创建用户并生成 Access Key
4. 附加策略：`AmazonS3ReadOnlyAccess`

```json
{
  "access_key_id": "AKIAIOSFODNN7EXAMPLE",
  "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "endpoint": "https://s3.amazonaws.com",
  "region": "us-east-1",
  "bucket": "my-bucket",
  "root_prefix": ""
}
```

### Cloudflare R2

1. 登录 Cloudflare Dashboard
2. 进入 R2 → Create bucket
3. 进入 Manage R2 API Tokens → Create API Token
4. 选择 "Read only" 权限

```json
{
  "access_key_id": "your-r2-access-key-id",
  "secret_access_key": "your-r2-secret-access-key",
  "endpoint": "https://your-account-id.r2.cloudflarestorage.com",
  "region": "auto",
  "bucket": "my-bucket",
  "root_prefix": ""
}
```

**注意**: R2 的 endpoint 格式为 `https://<account-id>.r2.cloudflarestorage.com`

### MinIO（自建对象存储）

```json
{
  "access_key_id": "minioadmin",
  "secret_access_key": "minioadmin",
  "endpoint": "http://localhost:9000",
  "region": "us-east-1",
  "bucket": "my-bucket",
  "root_prefix": ""
}
```

---

## ☁️ OneDrive

**需要注册 Azure 应用**

### 步骤 1: 注册 Azure 应用

#### 国际版 OneDrive

1. 访问 https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
2. 点击 "New registration"
3. 填写信息：
   - Name: `cf-drive`
   - Supported account types: 选择 "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: `http://localhost` (类型选择 Web)
4. 创建后记录 `Application (client) ID`
5. 进入 "Certificates & secrets" → "New client secret"
6. 创建密钥并记录 `Value`（这是 `client_secret`）

#### 世纪互联版 OneDrive（中国）

1. 访问 https://portal.azure.cn/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
2. 其他步骤同上

### 步骤 2: 配置 API 权限

1. 进入 "API permissions"
2. 点击 "Add a permission" → "Microsoft Graph"
3. 选择 "Delegated permissions"
4. 添加以下权限：
   - `Files.Read`
   - `Files.Read.All`
   - `offline_access`
5. 点击 "Grant admin consent"

### 步骤 3: 获取 refresh_token

使用以下工具获取 refresh_token：

**国际版**: https://alist.nn.ci/tool/onedrive/request

**世纪互联版**: https://alist.nn.ci/tool/onedrive/request?region=cn

或者手动获取：

1. 构造授权 URL（国际版）：
```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost&scope=Files.Read%20Files.Read.All%20offline_access
```

2. 在浏览器中访问，授权后会跳转到 `http://localhost?code=...`
3. 复制 URL 中的 `code` 参数
4. 使用 code 换取 refresh_token：

```bash
curl -X POST https://login.microsoftonline.com/common/oauth2/v2.0/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=YOUR_CODE" \
  -d "redirect_uri=http://localhost" \
  -d "grant_type=authorization_code"
```

### 配置示例

**国际版**:
```json
{
  "client_id": "your-client-id",
  "client_secret": "your-client-secret",
  "refresh_token": "your-refresh-token",
  "region": "global",
  "root_folder_path": "/"
}
```

**世纪互联版**:
```json
{
  "client_id": "your-client-id",
  "client_secret": "your-client-secret",
  "refresh_token": "your-refresh-token",
  "region": "cn",
  "root_folder_path": "/"
}
```

---

## 📱 百度网盘

**需要注册百度开发者应用**

### 步骤 1: 注册百度开发者

1. 访问 https://pan.baidu.com/union/main/application/personal
2. 登录百度账号
3. 创建应用：
   - 应用名称: `cf-drive`
   - 应用类型: 选择 "网盘API"
4. 创建后记录 `App Key` 和 `Secret Key`

### 步骤 2: 获取 refresh_token

1. 构造授权 URL：
```
https://openapi.baidu.com/oauth/2.0/authorize?response_type=code&client_id=YOUR_APP_KEY&redirect_uri=oob&scope=basic,netdisk
```

2. 在浏览器中访问，授权后会显示一个 `code`
3. 使用 code 换取 refresh_token：

```bash
curl "https://openapi.baidu.com/oauth/2.0/token?grant_type=authorization_code&code=YOUR_CODE&client_id=YOUR_APP_KEY&client_secret=YOUR_SECRET_KEY&redirect_uri=oob"
```

### 配置示例

```json
{
  "app_key": "your-app-key",
  "secret_key": "your-secret-key",
  "refresh_token": "your-refresh-token",
  "root_folder_path": "/"
}
```

---

## 🔢 115 网盘（Open API）

**需要 115 会员 + 开发者权限**

### 前提条件

- 115 会员账号
- 申请 115 Open API 权限（需要联系 115 客服）

### 步骤 1: 获取 access_token 和 refresh_token

115 Open API 的 token 获取流程较为复杂，建议使用第三方工具：

- 使用 alist 的 115 驱动获取 token
- 或参考 115 Open API 官方文档

### 配置示例

```json
{
  "access_token": "your-access-token",
  "refresh_token": "your-refresh-token",
  "root_folder_id": "0"
}
```

**注意**: 
- `root_folder_id` 为 `"0"` 表示根目录
- 115 的 token 会自动刷新并持久化到数据库

---

## 🎯 推荐测试顺序

### 1. GitHub Releases（最简单）

无需任何注册，直接配置：

```json
{
  "mount_path": "/alist",
  "driver": "github",
  "addition": {
    "owner": "alist-org",
    "repo": "alist"
  },
  "cache_expiration": 600
}
```

访问 `http://localhost:8787/#/alist` 即可看到效果。

### 2. S3 / R2（如果你有）

如果你有 Cloudflare R2 或 AWS S3，配置也很简单。

### 3. OneDrive / 百度网盘（需要注册应用）

这些需要注册开发者应用，流程稍复杂但功能强大。

### 4. 115 网盘（最复杂）

需要会员 + 开发者权限，不推荐新手尝试。

---

## 🔧 配置技巧

### Addition 字段格式

Addition 必须是有效的 JSON 字符串，例如：

```json
{
  "owner": "alist-org",
  "repo": "alist"
}
```

**常见错误**:
- ❌ 单引号: `{'owner': 'alist-org'}`
- ❌ 缺少引号: `{owner: "alist-org"}`
- ✅ 正确格式: `{"owner": "alist-org"}`

### 缓存过期时间建议

- GitHub Releases: 600-3600 秒（更新不频繁）
- OneDrive/百度网盘: 300-600 秒（平衡性能和实时性）
- S3: 300-900 秒（取决于文件更新频率）

### 挂载路径规则

- 必须以 `/` 开头
- 不能包含连续的 `//`
- 示例: `/github`, `/onedrive`, `/s3/backup`

---

## 🐛 常见问题

### Q: 挂载后显示 "error" 状态？

A: 检查以下几点：
1. Addition JSON 格式是否正确
2. API 凭证是否有效
3. 查看浏览器控制台和 Worker 日志的错误信息

### Q: 文件列表为空？

A: 可能原因：
1. `root_folder_path` 或 `root_folder_id` 配置错误
2. API 权限不足
3. 网盘中确实没有文件

### Q: 下载链接失效？

A: 
1. 检查 token 是否过期（会自动刷新）
2. 某些网盘的下载链接有时效性
3. 查看 302 重定向的目标 URL 是否正确

---

## 📚 参考资源

- **OneDrive**: https://docs.microsoft.com/en-us/graph/api/resources/onedrive
- **百度网盘**: https://pan.baidu.com/union/doc/
- **AWS S3**: https://docs.aws.amazon.com/s3/
- **Cloudflare R2**: https://developers.cloudflare.com/r2/
- **GitHub API**: https://docs.github.com/en/rest/releases

---

## 💡 提示

如果你只是想测试 cf-drive 的功能，强烈推荐先使用 **GitHub Releases** 驱动，无需任何注册，配置简单，立即可用！
