// JWT 认证中间件

import { createMiddleware } from "hono/factory";
import type { MiddlewareHandler } from "hono";
import { verifyJWT } from "../auth/jwt";
import type { Env, JWTPayload } from "../types";

type Variables = { user: JWTPayload };

export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> =
  createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ code: 401, message: "token invalid or expired", data: null }, 401);
    }
    const token = authHeader.slice(7);
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ code: 401, message: "token invalid or expired", data: null }, 401);
    }
    c.set("user", payload);
    await next();
  });

export const adminRoleMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> =
  createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const user = c.get("user");
    if (!user || user.role !== "admin") {
      return c.json({ code: 403, message: "forbidden", data: null }, 403);
    }
    await next();
  });

export const optionalAuthMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> =
  createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const payload = await verifyJWT(token, c.env.JWT_SECRET);
      if (payload) {
        c.set("user", payload);
      }
    }
    await next();
  });
