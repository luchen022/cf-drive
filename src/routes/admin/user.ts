// /api/admin/user/* 用户管理

import { Hono } from "hono";
import type { Env } from "../../types";
import { getUsers, getUserById, createUser, updateUser, deleteUser } from "../../db/queries";
import { hashPassword, generateSalt } from "../../auth/password";
import { ok, err } from "../../utils/response";

export const userRoutes = new Hono<{ Bindings: Env }>();

// GET /list：返回用户列表（不返回 password_hash 和 salt）
userRoutes.get("/list", async (c) => {
  const users = await getUsers(c.env.DB);
  const safeUsers = users.map(({ password_hash: _ph, salt: _s, ...rest }) => rest);
  return ok(c, { content: safeUsers, total: safeUsers.length });
});

// POST /create：创建用户
userRoutes.post("/create", async (c) => {
  const body = await c.req.json<{
    username: string;
    password: string;
    role?: "admin" | "guest";
    disabled?: number;
  }>();

  if (!body.username || !body.password) {
    return err(c, 400, "username and password are required");
  }

  const salt = generateSalt();
  const password_hash = await hashPassword(body.password, salt);

  const user = await createUser(c.env.DB, {
    username: body.username,
    password_hash,
    salt,
    role: body.role ?? "guest",
    disabled: body.disabled ?? 0,
  });

  const { password_hash: _ph, salt: _s, ...safeUser } = user;
  return ok(c, safeUser);
});

// POST /update：更新用户
userRoutes.post("/update", async (c) => {
  const body = await c.req.json<{
    id: number;
    username?: string;
    password?: string;
    role?: "admin" | "guest";
    disabled?: number;
  }>();

  if (!body.id) {
    return err(c, 400, "id is required");
  }

  const existing = await getUserById(c.env.DB, body.id);
  if (!existing) {
    return err(c, 404, "user not found");
  }

  const updateData: Record<string, unknown> = {};
  if (body.username !== undefined) updateData.username = body.username;
  if (body.role !== undefined) updateData.role = body.role;
  if (body.disabled !== undefined) updateData.disabled = body.disabled;

  if (body.password) {
    const salt = generateSalt();
    const password_hash = await hashPassword(body.password, salt);
    updateData.salt = salt;
    updateData.password_hash = password_hash;
  }

  await updateUser(c.env.DB, body.id, updateData as Parameters<typeof updateUser>[2]);

  return ok(c, null);
});

// POST /delete：删除用户
userRoutes.post("/delete", async (c) => {
  const body = await c.req.json<{ id: number }>();
  if (!body.id) {
    return err(c, 400, "id is required");
  }

  const existing = await getUserById(c.env.DB, body.id);
  if (!existing) {
    return err(c, 404, "user not found");
  }

  await deleteUser(c.env.DB, body.id);
  return ok(c, null);
});
