#!/usr/bin/env node
/**
 * 构建脚本：将 frontend/index.html 内联为 src/frontend/index.ts 中的字符串常量
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../frontend/index.html');
const outputPath = path.join(__dirname, '../src/frontend/index.ts');

// 读取 HTML 文件
const html = fs.readFileSync(htmlPath, 'utf-8');

// 转义反引号和 ${} 以避免模板字符串问题
const escapedHtml = html
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${');

// 生成 TypeScript 文件内容
const tsContent = `// 内嵌前端 HTML — 文件浏览器 + 管理后台（单文件 SPA）
// 此文件由 scripts/build-frontend.js 自动生成，请勿手动编辑

export const FRONTEND_HTML = \`${escapedHtml}\`;
`;

// 写入文件
fs.writeFileSync(outputPath, tsContent, 'utf-8');

console.log('✅ 前端构建完成: src/frontend/index.ts');
