// OneDrive 驱动
import type { Driver, DriverConfig, Env, Link, Obj } from "../types";
import { KVCacheManager } from "../cache/kv";

interface OneDriveAddition {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  region: "global" | "cn";
  root_folder_path?: string;
  custom_host?: string;
}

const ENDPOINTS = {
  global: {
    auth: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    graph: "https://graph.microsoft.com/v1.0",
  },
  cn: {
    auth: "https://login.chinacloudapi.cn/common/oauth2/v2.0/token",
    graph: "https://microsoftgraph.chinacloudapi.cn/v1.0",
  },
};

function applyCustomHost(url: string, customHost?: string): string {
  if (!customHost) return url;
  const parsed = new URL(url);
  parsed.host = customHost;
  return parsed.toString();
}

export class OneDriveDriver implements Driver {
  private addition!: OneDriveAddition;
  private accessToken!: string;
  private mountId!: number;
  private cache!: KVCacheManager;

  async init(addition: Record<string, unknown>, env: Env, mountId: number): Promise<void> {
    this.addition = addition as unknown as OneDriveAddition;
    this.mountId = mountId;
    this.cache = new KVCacheManager(env.KVdrive);

    const kvKey = `token:onedrive:${mountId}`;
    const cached = await this.cache.getToken(kvKey);
    if (cached) {
      this.accessToken = cached;
      return;
    }

    await this.refreshToken();
  }

  private async refreshToken(): Promise<void> {
    const { client_id, client_secret, refresh_token, region } = this.addition;
    const endpoint = ENDPOINTS[region ?? "global"];

    const body = new URLSearchParams({
      client_id,
      client_secret,
      refresh_token,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/.default offline_access",
    });

    const resp = await fetch(endpoint.auth, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await resp.json() as { access_token?: string; error?: string };
    if (!data.access_token) {
      throw new Error(`OneDrive token refresh failed: ${data.error}`);
    }

    this.accessToken = data.access_token;
    const kvKey = `token:onedrive:${this.mountId}`;
    await this.cache.setToken(kvKey, this.accessToken, 3500);
  }

  async list(dir: Obj, env: Env): Promise<Obj[]> {
    const region = this.addition.region ?? "global";
    const graph = ENDPOINTS[region].graph;
    const rootPath = this.addition.root_folder_path ?? "/";

    // 构建完整路径
    const fullPath = dir.id === "root"
      ? rootPath
      : (rootPath === "/" ? dir.id : `${rootPath}/${dir.id}`);

    // 根目录特殊处理
    const isRoot = fullPath === "/" || fullPath === "";
    const url = isRoot
      ? `${graph}/me/drive/root/children?$select=id,name,size,lastModifiedDateTime,file,folder`
      : `${graph}/me/drive/root:${fullPath}:/children?$select=id,name,size,lastModifiedDateTime,file,folder`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    const data = await resp.json() as { value?: unknown[]; error?: { message: string } };
    if (!data.value) {
      throw new Error(`OneDrive list failed: ${data.error?.message}`);
    }

    return (data.value as Array<{
      id: string;
      name: string;
      size?: number;
      lastModifiedDateTime: string;
      file?: unknown;
      folder?: unknown;
    }>).map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size ?? 0,
      modified: item.lastModifiedDateTime,
      isDir: !!item.folder,
    }));
  }

  async link(file: Obj, env: Env): Promise<Link> {
    return this.fetchLink(file, false);
  }

  private async fetchLink(file: Obj, isRetry: boolean): Promise<Link> {
    const region = this.addition.region ?? "global";
    const graph = ENDPOINTS[region].graph;
    const url = `${graph}/me/drive/items/${file.id}?$select=@microsoft.graph.downloadUrl`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (resp.status === 401 && !isRetry) {
      const kvKey = `token:onedrive:${this.mountId}`;
      await this.cache.deleteToken(kvKey);
      await this.refreshToken();
      return this.fetchLink(file, true);
    }

    const data = await resp.json() as { "@microsoft.graph.downloadUrl"?: string; error?: { message: string } };
    const downloadUrl = data["@microsoft.graph.downloadUrl"];
    if (!downloadUrl) {
      throw new Error(`OneDrive link failed: ${data.error?.message}`);
    }

    return { url: applyCustomHost(downloadUrl, this.addition.custom_host) };
  }

  getConfig(): DriverConfig {
    return {
      name: "onedrive",
      displayName: "OneDrive",
      schema: {
        client_id: { type: "string", required: true, description: "Azure 应用客户端 ID" },
        client_secret: { type: "string", required: true, description: "Azure 应用客户端密钥" },
        refresh_token: { type: "string", required: true, description: "OAuth2 刷新令牌" },
        region: { type: "string", required: true, description: "区域", enum: ["global", "cn"] },
        root_folder_path: { type: "string", required: false, default: "/", description: "根目录路径" },
        custom_host: { type: "string", required: false, description: "自定义下载域名（可选）" },
      },
    };
  }
}
