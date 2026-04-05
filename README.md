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
- **百度网盘** - 需要百度开发者应用
- 其他驱动

## 🚀 快速开始

### 一键启动本地开发

```bash
# 1. 克隆项目
git clone https://github.com/你的用户名/cf-drive.git
cd cf-drive

# 2. 安装依赖
npm install

# 3. 复制配置文件
cp wrangler.toml.example wrangler.toml

# 4. 初始化本地数据库
npm run db:init

# 5. 构建前端
npm run build:frontend

# 6. 启动开发服务器
npm run dev
```

访问 `http://localhost:8787`

### 首次登录

启动后，控制台会输出默认管理员密码：

```
[cf-drive] Default admin created. Initial password: xxxxxxxxxxxxxxxx
```

使用用户名 `admin` 和这个密码登录管理后台。

### 快速测试挂载

#### 1. GitHub Releases（无需认证）

在管理后台创建挂载：

```json
{
  "mount_path": "/alist",
  "driver": "github",
  "addition": {
    "owner": "alist-org",
    "repo": "alist"
  },
  "cache_expiration": 3600
}
```

访问 `http://localhost:8787/#/alist` 查看 alist 的所有 Release。

#### 2. Cloudflare R2

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

### 生产部署

```bash
# 1. 创建 Cloudflare 资源
wrangler d1 create cf-drive-db
wrangler kv:namespace create KVdrive

# 2. 更新 wrangler.toml 中的 database_id 和 kv id

# 3. 初始化生产数据库
wrangler d1 execute cf-drive-db --file=./migrations/001_init.sql

# 4. 设置 JWT 密钥（生产环境必须设置）
wrangler secret put JWT_SECRET

# 5. 部署
npm run deploy
```

详细说明请查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 和 [DRIVER_SETUP_GUIDE.md](./DRIVER_SETUP_GUIDE.md)

## 📦 支持的驱动

| 驱动 | 说明 | 需要的配置 | 测试状态 |
|------|------|-----------|---------|
| **GitHub** | GitHub Releases 文件托管 | owner, repo, token (可选) | ✅ 已测试 |
| **S3** | AWS S3 及兼容存储（R2、MinIO 等） | access_key_id, secret_access_key, endpoint, region, bucket | ✅ 已测试 |
| **OneDrive** | 支持国际版和世纪互联版 | client_id, client_secret, refresh_token | ⏳ 待测试 |
| **百度网盘** | 百度个人云存储 | app_key, secret_key, refresh_token | ⏳ 待测试 |
| **115 网盘** | 115 Open API | access_token, refresh_token | ⏳ 待测试 |

## 🔧 配置示例

### OneDrive

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

### 百度网盘

```json
{
  "mount_path": "/baidu",
  "driver": "baidu",
  "addition": {
    "app_key": "your-app-key",
    "secret_key": "your-secret-key",
    "refresh_token": "your-refresh-token",
    "root_folder_path": "/"
  },
  "cache_expiration": 300
}
```

### 115 网盘

```json
{
  "mount_path": "/115",
  "driver": "open115",
  "addition": {
    "access_token": "your-access-token",
    "refresh_token": "your-refresh-token"
  },
  "cache_expiration": 300
}
```

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
│   │   ├── base.ts           # 驱动基类
│   │   ├── registry.ts       # 驱动注册表
│   │   ├── github.ts         # GitHub Releases
│   │   ├── s3.ts             # S3/R2
│   │   ├── onedrive.ts       # OneDrive
│   │   ├── baidu.ts          # 百度网盘
│   │   └── open115.ts        # 115 网盘
│   ├── middleware/           # 中间件（认证、CORS）
│   ├── routes/               # API 路由
│   │   ├── auth.ts           # 认证路由
│   │   ├── fs.ts             # 文件系统路由
│   │   ├── download.ts       # 下载路由
│   │   └── admin/            # 管理后台路由
│   ├── utils/                # 工具函数
│   └── frontend/             # 内嵌前端 HTML
├── frontend/                 # 前端源码
│   └── index.html            # 单文件 SPA
├── migrations/               # D1 数据库迁移
├── scripts/                  # 构建脚本
└── wrangler.toml             # Cloudflare Workers 配置
```

## 🛠️ 常用命令

```bash
# 开发
npm run dev                    # 启动开发服务器
npm run build                  # 构建项目
npm run build:frontend         # 仅构建前端

# 数据库
npm run db:init                # 初始化本地数据库
npm run db:reset               # 重置本地数据库
npm run db:query "SQL"         # 查询本地数据库

# 部署
npm run deploy                 # 部署到生产环境
npm run deploy:db              # 初始化生产数据库

# 测试
npm test                       # 运行测试
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
- 生产环境必须设置自定义 JWT_SECRET

## ⚠️ 注意事项

### 功能限制
- 本项目仅支持只读操作（浏览 + 下载）
- 不支持文件上传、复制、移动、删除
- 不支持 WebDAV、FTP/SFTP

### Cloudflare 免费版限制
- Workers: 10万次请求/天
- D1: 5GB 存储，500万次读/天，10万次写/天
- KV: 10万次读/天，1000次写/天

### 缓存建议
- 经常变化的存储（如 R2）：设置较短缓存时间（60-300秒）或使用刷新按钮
- 不常变化的存储（如 GitHub Releases）：可设置较长缓存时间（3600秒）

## 🎯 路线图

- [x] 核心功能（文件浏览、下载、管理后台）
- [x] 5 个驱动（GitHub、S3、OneDrive、百度、115）
- [x] JWT 认证和权限管理
- [x] KV 缓存和手动刷新
- [ ] 测试更多驱动
- [ ] 添加更多驱动（Google Drive、Dropbox 等）
- [ ] 支持文件搜索
- [ ] 支持文件预览（图片、视频）
- [ ] 支持批量下载（打包为 ZIP）
- [ ] 添加访问统计
- [ ] 支持自定义主题

## 📚 文档

- [部署指南](./DEPLOYMENT.md)
- [驱动配置指南](./DRIVER_SETUP_GUIDE.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT

## 💬 反馈

如有问题或建议，请提交 Issue。
