#!/usr/bin/env node
/**
 * 重置管理员密码脚本（生成随机密码）
 * 用法: node scripts/reset-admin.js [--remote|--local]
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

function generatePassword(length = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const isRemote = process.argv.includes('--remote');
const isLocal = process.argv.includes('--local');
const target = isRemote ? 'remote' : (isLocal ? 'local' : 'local');

const username = 'admin';
const password = generatePassword(16);
const salt = generateSalt();
const passwordHash = hashPassword(password, salt);

console.log('\n🔐 管理员账户已重置：\n');
console.log('用户名:', username);
console.log('新密码:', password);
console.log('\n⚠️  请妥善保存此密码，关闭窗口后将无法找回！\n');

const command = `wrangler d1 execute cf-drive-db --${target} --command="DELETE FROM users WHERE username='admin'; INSERT INTO users (username, password_hash, salt, role, disabled, created_at, updated_at) VALUES ('${username}', '${passwordHash}', '${salt}', 'admin', 0, datetime('now'), datetime('now'));"`;

console.log('📝 执行以下命令完成重置：\n');
console.log(command);
console.log('');
