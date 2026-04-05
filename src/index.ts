// Worker 入口，Hono app 注册

import { Hono } from "hono";
import type { Env } from "./types";
import { corsMiddleware } from "./middleware/cors";
import { authMiddleware, adminRoleMiddleware, optionalAuthMiddleware } from "./middleware/auth";
import { authRoutes } from "./routes/auth";
import { fsRoutes } from "./routes/fs";
import { downloadRoutes } from "./routes/download";
import { storageRoutes } from "./routes/admin/storage";
import { userRoutes } from "./routes/admin/user";
import { driverRoutes } from "./routes/admin/driver";
import { settingRoutes } from "./routes/admin/setting";
import { getUsers, createUser, getSetting } from "./db/queries";
import { hashPassword, generateSalt, generatePassword } from "./auth/password";
import { verifyJWT } from "./auth/jwt";
import { FRONTEND_HTML } from "./frontend/index";

// 初始化页面 HTML
function getInitHTML(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>初始化 cf-drive</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;color:#333;min-height:100vh;display:flex;align-items:center;justify-content:center}
.init-box{background:#fff;border-radius:10px;padding:40px;width:400px;max-width:95vw;border:1px solid #e5e5e5;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
.init-box h1{text-align:center;margin-bottom:10px;font-size:24px;color:#0070f3}
.init-box p{text-align:center;margin-bottom:30px;color:#666;font-size:14px}
.form-group{margin-bottom:20px}
.form-group label{display:block;font-size:14px;color:#555;margin-bottom:8px;font-weight:500}
.form-group input{width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;outline:none;transition:border .15s}
.form-group input:focus{border-color:#0070f3}
.btn{width:100%;padding:12px;border-radius:6px;border:none;background:#0070f3;color:#fff;font-size:14px;font-weight:500;cursor:pointer;transition:background .15s}
.btn:hover{background:#005cc5}
.btn:disabled{background:#ccc;cursor:not-allowed}
.error-msg{color:#e00;font-size:13px;margin-top:8px;display:none}
.success-msg{color:#1a7f37;font-size:13px;margin-top:8px;display:none}
.tips{background:#f0f7ff;border:1px solid #d0e7ff;border-radius:6px;padding:12px;margin-top:20px;font-size:13px;color:#0070f3}
</style>
</head>
<body>
<div class="init-box">
  <h1>🚀 欢迎使用 cf-drive</h1>
  <p>首次使用，请设置管理员账户</p>
  
  <form id="initForm">
    <div class="form-group">
      <label>用户名</label>
      <input type="text" id="username" value="admin" required>
    </div>
    
    <div class="form-group">
      <label>密码（至少6位）</label>
      <input type="password" id="password" required minlength="6">
    </div>
    
    <div class="form-group">
      <label>确认密码</label>
      <input type="password" id="password2" required minlength="6">
    </div>
    
    <button type="submit" class="btn" id="submitBtn">创建管理员账户</button>
    
    <div class="error-msg" id="errorMsg"></div>
    <div class="success-msg" id="successMsg"></div>
  </form>
  
  <div class="tips">
    💡 提示：请妥善保管密码，忘记密码需要通过数据库重置
  </div>
</div>

<script>
document.getElementById('initForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const password2 = document.getElementById('password2').value;
  const errorMsg = document.getElementById('errorMsg');
  const successMsg = document.getElementById('successMsg');
  const submitBtn = document.getElementById('submitBtn');
  
  errorMsg.style.display = 'none';
  successMsg.style.display = 'none';
  
  if (!username) {
    errorMsg.textContent = '用户名不能为空';
    errorMsg.style.display = 'block';
    return;
  }
  
  if (password.length < 6) {
    errorMsg.textContent = '密码长度至少6位';
    errorMsg.style.display = 'block';
    return;
  }
  
  if (password !== password2) {
    errorMsg.textContent = '两次密码输入不一致';
    errorMsg.style.display = 'block';
    return;
  }
  
  submitBtn.disabled = true;
  submitBtn.textContent = '创建中...';
  
  try {
    const res = await fetch('/api/auth/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    
    if (data.code === 200) {
      successMsg.textContent = '✅ 初始化成功！正在跳转...';
      successMsg.style.display = 'block';
      setTimeout(() => {
        window.location.href = '/#/admin/login';
      }, 1500);
    } else {
      errorMsg.textContent = data.message || '初始化失败';
      errorMsg.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = '创建管理员账户';
    }
  } catch (err) {
    errorMsg.textContent = '网络错误：' + err.message;
    errorMsg.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = '创建管理员账户';
  }
});
</script>
</body>
</html>`;
}


// ── 管理路由聚合 ─────────────────────────────────────────────────────────────

const adminApp = new Hono<{ Bindings: Env }>();
adminApp.route("/storage", storageRoutes);
adminApp.route("/user", userRoutes);
adminApp.route("/driver", driverRoutes);
adminApp.route("/setting", settingRoutes);

// ── 主 App ───────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>();

// 1. CORS 中间件（全局）
app.use("*", corsMiddleware);

// 2. 检查是否需要初始化（首次设置管理员密码）
app.use("*", async (c, next) => {
  // 跳过初始化接口本身
  if (c.req.path === "/api/auth/init") {
    return next();
  }
  
  try {
    const users = await getUsers(c.env.DB);
    if (users.length === 0) {
      // 如果是 API 请求，返回需要初始化的提示
      if (c.req.path.startsWith("/api/")) {
        return c.json({ code: 503, message: "需要初始化：请访问首页设置管理员密码", data: null }, 503);
      }
      // 如果是页面请求，返回初始化页面
      return c.html(getInitHTML());
    }
  } catch (e) {
    console.error("[cf-drive] Init check error:", (e as Error).message);
  }
  
  await next();
});

// 3. GET /ping 健康检查
app.get("/ping", (c) => c.text("pong"));

// 4. /api/auth/* 认证路由
app.route("/api/auth", authRoutes);

// 4.5. POST /api/auth/init 初始化管理员（仅在无用户时可用）
app.post("/api/auth/init", async (c) => {
  try {
    const users = await getUsers(c.env.DB);
    if (users.length > 0) {
      return c.json({ code: 400, message: "系统已初始化", data: null }, 400);
    }

    const { username, password } = await c.req.json();
    
    if (!username || !password) {
      return c.json({ code: 400, message: "用户名和密码不能为空", data: null }, 400);
    }

    if (password.length < 6) {
      return c.json({ code: 400, message: "密码长度至少6位", data: null }, 400);
    }

    const salt = generateSalt();
    const password_hash = await hashPassword(password, salt);
    await createUser(c.env.DB, {
      username,
      password_hash,
      salt,
      role: "admin",
      disabled: 0,
    });

    console.log(`[cf-drive] Admin initialized: ${username}`);
    return c.json({ code: 200, message: "初始化成功", data: null });
  } catch (e) {
    console.error("[cf-drive] Init error:", (e as Error).message);
    return c.json({ code: 500, message: "初始化失败", data: null }, 500);
  }
});

// 5. /api/fs/* → guest_access 检查 + 可选认证 + fsRoutes
app.use("/api/fs/*", optionalAuthMiddleware);
app.use("/api/fs/*", async (c, next) => {
  const user = c.get("user" as never);
  if (!user) {
    try {
      const setting = await getSetting(c.env.DB, "guest_access");
      if (setting && setting.value === "false") {
        return c.json({ code: 401, message: "authentication required", data: null }, 401);
      }
    } catch {
      // 读取设置失败时允许访问（降级）
    }
  }
  await next();
});
app.route("/api/fs", fsRoutes);

// 6. /d/* → guest_access 检查 + 可选认证 + downloadRoutes
app.use("/d/*", optionalAuthMiddleware);
app.use("/d/*", async (c, next) => {
  const user = c.get("user" as never);
  if (!user) {
    try {
      const setting = await getSetting(c.env.DB, "guest_access");
      if (setting && setting.value === "false") {
        return c.json({ code: 401, message: "authentication required", data: null }, 401);
      }
    } catch {
      // 读取设置失败时允许访问（降级）
    }
  }
  await next();
});
app.route("/d", downloadRoutes);

// 7. /api/admin/* → authMiddleware + adminRoleMiddleware + adminRoutes
app.use("/api/admin/*", authMiddleware);
app.use("/api/admin/*", adminRoleMiddleware);
app.route("/api/admin", adminApp);

// 8. 全局错误处理器
app.onError((err, c) => {
  console.error("[Worker Error]", err.stack ?? err.message);
  return c.json({ code: 500, message: "internal server error", data: null }, 500);
});

// 9. SPA fallback：所有未匹配路由返回前端 HTML
app.notFound((c) => {
  return c.html(FRONTEND_HTML);
});

export default app;
