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

// 2. Worker 初始化中间件（首次请求时检查并创建默认 admin）
let initialized = false;
app.use("*", async (c, next) => {
  if (!initialized) {
    initialized = true;
    try {
      const users = await getUsers(c.env.DB);
      if (users.length === 0) {
        const password = generatePassword(16);
        const salt = generateSalt();
        const password_hash = await hashPassword(password, salt);
        await createUser(c.env.DB, {
          username: "admin",
          password_hash,
          salt,
          role: "admin",
          disabled: 0,
        });
        console.log(`[cf-drive] Default admin created. Initial password: ${password}`);
      }
    } catch (e) {
      console.error("[cf-drive] Init error:", (e as Error).message);
    }
  }
  await next();
});

// 3. GET /ping 健康检查
app.get("/ping", (c) => c.text("pong"));

// 4. /api/auth/* 认证路由
app.route("/api/auth", authRoutes);

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
