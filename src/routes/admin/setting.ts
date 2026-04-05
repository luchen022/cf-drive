// /api/admin/setting/* 系统设置

import { Hono } from "hono";
import type { Env } from "../../types";
import { getSettings, upsertSetting } from "../../db/queries";
import { ok, err } from "../../utils/response";

export const settingRoutes = new Hono<{ Bindings: Env }>();

// GET /list：返回所有设置
settingRoutes.get("/list", async (c) => {
  const settings = await getSettings(c.env.DB);
  return ok(c, { content: settings, total: settings.length });
});

// POST /save：批量更新设置
settingRoutes.post("/save", async (c) => {
  const body = await c.req.json<{ settings: Array<{ key: string; value: string }> }>();

  if (!body.settings || !Array.isArray(body.settings)) {
    return err(c, 400, "settings array is required");
  }

  await Promise.all(body.settings.map(({ key, value }) => upsertSetting(c.env.DB, key, value)));

  return ok(c, null);
});
