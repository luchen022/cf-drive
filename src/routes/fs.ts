// /api/fs/* 文件系统 API

import { Hono } from "hono";
import type { Env, Obj } from "../types";
import { getMounts } from "../db/queries";
import { findMount, getRelativePath, normalizePath } from "../utils/path";
import { KVCacheManager } from "../cache/kv";
import { getDriver } from "../drivers/registry";
import { ok, err } from "../utils/response";

export const fsRoutes = new Hono<{ Bindings: Env }>();

// GET /list?path=xxx&refresh=1
fsRoutes.get("/list", async (c) => {
  const rawPath = c.req.query("path") ?? "/";
  const requestPath = normalizePath(rawPath);
  const refresh = c.req.query("refresh") === "1"; // 是否强制刷新缓存

  const mounts = await getMounts(c.env.DB);
  
  // 特殊处理：根路径显示所有挂载点列表
  if (requestPath === "/") {
    const mountList: Obj[] = mounts
      .filter(m => !m.disabled)
      .map(m => ({
        id: m.mount_path,
        name: m.mount_path.substring(1) || "root", // 去掉开头的 /
        size: 0,
        modified: m.updated_at || m.created_at,
        isDir: true,
      }));
    return ok(c, { content: mountList, total: mountList.length });
  }
  
  const mount = findMount(mounts, requestPath);
  if (!mount) {
    return err(c, 404, "path not found");
  }

  if (mount.disabled) {
    return err(c, 404, "storage is disabled");
  }

  const cache = new KVCacheManager(c.env.KVdrive);
  
  // 如果 refresh=1，跳过缓存读取
  const cached = refresh ? null : await cache.getList(mount.id, requestPath);
  if (cached) {
    return ok(c, { content: cached, total: cached.length });
  }

  const DriverCtor = getDriver(mount.driver);
  if (!DriverCtor) {
    return err(c, 500, `driver "${mount.driver}" not found`);
  }

  const driver = new DriverCtor();
  const addition = JSON.parse(mount.addition) as Record<string, unknown>;
  await driver.init(addition, c.env, mount.id);

  const relativePath = getRelativePath(mount.mount_path, requestPath);
  const dirName = relativePath === "/" ? "/" : relativePath.split("/").pop() ?? "/";
  const dirObj: Obj = {
    id: relativePath, // 使用相对路径而不是完整路径
    name: dirName,
    size: 0,
    modified: "",
    isDir: true,
  };

  const items = await driver.list(dirObj, c.env);

  // 将驱动返回的目录项的相对路径 id 转换为完整路径
  // 文件项的 id 保持不变（可能是特殊标识符，用于 link 方法）
  const itemsWithFullPath = items.map((item: Obj) => {
    if (item.isDir && item.id.startsWith('/') && !item.id.startsWith(mount.mount_path)) {
      // 目录：将相对路径转换为完整路径
      return {
        ...item,
        id: `${mount.mount_path}${item.id}`
      };
    }
    // 文件或已经是完整路径：保持不变
    return item;
  });

  await cache.setList(mount.id, requestPath, itemsWithFullPath, mount.cache_expiration);

  return ok(c, { content: itemsWithFullPath, total: itemsWithFullPath.length });
});

// GET /get?path=xxx：返回指定路径的文件/目录信息
fsRoutes.get("/get", async (c) => {
  const rawPath = c.req.query("path") ?? "/";
  const requestPath = normalizePath(rawPath);

  const mounts = await getMounts(c.env.DB);
  const mount = findMount(mounts, requestPath);
  if (!mount) {
    return err(c, 404, "path not found");
  }

  if (mount.disabled) {
    return err(c, 404, "storage is disabled");
  }

  // 根路径直接返回目录 Obj
  if (requestPath === mount.mount_path) {
    const name = mount.mount_path.split("/").pop() || "/";
    const obj: Obj = {
      id: requestPath,
      name,
      size: 0,
      modified: "",
      isDir: true,
    };
    return ok(c, obj);
  }

  // 从父目录列表中查找目标
  const parentPath = normalizePath(requestPath.substring(0, requestPath.lastIndexOf("/"))) || "/";
  const cache = new KVCacheManager(c.env.KVdrive);
  let items: Obj[] | null = await cache.getList(mount.id, parentPath);

  if (!items) {
    const DriverCtor = getDriver(mount.driver);
    if (!DriverCtor) {
      return err(c, 500, `driver "${mount.driver}" not found`);
    }
    const driver = new DriverCtor();
    const addition = JSON.parse(mount.addition) as Record<string, unknown>;
    await driver.init(addition, c.env, mount.id);

    const relativePath = getRelativePath(mount.mount_path, parentPath);
    const dirName = relativePath === "/" ? "/" : relativePath.split("/").pop() ?? "/";
    const dirObj: Obj = {
      id: relativePath, // 使用相对路径
      name: dirName,
      size: 0,
      modified: "",
      isDir: true,
    };
    const rawItems = await driver.list(dirObj, c.env);
    
    // 将驱动返回的目录项的相对路径 id 转换为完整路径
    items = rawItems.map((item: Obj) => {
      if (item.isDir && item.id.startsWith('/') && !item.id.startsWith(mount.mount_path)) {
        return {
          ...item,
          id: `${mount.mount_path}${item.id}`
        };
      }
      return item;
    });
    
    await cache.setList(mount.id, parentPath, items as Obj[], mount.cache_expiration);
  }

  const targetName = requestPath.split("/").pop() ?? "";
  const found = items?.find((item) => item.name === targetName);
  if (!found) {
    return err(c, 404, "file not found");
  }

  return ok(c, found);
});
