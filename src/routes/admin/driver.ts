// /api/admin/driver/* 驱动信息

import { Hono } from "hono";
import type { Env } from "../../types";
import { listDrivers } from "../../drivers/registry";
import { ok } from "../../utils/response";

export const driverRoutes = new Hono<{ Bindings: Env }>();

// GET /list：返回所有已注册驱动的名称和 Addition JSON Schema
driverRoutes.get("/list", (c) => {
  const drivers = listDrivers();
  return ok(c, { content: drivers, total: drivers.length });
});
