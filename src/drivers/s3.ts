// S3 兼容存储驱动
// 使用 Web Crypto API 实现 AWS Signature Version 4，不使用 Node.js crypto

import type { Driver, DriverConfig, Obj, Link, Env } from "../types";
import { getRelativePath } from "../utils/path";

// ─── Web Crypto 辅助函数 ────────────────────────────────────────────────────

/** ArrayBuffer 转 hex 字符串 */
function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** HMAC-SHA256，key 可以是 ArrayBuffer 或 string */
async function hmacSha256(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
  const keyData = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

/** 派生 AWS 签名密钥 */
async function getSigningKey(
  secretKey: string,
  date: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256("AWS4" + secretKey, date);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

/** SHA-256 哈希转 hex 字符串 */
async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return bufToHex(hash);
}

// ─── S3 Addition 类型 ───────────────────────────────────────────────────────

interface S3Addition {
  access_key_id: string;
  secret_access_key: string;
  endpoint: string;
  region: string;
  bucket: string;
  root_prefix?: string;
  custom_host?: string;
}

// ─── S3 XML 解析辅助 ────────────────────────────────────────────────────────

/** 从 XML 字符串中提取单个标签的文本内容 */
function extractXmlValue(xml: string, tag: string): string {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  return m ? m[1] : "";
}

/** 解析 ListObjectsV2 XML 响应 */
interface ListObjectsResult {
  commonPrefixes: string[];
  contents: Array<{ key: string; size: number; lastModified: string }>;
}

function parseListObjectsV2(xml: string): ListObjectsResult {
  const commonPrefixes: string[] = [];
  const contents: Array<{ key: string; size: number; lastModified: string }> = [];

  // 解析 CommonPrefixes
  const prefixRe = /<CommonPrefixes>([\s\S]*?)<\/CommonPrefixes>/g;
  let m: RegExpExecArray | null;
  while ((m = prefixRe.exec(xml)) !== null) {
    const prefix = extractXmlValue(m[1], "Prefix");
    if (prefix) commonPrefixes.push(prefix);
  }

  // 解析 Contents
  const contentsRe = /<Contents>([\s\S]*?)<\/Contents>/g;
  while ((m = contentsRe.exec(xml)) !== null) {
    const block = m[1];
    const key = extractXmlValue(block, "Key");
    const size = parseInt(extractXmlValue(block, "Size") || "0", 10);
    const lastModified = extractXmlValue(block, "LastModified");
    if (key) contents.push({ key, size, lastModified });
  }

  return { commonPrefixes, contents };
}

// ─── S3Driver ───────────────────────────────────────────────────────────────

export class S3Driver implements Driver {
  private addition!: S3Addition;
  private mountPath = "/";

  async init(addition: Record<string, unknown>, _env: Env, _mountId: number): Promise<void> {
    this.addition = addition as unknown as S3Addition;

    // 从 addition 中读取注入的 mount_path（路由层可选注入）
    if (typeof (addition as Record<string, unknown>)._mount_path === "string") {
      this.mountPath = (addition as Record<string, unknown>)._mount_path as string;
    }

    // 验证连接：调用 ListObjectsV2，prefix=""，max-keys=1
    const xml = await this.listObjectsV2("", 1);
    // 如果能正常解析 XML（不抛出异常），则连接成功
    parseListObjectsV2(xml);
  }

  async list(dir: Obj, _env: Env): Promise<Obj[]> {
    const { root_prefix = "" } = this.addition;

    // 计算 S3 prefix：
    // - 如果 dir.id 以 / 开头，说明是虚拟路径，用 getRelativePath 转换
    // - 否则 dir.id 本身就是 S3 prefix（子目录递归调用）
    let prefix: string;
    if (dir.id.startsWith("/")) {
      const relativePath = getRelativePath(this.mountPath, dir.id);
      prefix = root_prefix + relativePath.replace(/^\//, "");
    } else {
      prefix = dir.id;
    }

    // 确保目录 prefix 以 / 结尾（根目录除外）
    if (prefix && !prefix.endsWith("/")) {
      prefix += "/";
    }

    const xml = await this.listObjectsV2(prefix, 1000);
    const { commonPrefixes, contents } = parseListObjectsV2(xml);

    const objs: Obj[] = [];

    // CommonPrefixes → isDir: true
    for (const cp of commonPrefixes) {
      // name 取最后一段，去掉末尾 /
      const withoutTrailing = cp.replace(/\/$/, "");
      const name = withoutTrailing.split("/").pop() || withoutTrailing;
      objs.push({
        id: cp,
        name,
        size: 0,
        modified: "",
        isDir: true,
      });
    }

    // Contents → isDir: false（排除与 prefix 完全相同的条目）
    for (const item of contents) {
      if (item.key === prefix) continue;
      const name = item.key.split("/").pop() || item.key;
      objs.push({
        id: item.key,
        name,
        size: item.size,
        modified: item.lastModified,
        isDir: false,
      });
    }

    return objs;
  }

  async link(file: Obj, _env: Env): Promise<Link> {
    const { access_key_id, secret_access_key, endpoint, region, bucket, custom_host } =
      this.addition;

    const key = file.id;
    const service = "s3";

    // 构造时间戳
    const now = new Date();
    const datetime = now
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z"); // YYYYMMDDTHHmmssZ
    const date = datetime.slice(0, 8); // YYYYMMDD

    // 解析 endpoint 获取 host
    const endpointUrl = new URL(endpoint);
    const host = endpointUrl.host;

    // URI：/{bucket}/{key}
    const uri = `/${bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;

    // 构造 credential scope
    const credentialScope = `${date}/${region}/${service}/aws4_request`;
    const credential = `${access_key_id}/${credentialScope}`;

    // 构造查询参数（按字母排序）
    const queryParams: Record<string, string> = {
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": credential,
      "X-Amz-Date": datetime,
      "X-Amz-Expires": "3600",
      "X-Amz-SignedHeaders": "host",
    };

    // 按字母排序构造 canonical query string
    const sortedKeys = Object.keys(queryParams).sort();
    const canonicalQueryString = sortedKeys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join("&");

    // Canonical headers
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = "host";

    // Canonical request（预签名 URL 的 payload hash 固定为 UNSIGNED-PAYLOAD）
    const canonicalRequest = [
      "GET",
      uri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    // String to sign
    const canonicalRequestHash = await sha256Hex(canonicalRequest);
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      datetime,
      credentialScope,
      canonicalRequestHash,
    ].join("\n");

    // 计算签名
    const signingKey = await getSigningKey(secret_access_key, date, region, service);
    const signatureBuf = await hmacSha256(signingKey, stringToSign);
    const signature = bufToHex(signatureBuf);

    // 构造预签名 URL
    const presignedUrl = new URL(`${endpoint}${uri}`);
    for (const k of sortedKeys) {
      presignedUrl.searchParams.set(k, queryParams[k]);
    }
    presignedUrl.searchParams.set("X-Amz-Signature", signature);

    // 应用 custom_host
    if (custom_host) {
      presignedUrl.host = custom_host;
    }

    return { url: presignedUrl.toString() };
  }

  getConfig(): DriverConfig {
    return {
      name: "s3",
      displayName: "S3 兼容存储",
      schema: {
        access_key_id: {
          type: "string",
          required: true,
          description: "Access Key ID",
        },
        secret_access_key: {
          type: "string",
          required: true,
          description: "Secret Access Key",
        },
        endpoint: {
          type: "string",
          required: true,
          description: "S3 端点 URL，如 https://s3.amazonaws.com",
        },
        region: {
          type: "string",
          required: true,
          description: "区域，如 us-east-1",
        },
        bucket: {
          type: "string",
          required: true,
          description: "存储桶名称",
        },
        root_prefix: {
          type: "string",
          required: false,
          default: "",
          description: "根路径前缀（可选）",
        },
        custom_host: {
          type: "string",
          required: false,
          description: "自定义域名，替换预签名 URL 的 host（可选）",
        },
      },
    };
  }

  // ─── 私有方法 ──────────────────────────────────────────────────────────────

  /** 调用 S3 ListObjectsV2 API，返回原始 XML */
  private async listObjectsV2(prefix: string, maxKeys: number): Promise<string> {
    const { access_key_id, secret_access_key, endpoint, region, bucket } = this.addition;
    const service = "s3";

    const endpointUrl = new URL(endpoint);
    const host = endpointUrl.host;

    // 构造时间戳
    const now = new Date();
    const datetime = now
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
    const date = datetime.slice(0, 8);

    // 查询参数
    const queryParams: Record<string, string> = {
      "list-type": "2",
      delimiter: "/",
      "max-keys": String(maxKeys),
      prefix,
    };

    // 按字母排序
    const sortedKeys = Object.keys(queryParams).sort();
    const canonicalQueryString = sortedKeys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join("&");

    // Payload hash（空 body）
    const payloadHash = await sha256Hex("");

    // Canonical headers
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${datetime}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

    // URI：/{bucket}
    const uri = `/${bucket}`;

    // Canonical request
    const canonicalRequest = [
      "GET",
      uri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    // String to sign
    const credentialScope = `${date}/${region}/${service}/aws4_request`;
    const canonicalRequestHash = await sha256Hex(canonicalRequest);
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      datetime,
      credentialScope,
      canonicalRequestHash,
    ].join("\n");

    // 签名
    const signingKey = await getSigningKey(secret_access_key, date, region, service);
    const signatureBuf = await hmacSha256(signingKey, stringToSign);
    const signature = bufToHex(signatureBuf);

    // Authorization header
    const authorization = `AWS4-HMAC-SHA256 Credential=${access_key_id}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // 构造请求 URL
    const url = new URL(`${endpoint}/${bucket}`);
    for (const k of sortedKeys) {
      url.searchParams.set(k, queryParams[k]);
    }

    const resp = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: authorization,
        "x-amz-date": datetime,
        "x-amz-content-sha256": payloadHash,
        Host: host,
      },
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`S3 ListObjectsV2 failed: ${resp.status} ${body}`);
    }

    return resp.text();
  }

}
