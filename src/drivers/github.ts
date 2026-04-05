// GitHub Releases 驱动
import type { Driver, DriverConfig, Env, Link, Obj } from "../types";

interface GitHubAddition {
  owner: string;
  repo: string;
  token?: string;
}

interface GitHubRelease {
  id: number;
  tag_name: string;
  published_at: string;
  assets: GitHubAsset[];
}

interface GitHubAsset {
  id: number;
  name: string;
  size: number;
  updated_at: string;
  browser_download_url: string;
}

export class GitHubDriver implements Driver {
  private addition!: GitHubAddition;

  async init(addition: Record<string, unknown>, env: Env, mountId: number): Promise<void> {
    this.addition = addition as unknown as GitHubAddition;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": "cf-drive/1.0",
      "Accept": "application/vnd.github+json",
    };
    if (this.addition.token) {
      headers["Authorization"] = `Bearer ${this.addition.token}`;
    }
    return headers;
  }

  private async fetchReleases(): Promise<GitHubRelease[]> {
    const { owner, repo } = this.addition;
    const resp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases`,
      { headers: this.getHeaders() }
    );
    if (!resp.ok) {
      throw new Error(`GitHub API error: ${resp.status} ${resp.statusText}`);
    }
    return resp.json() as Promise<GitHubRelease[]>;
  }

  async list(dir: Obj, env: Env): Promise<Obj[]> {
    const releases = await this.fetchReleases();

    // 根目录：列出所有 Release（dir.id 为 "/" 或 dir.name 为 "/"）
    if (dir.id === "/" || dir.name === "/") {
      return releases.map((release) => ({
        id: `/${release.tag_name}`, // 使用相对路径作为 ID
        name: release.tag_name,
        size: 0,
        modified: release.published_at,
        isDir: true,
      }));
    }

    // Release 目录：列出该 Release 的 assets
    // dir.id 格式为 "/v3.40.0"，需要提取版本号
    const pathParts = dir.id.split("/").filter(p => p);
    const tagName = pathParts[pathParts.length - 1]; // 获取最后一部分作为版本号
    const release = releases.find((r) => r.tag_name === tagName);
    if (!release) {
      throw new Error(`GitHub: release ${tagName} not found`);
    }

    // 返回 assets，id 使用 asset.id（用于 link 方法）
    return release.assets.map((asset) => ({
      id: asset.id.toString(), // 使用 asset ID，link 方法需要
      name: asset.name,
      size: asset.size,
      modified: asset.updated_at,
      isDir: false,
    }));
  }

  async link(file: Obj, env: Env): Promise<Link> {
    const { owner, repo } = this.addition;

    // 先尝试从 releases 列表中找到对应 asset
    const releases = await this.fetchReleases();
    for (const release of releases) {
      const asset = release.assets.find((a) => a.id.toString() === file.id);
      if (asset) {
        return { url: asset.browser_download_url };
      }
    }

    // 回退：直接调用 asset API
    const resp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/assets/${file.id}`,
      { headers: this.getHeaders() }
    );
    if (!resp.ok) {
      throw new Error(`GitHub asset not found: ${file.id}`);
    }
    const asset = await resp.json() as GitHubAsset;
    return { url: asset.browser_download_url };
  }

  getConfig(): DriverConfig {
    return {
      name: "github",
      displayName: "GitHub Releases",
      schema: {
        owner: { type: "string", required: true, description: "仓库所有者（用户名或组织名）" },
        repo: { type: "string", required: true, description: "仓库名称" },
        token: { type: "string", required: false, description: "Personal Access Token（可选，提升 API 速率限制）" },
      },
    };
  }
}
