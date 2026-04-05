# cf-drive

一个运行在 Cloudflare Workers 上的只读网盘聚合服务，使用 TypeScript + Hono 框架构建。

## ✨ 特性

- 🌐 **多网盘支持**: OneDrive、百度网盘、115 网盘、S3 兼容存储、GitHub Releases
- 📁 **统一浏览**: 通过统一的 Web UI 浏览所有挂载的网盘
- ⚡ **边缘计算**: 运行在 Cloudflare Workers，全球低延迟访问
- 🔒 **安全认证**: JWT 认证 + 管理后台
- 💾 **智能缓存**: KV 缓存文件列表和 OAuth token
- 📱 **响应式设计**: 支持桌面和移动端（≥375px）
- 🚀 **302 重定向**: 直接从源站下载，不占用 Worker 流量
- 🔄 **手动刷新**: 支持强制刷新文件列表

## 🧪 驱动测试状态

### 已测试 ✅
- **GitHub Releases** - 展示 GitHub 仓库的 Release 文件
- **S3 / R2** - 兼容 S3 协议的对象存储（Cloudflare R2、AWS S3 等）

### 待测试 ⏳
- **OneDrive** - 需要注册 Microsoft 应用
- **115 网盘** - 需要 115 账号和 Cookie
- 其他驱动

## 🚀 快速开始

### 本地开发

```bash
# 1. 克隆项目
git clone <your-repo>
cd cf-drive

# 2. 安装依赖
npm install

# 3. 初始化本地数据库
npm run db:init

# 4. 构建前端
npm run build:frontend

# 5. 启动开发服务器
npm run dev
```

访问 `http://localhost:8787`，首次启动会在控制台输出管理员密码。

详细说明请查看 [QUICKSTART.md](./QUICKSTART.md)

### 生产部署

```bash
# 1. 创建 Cloudflare 资源
wrangler d1 create cf-drive-db
wrangler kv:namespace create KVdrive

# 2. 更新 wrangler.toml 中的 database_id 和 kv id

# 3. 初始化生产数据库
wrangler d1 execute cf-drive-db --file=./migrations/001_init.sql

# 4. 设置 JWT 密钥
wrangler secret put JWT_SECRET

# 5. 部署
npm run deploy
```

详细说明请查看 [LOCAL_DEPLOYMENT.md](./LOCAL_DEPLOYMENT.md)

## 📦 支持的驱动

| 驱动 | 说明 | 需要的配置 |
|------|------|-----------|
| **OneDrive** | 支持国际版和世纪互联版 | client_id, client_secret, refresh_token |
| **百度网盘** | 百度个人云存储 | app_key, secret_key, refresh_token |
| **115 网盘** | 115 Open API | access_token, refresh_token |
| **S3** | AWS S3 及兼容存储（R2、MinIO 等） | access_key_id, secret_access_key, endpoint, region, bucket |
| **GitHub** | GitHub Releases 文件托管 | owner, repo, token (可选) |

## 🏗️ 架构

```
用户浏览器
    ↓
Cloudflare Workers (Hono)
    ↓
├─ D1 (SQLite) - 存储配置、用户、设置
├─ KV - 缓存 token 和文件列表
└─ 各网盘 API
    ├─ OneDrive (Microsoft Graph API)
    ├─ 百度网盘 API
    ├─ 115 Open API
    ├─ S3 兼容存储
    └─ GitHub API
```

## 📁 项目结构

```
cf-drive/
├── src/
│   ├── index.ts              # Worker 入口
│   ├── types.ts              # 全局类型定义
│   ├── auth/                 # 认证模块（JWT、密码哈希）
│   ├── cache/                # KV 缓存管理
│   ├── db/                   # D1 数据库查询
│   ├── drivers/              # 网盘驱动实现
│   ├── middleware/           # 中间件（认证、CORS）
│   ├── routes/               # API 路由
│   ├── utils/                # 工具函数
│   └── frontend/             # 内嵌前端 HTML
├── frontend/                 # 前端源码
│   └── index.html            # 单文件 SPA
├── migrations/               # D1 数据库迁移
├── scripts/                  # 构建脚本
└── wrangler.toml             # Cloudflare Workers 配置
```

## 🔧 配置示例

### 挂载 OneDrive

```json
{
  "mount_path": "/onedrive",
  "driver": "onedrive",
  "addition": {
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "refresh_token": "your-refresh-token",
    "region": "global",
    "root_folder_path": "/"
  },
  "cache_expiration": 300
}
```

### 挂载 S3 (Cloudflare R2)

```json
{
  "mount_path": "/r2",
  "driver": "s3",
  "addition": {
    "access_key_id": "your-key",
    "secret_access_key": "your-secret",
    "endpoint": "https://your-account.r2.cloudflarestorage.com",
    "region": "auto",
    "bucket": "your-bucket"
  },
  "cache_expiration": 600
}
```

### 挂载 GitHub Releases

```json
{
  "mount_path": "/releases",
  "driver": "github",
  "addition": {
    "owner": "alist-org",
    "repo": "alist",
    "token": "ghp_xxxxxxxxxxxx"
  },
  "cache_expiration": 3600
}
```

## 🛠️ 开发

### 运行测试

```bash
npm test
```

### 查看本地数据库

```bash
npm run db:query "SELECT * FROM mounts;"
```

### 重置本地环境

```bash
npm run db:reset
```

## 📝 技术栈

- **运行时**: Cloudflare Workers
- **框架**: Hono (轻量级 Web 框架)
- **语言**: TypeScript
- **数据库**: Cloudflare D1 (SQLite)
- **缓存**: Cloudflare KV
- **认证**: JWT (Web Crypto API)
- **测试**: Vitest + fast-check

## 🔒 安全性

- 密码使用 SHA-256 双重哈希存储
- JWT 使用 HS256 签名
- 支持访客访问控制（guest_access 设置）
- 管理后台需要 admin 角色
- 所有加密操作使用 Web Crypto API

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📚 文档

- [快速启动指南](./QUICKSTART.md)
- [本地部署指南](./LOCAL_DEPLOYMENT.md)
- [需求文档](../.kiro/specs/cf-drive/requirements.md)
- [设计文档](../.kiro/specs/cf-drive/design.md)
- [任务列表](../.kiro/specs/cf-drive/tasks.md)

## ⚠️ 注意事项

- 本项目仅支持只读操作（浏览 + 下载）
- 不支持文件上传、复制、移动、删除
- 不支持 WebDAV、FTP/SFTP
- Cloudflare Workers 免费版有请求限制（10万次/天）
- D1 免费版有存储限制（5GB）
- KV 免费版有读写限制（10万次读/天，1000次写/天）

## 🎯 路线图

- [ ] 添加更多驱动（Google Drive、Dropbox 等）
- [ ] 支持文件搜索
- [ ] 支持文件预览（图片、视频）
- [ ] 支持批量下载（打包为 ZIP）
- [ ] 添加访问统计
- [ ] 支持自定义主题

## 💬 反馈

如有问题或建议，请提交 Issue。
