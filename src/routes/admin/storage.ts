// /api/admin/storage/* 挂载管理

import { Hono } from "hono";
import type { Env } from "../../types";
import { getMounts, getMountById, createMount, updateMount, deleteMount } from "../../db/queries";
import { validateMountPath } from "../../utils/path";
import { KVCacheManager } from "../../cache/kv";
import { getDriver } from "../../drivers/registry";
import { ok, err } from "../../utils/response";

export const storageRoutes = new Hono<{ Bindings: Env }>();

// GET /list：返回所有挂载列表
storageRoutes.get("/list", async (c) => {
  const mounts = await getMounts(c.env.DB);
  return ok(c, { content: mounts, total: mounts.length });
});

// POST /create：创建挂载
storageRoutes.post("/create", async (c) => {
  const body = await c.req.json<{
    mount_path: string;
    driver: string;
    addition: Record<string, unknown>;
    cache_expiration?: number;
    order_num?: number;
    remark?: string;
  }>();

  if (!validateMountPath(body.mount_path)) {
    return err(c, 400, "invalid mount_path format");
  }

  const DriverCtor = getDriver(body.driver);
  if (!DriverCtor) {
    return err(c, 400, `driver "${body.driver}" not found`);
  }

  // 验证 Addition Schema
  const driver = new DriverCtor();
  const config = driver.getConfig();
  for (const [key, field] of Object.entries(config.schema)) {
    if (field.required && body.addition[key] === undefined) {
      return err(c, 400, `addition field "${key}" is required`);
    }
  }

  // 验证 Driver 可以初始化
  try {
    await driver.init(body.addition, c.env, 0);
  } catch (e) {
    return err(c, 400, `driver init failed: ${(e as Error).message}`);
  }

  const record = await createMount(c.env.DB, {
    mount_path: body.mount_path,
    driver: body.driver,
    addition: JSON.stringify(body.addition),
    cache_expiration: body.cache_expiration ?? 300,
    order_num: body.order_num ?? 0,
    disabled: 0,
    remark: body.remark ?? "",
    status: "work",
  });

  return ok(c, record);
});

// POST /update：更新挂载
storageRoutes.post("/update", async (c) => {
  const body = await c.req.json<{
    id: number;
    mount_path?: string;
    driver?: string;
    addition?: Record<string, unknown>;
    cache_expiration?: number;
    order_num?: number;
    remark?: string;
  }>();

  if (!body.id) {
    return err(c, 400, "id is required");
  }

  const existing = await getMountById(c.env.DB, body.id);
  if (!existing) {
    return err(c, 404, "mount not found");
  }

  if (body.mount_path !== undefined && !validateMountPath(body.mount_path)) {
    return err(c, 400, "invalid mount_path format");
  }

  const updateData: Record<string, unknown> = {};
  if (body.mount_path !== undefined) updateData.mount_path = body.mount_path;
  if (body.driver !== undefined) updateData.driver = body.driver;
  if (body.addition !== undefined) updateData.addition = JSON.stringify(body.addition);
  if (body.cache_expiration !== undefined) updateData.cache_expiration = body.cache_expiration;
  if (body.order_num !== undefined) updateData.order_num = body.order_num;
  if (body.remark !== undefined) updateData.remark = body.remark;

  // 重新初始化 Driver
  const driverName = body.driver ?? existing.driver;
  const additionObj = body.addition ?? JSON.parse(existing.addition);
  const DriverCtor = getDriver(driverName);
  if (DriverCtor) {
    try {
      const driver = new DriverCtor();
      await driver.init(additionObj, c.env, body.id);
      updateData.status = "work";
    } catch {
      updateData.status = "error";
    }
  }

  await updateMount(c.env.DB, body.id, updateData as Parameters<typeof updateMount>[2]);

  // 清除 KV 缓存
  const cache = new KVCacheManager(c.env.KVdrive);
  await cache.deleteByMount(body.id);

  return ok(c, null);
});

// POST /delete：删除挂载
storageRoutes.post("/delete", async (c) => {
  const body = await c.req.json<{ id: number }>();
  if (!body.id) {
    return err(c, 400, "id is required");
  }

  const existing = await getMountById(c.env.DB, body.id);
  if (!existing) {
    return err(c, 404, "mount not found");
  }

  await deleteMount(c.env.DB, body.id);

  // 清除 KV 缓存
  const cache = new KVCacheManager(c.env.KVdrive);
  await cache.deleteByMount(body.id);

  return ok(c, null);
});

// POST /enable：启用挂载
storageRoutes.post("/enable", async (c) => {
  const body = await c.req.json<{ id: number }>();
  if (!body.id) {
    return err(c, 400, "id is required");
  }

  const existing = await getMountById(c.env.DB, body.id);
  if (!existing) {
    return err(c, 404, "mount not found");
  }

  // 重新初始化 Driver
  const DriverCtor = getDriver(existing.driver);
  let status: "work" | "error" = "work";
  if (DriverCtor) {
    try {
      const driver = new DriverCtor();
      const addition = JSON.parse(existing.addition) as Record<string, unknown>;
      await driver.init(addition, c.env, body.id);
    } catch {
      status = "error";
    }
  }

  await updateMount(c.env.DB, body.id, { disabled: 0, status });

  return ok(c, null);
});

// POST /disable：禁用挂载
storageRoutes.post("/disable", async (c) => {
  const body = await c.req.json<{ id: number }>();
  if (!body.id) {
    return err(c, 400, "id is required");
  }

  const existing = await getMountById(c.env.DB, body.id);
  if (!existing) {
    return err(c, 404, "mount not found");
  }

  await updateMount(c.env.DB, body.id, { disabled: 1, status: "disabled" });

  // 清除 KV 缓存
  const cache = new KVCacheManager(c.env.KVdrive);
  await cache.deleteByMount(body.id);

  return ok(c, null);
});
