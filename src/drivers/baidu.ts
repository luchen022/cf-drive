// 百度网盘驱动
import type { Driver, DriverConfig, Env, Link, Obj } from "../types";
import { KVCacheManager } from "../cache/kv";

interface BaiduAddition {
  app_key: string;
  secret_key: string;
  refresh_token: string;
  root_folder_path?: string;
}

export class BaiduDriver implements Driver {
  private addition!: BaiduAddition;
  private accessToken!: string;
  private mountId!: number;
  private cache!: KVCacheManager;

  async init(addition: Record<string, unknown>, env: Env, mountId: number): Promise<void> {
    this.addition = addition as unknown as BaiduAddition;
    this.mountId = mountId;
    this.cache = new KVCacheManager(env.KVdrive);

    const kvKey = `token:baidu:${mountId}`;
    const cached = await this.cache.getToken(kvKey);
    if (cached) {
      this.accessToken = cached;
      return;
    }

    await this.refreshToken();
  }

  private async refreshToken(): Promise<void> {
    const { app_key, secret_key, refresh_token } = this.addition;

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
      client_id: app_key,
      client_secret: secret_key,
    });

    const resp = await fetch(
      `https://openapi.baidu.com/oauth/2.0/token?${params.toString()}`,
      { method: "GET" }
    );

    const data = await resp.json() as { access_token?: string; error?: string; error_description?: string };
    if (!data.access_token) {
      throw new Error(`Baidu token refresh failed: ${data.error} - ${data.error_description}`);
    }

    this.accessToken = data.access_token;
    const kvKey = `token:baidu:${this.mountId}`;
    await this.cache.setToken(kvKey, this.accessToken, 2592000);
  }

  async list(dir: Obj, env: Env): Promise<Obj[]> {
    const rootPath = this.addition.root_folder_path ?? "/";
    const dirPath = dir.id === "root" ? rootPath : dir.id;

    const params = new URLSearchParams({
      method: "list",
      dir: dirPath,
      access_token: this.accessToken,
      limit: "200",
    });

    const resp = await fetch(
      `https://pan.baidu.com/rest/2.0/xpan/file?${params.toString()}`
    );

    const data = await resp.json() as {
      errno: number;
      errmsg?: string;
      list?: Array<{
        fs_id: number;
        server_filename: string;
        size: number;
        server_mtime: number;
        isdir: number;
        path: string;
      }>;
    };

    if (data.errno !== 0) {
      throw new Error(`Baidu error ${data.errno}: ${data.errmsg}`);
    }

    return (data.list ?? []).map((item) => ({
      id: item.path,
      name: item.server_filename,
      size: item.size,
      modified: new Date(item.server_mtime * 1000).toISOString(),
      isDir: item.isdir === 1,
    }));
  }

  async link(file: Obj, env: Env): Promise<Link> {
    const params = new URLSearchParams({
      method: "filemetas",
      access_token: this.accessToken,
    });

    const body = new URLSearchParams({
      fsids: `[${file.id}]`,
      dlink: "1",
    });

    const resp = await fetch(
      `https://pan.baidu.com/rest/2.0/xpan/file?${params.toString()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }
    );

    const data = await resp.json() as {
      errno: number;
      errmsg?: string;
      list?: Array<{ dlink?: string }>;
    };

    if (data.errno !== 0) {
      throw new Error(`Baidu error ${data.errno}: ${data.errmsg}`);
    }

    const dlink = data.list?.[0]?.dlink;
    if (!dlink) {
      throw new Error("Baidu: no dlink in response");
    }

    return { url: `${dlink}&access_token=${this.accessToken}` };
  }

  getConfig(): DriverConfig {
    return {
      name: "baidu",
      displayName: "百度网盘",
      schema: {
        app_key: { type: "string", required: true, description: "百度应用 App Key" },
        secret_key: { type: "string", required: true, description: "百度应用 Secret Key" },
        refresh_token: { type: "string", required: true, description: "OAuth2 刷新令牌" },
        root_folder_path: { type: "string", required: false, default: "/", description: "根目录路径" },
      },
    };
  }
}
