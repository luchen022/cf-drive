#!/usr/bin/env node
/**
 * 创建管理员账户脚本
 * 用法: node scripts/create-admin.js <username> <password>
 */

const crypto = require('crypto');

function hashPassword(password, salt) {
  const hash1 = crypto.createHash('sha256').update(password + salt).digest('hex');
  const hash2 = crypto.createHash('sha256').update(hash1).digest('hex');
  return hash2;
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

const username = process.argv[2] || 'admin';
const password = process.argv[3];

if (!password) {
  console.error('❌ 错误：必须提供密码');
  console.log('\n用法: node scripts/create-admin.js <username> <password>');
  console.log('示例: node scripts/create-admin.js admin mypassword123');
  process.exit(1);
}

const salt = generateSalt();
const passwordHash = hashPassword(password, salt);

console.log('\n✅ 管理员账户信息已生成：\n');
console.log('用户名:', username);
console.log('密码:', password);
console.log('Salt:', salt);
console.log('Password Hash:', passwordHash);

console.log('\n📝 执行以下命令插入到生产数据库：\n');
console.log(`wrangler d1 execute cf-drive-db --remote --command="INSERT INTO users (username, password_hash, salt, role, disabled, created_at, updated_at) VALUES ('${username}', '${passwordHash}', '${salt}', 'admin', 0, datetime('now'), datetime('now'));"`);

console.log('\n📝 或者插入到本地数据库：\n');
console.log(`wrangler d1 execute cf-drive-db --local --command="INSERT INTO users (username, password_hash, salt, role, disabled, created_at, updated_at) VALUES ('${username}', '${passwordHash}', '${salt}', 'admin', 0, datetime('now'), datetime('now'));"`);
