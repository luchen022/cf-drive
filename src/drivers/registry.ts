// Driver 注册表

import type { DriverConstructor, DriverConfig } from "./base";
import { OneDriveDriver } from "./onedrive";
import { BaiduDriver } from "./baidu";
import { Open115Driver } from "./open115";
import { S3Driver } from "./s3";
import { GitHubDriver } from "./github";

const registry: Map<string, DriverConstructor> = new Map();

export function registerDriver(name: string, ctor: DriverConstructor): void {
  registry.set(name, ctor);
}

export function getDriver(name: string): DriverConstructor | undefined {
  return registry.get(name);
}

export function listDrivers(): Array<{ name: string; config: DriverConfig }> {
  const result: Array<{ name: string; config: DriverConfig }> = [];
  for (const [name, Ctor] of registry) {
    const instance = new Ctor();
    result.push({ name, config: instance.getConfig() });
  }
  return result;
}

// 注册所有内置驱动
registerDriver("onedrive", OneDriveDriver);
registerDriver("baidu", BaiduDriver);
registerDriver("open115", Open115Driver);
registerDriver("s3", S3Driver);
registerDriver("github", GitHubDriver);
