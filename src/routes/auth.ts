// /api/auth/* 认证 API

import { Hono } from "hono";
import type { Env } from "../types";
import { getUserByUsername } from "../db/queries";
import { hashPassword } from "../auth/password";
import { signJWT } from "../auth/jwt";
import { ok, err } from "../utils/response";

export const authRoutes = new Hono<{ Bindings: Env }>();

// POST /login：验证用户名密码，返回 JWT
authRoutes.post("/login", async (c) => {
  const body = await c.req.json<{ username: string; password: string }>();
  const { username, password } = body;

  if (!username || !password) {
    return err(c, 400, "username and password are required");
  }

  const user = await getUserByUsername(c.env.DB, username);
  if (!user) {
    return err(c, 401, "invalid username or password");
  }

  if (user.disabled) {
    return err(c, 401, "account is disabled");
  }

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.password_hash) {
    return err(c, 401, "invalid username or password");
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await signJWT(
    {
      sub: user.id.toString(),
      username: user.username,
      role: user.role,
      iat: now,
      exp: now + 48 * 3600,
    },
    c.env.JWT_SECRET
  );

  return ok(c, { token });
});
