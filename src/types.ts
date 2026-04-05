// 全局类型定义

export interface Obj {
  id: string;
  name: string;
  size: number;
  modified: string;
  isDir: boolean;
}

export interface Link {
  url: string;
  headers?: Record<string, string>;
}

export interface SchemaField {
  type: "string" | "number" | "boolean";
  required: boolean;
  default?: unknown;
  description: string;
  enum?: string[];
}

export interface DriverConfig {
  name: string;
  displayName: string;
  schema: Record<string, SchemaField>;
}

export interface Driver {
  init(addition: Record<string, unknown>, env: Env, mountId: number): Promise<void>;
  list(dir: Obj, env: Env): Promise<Obj[]>;
  link(file: Obj, env: Env): Promise<Link>;
  getConfig(): DriverConfig;
}

export interface Env {
  DB: D1Database;
  KVdrive: KVNamespace;
  JWT_SECRET: string;
}

export interface JWTPayload {
  sub: string;
  username: string;
  role: "admin" | "guest";
  iat: number;
  exp: number;
}
