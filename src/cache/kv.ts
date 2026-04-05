// KV 缓存管理
import type { Obj } from "../types";

export class KVCacheManager {
  constructor(private kv: KVNamespace) {}

  /** 读取文件列表缓存，失败时返回 null（静默降级） */
  async getList(mountId: number, path: string): Promise<Obj[] | null> {
    const key = `list:${mountId}:${encodeURIComponent(path)}`;
    const cached = await this.kv.get(key, "json").catch(() => null);
    return cached as Obj[] | null;
  }

  /** 写入文件列表缓存，ttl=0 时跳过，失败时静默忽略 */
  async setList(mountId: number, path: string, data: Obj[], ttl: number): Promise<void> {
    if (ttl === 0) return;
    const key = `list:${mountId}:${encodeURIComponent(path)}`;
    await this.kv.put(key, JSON.stringify(data), { expirationTtl: ttl }).catch(() => {
      // KV 写入失败时静默降级，不影响响应
    });
  }

  /** 删除某挂载下的所有缓存 */
  async deleteByMount(mountId: number): Promise<void> {
    const list = await this.kv.list({ prefix: `list:${mountId}:` }).catch(() => null);
    if (!list) return;
    await Promise.all(list.keys.map((k) => this.kv.delete(k.name).catch(() => {})));
  }

  /** 读取 token 缓存 */
  async getToken(key: string): Promise<string | null> {
    return this.kv.get(key).catch(() => null);
  }

  /** 写入 token 缓存 */
  async setToken(key: string, value: string, ttl: number): Promise<void> {
    await this.kv.put(key, value, { expirationTtl: ttl }).catch(() => {});
  }

  /** 删除 token 缓存 */
  async deleteToken(key: string): Promise<void> {
    await this.kv.delete(key).catch(() => {});
  }
}
