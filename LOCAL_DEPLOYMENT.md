# cf-drive 本地部署指南

## 前提条件

1. 安装 Node.js (v18+)
2. 安装 wrangler CLI: `npm install -g wrangler`
3. 登录 Cloudflare 账户: `wrangler login`

## 本地开发环境说明

**好消息：** `wrangler dev` 支持本地模拟 D1、KV 等 Cloudflare 服务，无需真实的云端资源！

- **D1 数据库**: 使用本地 SQLite 文件模拟
- **KV 存储**: 使用本地文件系统模拟
- **Workers 运行时**: 使用 Miniflare 模拟

## 快速开始

### 1. 安装依赖

```bash
cd cf-drive
npm install
```

### 2. 初始化本地数据库

创建本地 D1 数据库并执行迁移：

```bash
# 创建本地数据库（会在 .wrangler/state/v3/d1/ 目录下创建 SQLite 文件）
wrangler d1 execute cf-drive-db --local --file=./migrations/001_init.sql
```

### 3. 构建前端

```bash
npm run build:frontend
```

### 4. 启动本地开发服务器

```bash
npm run dev
```

或者使用 wrangler 直接启动：

```bash
wrangler dev --local
```

服务器会启动在 `http://localhost:8787`

### 5. 首次登录

首次启动时，系统会自动创建默认管理员账户：
- 用户名: `admin`
- 密码: 会在控制台输出（16位随机字符串）

查看控制台日志找到初始密码，然后访问 `http://localhost:8787/#/admin/login` 登录。

## 本地开发工作流

### 查看本地数据库

```bash
# 进入 D1 数据库 shell
wrangler d1 execute cf-drive-db --local --command="SELECT * FROM users;"

# 或者使用交互式 shell
wrangler d1 execute cf-drive-db --local --command=".tables"
```

### 清空本地数据

```bash
# 删除本地数据库文件
rm -rf .wrangler/state/

# 重新初始化
wrangler d1 execute cf-drive-db --local --file=./migrations/001_init.sql
```

### 修改代码后自动重载

`wrangler dev` 会监听文件变化并自动重载，但如果修改了前端代码，需要重新构建：

```bash
npm run build:frontend
```

## 测试挂载配置

### 示例：挂载 S3 兼容存储

1. 访问 `http://localhost:8787/#/admin/storage`
2. 点击"新建挂载"
3. 填写配置：
   ```json
   {
     "mount_path": "/s3",
     "driver": "s3",
     "addition": {
       "access_key_id": "your-key",
       "secret_access_key": "your-secret",
       "endpoint": "https://s3.amazonaws.com",
       "region": "us-east-1",
       "bucket": "your-bucket"
     },
     "cache_expiration": 300
   }
   ```

### 示例：挂载 GitHub Releases

```json
{
  "mount_path": "/github",
  "driver": "github",
  "addition": {
    "owner": "alist-org",
    "repo": "alist",
    "token": "ghp_xxxxxxxxxxxx"
  },
  "cache_expiration": 600
}
```

## 常见问题

### Q: 本地 KV 数据存储在哪里？
A: `.wrangler/state/v3/kv/` 目录下

### Q: 如何重置管理员密码？
A: 删除 `.wrangler/state/` 目录，重新初始化数据库

### Q: 本地开发时能访问真实的网盘 API 吗？
A: 可以！只要配置了正确的 API 凭证（refresh_token、access_token 等），本地 Worker 可以正常调用外部 API

### Q: 本地和生产环境有什么区别？
A: 
- 本地使用 SQLite 文件，生产使用 Cloudflare D1（分布式 SQLite）
- 本地使用文件系统模拟 KV，生产使用真实的边缘 KV
- 性能和延迟不同，但功能完全一致

## 部署到 Cloudflare

准备好后，可以部署到生产环境：

### 1. 创建生产资源

```bash
# 创建 D1 数据库
wrangler d1 create cf-drive-db

# 创建 KV 命名空间
wrangler kv:namespace create KVdrive

# 更新 wrangler.toml 中的 database_id 和 kv id
```

### 2. 初始化生产数据库

```bash
wrangler d1 execute cf-drive-db --file=./migrations/001_init.sql
```

### 3. 设置 JWT 密钥

```bash
wrangler secret put JWT_SECRET
# 输入一个强随机字符串（至少 32 字符）
```

### 4. 部署

```bash
npm run deploy
```

部署完成后，访问 Cloudflare 提供的 `*.workers.dev` 域名。

## 开发建议

1. **先在本地测试所有功能**，确保正常工作后再部署到生产
2. **备份生产数据库**：定期导出 D1 数据
3. **使用环境变量**：敏感信息（API 密钥等）使用 `wrangler secret` 管理
4. **监控日志**：生产环境使用 `wrangler tail` 查看实时日志

## 下一步

- 配置自定义域名
- 设置 Cloudflare Access 保护管理后台
- 配置 Rate Limiting 防止滥用
- 添加更多驱动支持
