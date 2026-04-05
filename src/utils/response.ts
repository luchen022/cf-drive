// 统一响应格式工具
import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";

export function ok<T>(c: Context, data: T, message = "success"): Response {
  return c.json({ code: 200, message, data });
}

export function err(c: Context, code: number, message: string): Response {
  return c.json({ code, message, data: null }, code as StatusCode);
}
