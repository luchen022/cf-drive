// /d/* 下载重定向

import { Hono } from "hono";
import type { Env, Obj } from "../types";
import { getMounts } from "../db/queries";
import { findMount, getRelativePath, normalizePath } from "../utils/path";
import { KVCacheManager } from "../cache/kv";
import { getDriver } from "../drivers/registry";
import { err } from "../utils/response";

export const downloadRoutes = new Hono<{ Bindings: Env }>();

// GET /d/*：下载重定向
downloadRoutes.get("*", async (c) => {
  // 提取路径（去掉 /d 前缀）
  const fullPath = new URL(c.req.url).pathname;
  const rawPath = fullPath.replace(/^\/d/, '') || '/';
  const requestPath = normalizePath(rawPath);

  const mounts = await getMounts(c.env.DB);
  const mount = findMount(mounts, requestPath);
  if (!mount) {
    return err(c, 404, "path not found");
  }

  if (mount.disabled) {
    return err(c, 404, "storage is disabled");
  }

  const DriverCtor = getDriver(mount.driver);
  if (!DriverCtor) {
    return err(c, 500, `driver "${mount.driver}" not found`);
  }

  const driver = new DriverCtor();
  const addition = JSON.parse(mount.addition) as Record<string, unknown>;
  await driver.init(addition, c.env, mount.id);

  // 从父目录列表中找到目标文件
  const parentPath = normalizePath(requestPath.substring(0, requestPath.lastIndexOf("/"))) || "/";
  const cache = new KVCacheManager(c.env.KVdrive);
  let items: Obj[] | null = await cache.getList(mount.id, parentPath);

  if (!items) {
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
  const file = items?.find((item) => item.name === targetName);
  if (!file) {
    return err(c, 404, "file not found");
  }

  if (file.isDir) {
    return err(c, 400, "not a file");
  }

  const link = await driver.link(file, c.env);

  return new Response(null, {
    status: 302,
    headers: {
      Location: link.url,
      "Cache-Control": "max-age=0, no-cache, no-store, must-revalidate",
      "Referrer-Policy": "no-referrer",
    },
  });
});
