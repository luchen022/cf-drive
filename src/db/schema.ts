// D1 表结构类型定义

export interface MountRecord {
  id: number;
  mount_path: string;
  driver: string;
  addition: string;
  cache_expiration: number;
  order_num: number;
  disabled: number;
  remark: string;
  status: "work" | "error" | "disabled";
  created_at: string;
  updated_at: string;
}

export interface UserRecord {
  id: number;
  username: string;
  password_hash: string;
  salt: string;
  role: "admin" | "guest";
  disabled: number;
  created_at: string;
}

export interface SettingRecord {
  key: string;
  value: string;
  type: "string" | "bool" | "number";
  group_name: string;
  description: string;
}
