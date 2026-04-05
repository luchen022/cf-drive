// 路径工具函数
import type { MountRecord } from "../db/schema";

/**
 * 验证 mount_path 格式：必须以 / 开头，不得包含连续 //，不得为空
 */
export function validateMountPath(path: string): boolean {
  if (!path || path.length === 0) return false;
  if (!path.startsWith("/")) return false;
  if (path.includes("//")) return false;
  return true;
}

/**
 * 最长前缀匹配：从 mounts 数组中找到 mount_path 最长且是 requestPath 前缀的挂载
 * requestPath 必须等于 mount_path 或以 mount_path + "/" 开头
 */
export function findMount(mounts: MountRecord[], requestPath: string): MountRecord | null {
  const sorted = [...mounts].sort((a, b) => b.mount_path.length - a.mount_path.length);
  return (
    sorted.find(
      (m) => requestPath === m.mount_path || requestPath.startsWith(m.mount_path + "/")
    ) ?? null
  );
}

/**
 * 提取相对于挂载点的子路径
 */
export function getRelativePath(mountPath: string, requestPath: string): string {
  return requestPath.slice(mountPath.length) || "/";
}

/**
 * 规范化路径（去除末尾斜杠，确保以 / 开头）
 */
export function normalizePath(path: string): string {
  let p = path.startsWith("/") ? path : "/" + path;
  if (p.length > 1 && p.endsWith("/")) {
    p = p.slice(0, -1);
  }
  return p;
}
