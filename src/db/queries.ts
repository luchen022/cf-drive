// D1 查询封装

import type { MountRecord, UserRecord, SettingRecord } from "./schema";

// ── Mounts ──────────────────────────────────────────────────────────────────

export async function getMounts(db: D1Database): Promise<MountRecord[]> {
  const result = await db.prepare("SELECT * FROM mounts ORDER BY order_num ASC").all<MountRecord>();
  return result.results;
}

export async function getMountById(db: D1Database, id: number): Promise<MountRecord | null> {
  return db.prepare("SELECT * FROM mounts WHERE id = ?").bind(id).first<MountRecord>();
}

export async function getMountByPath(db: D1Database, path: string): Promise<MountRecord | null> {
  return db.prepare("SELECT * FROM mounts WHERE mount_path = ?").bind(path).first<MountRecord>();
}

export async function createMount(
  db: D1Database,
  data: Omit<MountRecord, "id" | "created_at" | "updated_at">
): Promise<MountRecord> {
  const result = await db
    .prepare(
      `INSERT INTO mounts (mount_path, driver, addition, cache_expiration, order_num, disabled, remark, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .bind(
      data.mount_path,
      data.driver,
      data.addition,
      data.cache_expiration,
      data.order_num,
      data.disabled,
      data.remark,
      data.status
    )
    .first<MountRecord>();
  if (!result) throw new Error("Failed to create mount");
  return result;
}

export async function updateMount(
  db: D1Database,
  id: number,
  data: Partial<Omit<MountRecord, "id" | "created_at">>
): Promise<void> {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (fields.length === 0) return;
  const setClauses = [...fields.map((f) => `${f} = ?`), "updated_at = datetime('now')"].join(", ");
  const values = fields.map((f) => data[f]);
  await db
    .prepare(`UPDATE mounts SET ${setClauses} WHERE id = ?`)
    .bind(...values, id)
    .run();
}

export async function deleteMount(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM mounts WHERE id = ?").bind(id).run();
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function getUserByUsername(db: D1Database, username: string): Promise<UserRecord | null> {
  return db.prepare("SELECT * FROM users WHERE username = ?").bind(username).first<UserRecord>();
}

export async function getUserById(db: D1Database, id: number): Promise<UserRecord | null> {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRecord>();
}

export async function getUsers(db: D1Database): Promise<UserRecord[]> {
  const result = await db.prepare("SELECT * FROM users ORDER BY id ASC").all<UserRecord>();
  return result.results;
}

export async function createUser(
  db: D1Database,
  data: Omit<UserRecord, "id" | "created_at">
): Promise<UserRecord> {
  const result = await db
    .prepare(
      `INSERT INTO users (username, password_hash, salt, role, disabled)
       VALUES (?, ?, ?, ?, ?)
       RETURNING *`
    )
    .bind(data.username, data.password_hash, data.salt, data.role, data.disabled)
    .first<UserRecord>();
  if (!result) throw new Error("Failed to create user");
  return result;
}

export async function updateUser(
  db: D1Database,
  id: number,
  data: Partial<Omit<UserRecord, "id" | "created_at">>
): Promise<void> {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (fields.length === 0) return;
  const setClauses = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => data[f]);
  await db
    .prepare(`UPDATE users SET ${setClauses} WHERE id = ?`)
    .bind(...values, id)
    .run();
}

export async function deleteUser(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(db: D1Database): Promise<SettingRecord[]> {
  const result = await db.prepare("SELECT * FROM settings ORDER BY key ASC").all<SettingRecord>();
  return result.results;
}

export async function getSetting(db: D1Database, key: string): Promise<SettingRecord | null> {
  return db.prepare("SELECT * FROM settings WHERE key = ?").bind(key).first<SettingRecord>();
}

export async function upsertSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare("UPDATE settings SET value = ? WHERE key = ?")
    .bind(value, key)
    .run();
}
