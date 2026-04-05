# 🚀 cf-drive 快速启动

## 一键启动本地开发环境

```bash
# 1. 安装依赖
npm install

# 2. 初始化本地数据库
npm run db:init

# 3. 构建前端
npm run build:frontend

# 4. 启动开发服务器
npm run dev
```

访问 `http://localhost:8787`

## 首次登录

启动后，控制台会输出默认管理员密码：

```
[cf-drive] 首次初始化：创建默认管理员账户
[cf-drive] 用户名: admin
[cf-drive] 密码: xxxxxxxxxxxxxxxx
```

使用这个密码登录管理后台：`http://localhost:8787/#/admin/login`

## 快速测试

### 1. 挂载 GitHub Releases（无需认证）

```json
{
  "mount_path": "/alist",
  "driver": "github",
  "addition": {
    "owner": "alist-org",
    "repo": "alist"
  }
}
```

访问 `http://localhost:8787/#/alist` 查看 alist 的所有 Release

### 2. 挂载 S3（需要 AWS 凭证）

```json
{
  "mount_path": "/s3",
  "driver": "s3",
  "addition": {
    "access_key_id": "YOUR_KEY",
    "secret_access_key": "YOUR_SECRET",
    "endpoint": "https://s3.amazonaws.com",
    "region": "us-east-1",
    "bucket": "your-bucket"
  }
}
```

## 常用命令

```bash
# 查看本地数据库
npm run db:query "SELECT * FROM mounts;"

# 重置本地环境
npm run db:reset

# 运行测试
npm test

# 部署到生产
npm run deploy
```

## 项目状态

✅ 核心功能已完成：
- 文件浏览器（响应式布局）
- 管理后台（挂载/用户/设置管理）
- 5 个驱动（OneDrive、百度网盘、115、S3、GitHub）
- JWT 认证
- KV 缓存
- 302 下载重定向

⚠️ 可选任务未完成：
- 属性测试（标记为 `*` 的任务）
- 单元测试

## 下一步

1. 测试各个驱动的挂载配置
2. 配置真实的网盘 API 凭证
3. 部署到 Cloudflare Workers
4. 配置自定义域名

## 需要帮助？

查看 `LOCAL_DEPLOYMENT.md` 获取详细部署指南。
