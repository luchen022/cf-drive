// 115 Open API 驱动
import type { Driver, DriverConfig, Env, Link, Obj } from "../types";
import { KVCacheManager } from "../cache/kv";

interface Open115Addition {
  access_token: string;
  refresh_token: string;
  root_folder_id?: string;
}

interface Open115File {
  fid: string;
  pid: string;
  n: string;       // name
  s: number;       // size
  te: number;      // modified time (unix)
  ico: string;
  pc?: string;     // pickcode (files only)
  fc?: string;     // file category
}

export class Open115Driver implements Driver {
  private addition!: Open115Addition;
  private accessToken!: string;
  private mountId!: number;
  private cache!: KVCacheManager;
  private env!: Env;

  async init(addition: Record<string, unknown>, env: Env, mountId: number): Promise<void> {
    this.addition = addition as unknown as Open115Addition;
    this.mountId = mountId;
    this.cache = new KVCacheManager(env.KVdrive);
    this.env = env;

    const kvKey = `token:115open:${mountId}`;
    const cached = await this.cache.getToken(kvKey);
    if (cached) {
      this.accessToken = cached;
      return;
    }

    // 验证当前 access_token 是否有效
    const valid = await this.validateToken(this.addition.access_token);
    if (valid) {
      this.accessToken = this.addition.access_token;
      await this.cache.setToken(kvKey, this.accessToken, 7200);
      return;
    }

    // 过期则刷新
    await this.refreshToken();
  }

  private async validateToken(token: string): Promise<boolean> {
    try {
      const resp = await fetch("https://proapi.115.com/open/ufile/files?cid=0&limit=1", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return resp.status === 200;
    } catch {
      return false;
    }
  }

  private async refreshToken(): Promise<void> {
    const resp = await fetch("https://proapi.115.com/open/passport/token/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: this.addition.refresh_token,
      }).toString(),
    });

    const data = await resp.json() as {
      state?: boolean;
      data?: { access_token: string; refresh_token: string; expires_in: number };
      message?: string;
    };

    if (!data.state || !data.data?.access_token) {
      throw new Error(`115 token refresh failed: ${data.message}`);
    }

    const { access_token, refresh_token, expires_in } = data.data;
    this.accessToken = access_token;

    // 写入 KV 缓存
    const kvKey = `token:115open:${this.mountId}`;
    await this.cache.setToken(kvKey, access_token, expires_in - 100);

    // 持久化到 D1 mounts.addition
    const newAddition: Open115Addition = {
      ...this.addition,
      access_token,
      refresh_token,
    };
    await this.env.DB.prepare(
      "UPDATE mounts SET addition = ? WHERE id = ?"
    )
      .bind(JSON.stringify(newAddition), this.mountId)
      .run()
      .catch(() => {});
  }

  async list(dir: Obj, env: Env): Promise<Obj[]> {
    const cid = dir.id === "root" ? (this.addition.root_folder_id ?? "0") : dir.id;
    return this.listAll(cid, false);
  }

  private async listAll(cid: string, isRetry: boolean): Promise<Obj[]> {
    const results: Open115File[] = [];
    let offset = 0;
    const limit = 100;
    let total = Infinity;

    while (results.length < total) {
      const url = `https://proapi.115.com/open/ufile/files?cid=${cid}&offset=${offset}&limit=${limit}`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (resp.status === 401 && !isRetry) {
        const kvKey = `token:115open:${this.mountId}`;
        await this.cache.deleteToken(kvKey);
        await this.refreshToken();
        return this.listAll(cid, true);
      }

      const data = await resp.json() as {
        state?: boolean;
        data?: { count: number; list: Open115File[] };
        message?: string;
      };

      if (!data.state || !data.data) {
        throw new Error(`115 list failed: ${data.message}`);
      }

      total = data.data.count;
      results.push(...data.data.list);

      if (results.length >= total) break;
      offset += limit;
    }

    return results.map((item) => ({
      id: item.pc ?? item.fid,
      name: item.n,
      size: item.s ?? 0,
      modified: new Date(item.te * 1000).toISOString(),
      isDir: !item.pc,
    }));
  }

  async link(file: Obj, env: Env): Promise<Link> {
    return this.fetchLink(file, false);
  }

  private async fetchLink(file: Obj, isRetry: boolean): Promise<Link> {
    const url = `https://proapi.115.com/open/ufile/downurl?pickcode=${file.id}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (resp.status === 401 && !isRetry) {
      const kvKey = `token:115open:${this.mountId}`;
      await this.cache.deleteToken(kvKey);
      await this.refreshToken();
      return this.fetchLink(file, true);
    }

    const data = await resp.json() as {
      state?: boolean;
      data?: { url?: { url: string } } | Record<string, { url: { url: string } }>;
      message?: string;
    };

    if (!data.state || !data.data) {
      throw new Error(`115 link failed: ${data.message}`);
    }

    // API 返回格式：{ data: { [pickcode]: { url: { url: string } } } }
    let downloadUrl: string | undefined;
    const d = data.data as Record<string, { url: { url: string } }>;
    const firstKey = Object.keys(d)[0];
    if (firstKey) {
      downloadUrl = d[firstKey]?.url?.url;
    }

    if (!downloadUrl) {
      throw new Error("115: no download url in response");
    }

    return {
      url: downloadUrl,
      headers: { "User-Agent": "Mozilla/5.0 115Browser/27.0.3.6" },
    };
  }

  getConfig(): DriverConfig {
    return {
      name: "open115",
      displayName: "115 Open API",
      schema: {
        access_token: { type: "string", required: true, description: "115 Open API Access Token" },
        refresh_token: { type: "string", required: true, description: "115 Open API Refresh Token" },
        root_folder_id: { type: "string", required: false, default: "0", description: "根目录 ID（默认 0）" },
      },
    };
  }
}
