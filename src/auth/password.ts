// 密码哈希工具（Web Crypto API）

export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  // 第一次 SHA-256
  const first = await crypto.subtle.digest("SHA-256", encoder.encode(password + salt));
  // 第二次 SHA-256
  const second = await crypto.subtle.digest("SHA-256", first);
  return Array.from(new Uint8Array(second))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generatePassword(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}
