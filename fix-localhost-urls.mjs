#!/usr/bin/env node
/**
 * fix-localhost-urls.mjs
 *
 * يبحث بكل ملفات .js/.jsx تحت مجلد src/ عن أي رابط مكتوب مباشرة
 * بصيغة http://localhost:3001 ويستبدله بـ ${API_BASE} من config/api.js،
 * مع إضافة سطر الاستيراد تلقائيًا إذا كان ناقصًا.
 *
 * الاستخدام:
 *   node fix-localhost-urls.mjs            -> معاينة فقط (dry-run)، لا يعدّل أي ملف
 *   node fix-localhost-urls.mjs --apply    -> يطبّق التعديلات فعليًا على الملفات
 *
 * شغّله من داخل جذر مشروع Nexo (نفس المستوى اللي فيه مجلد src/).
 */

import fs from 'fs';
import path from 'path';

const APPLY = process.argv.includes('--apply');
const SRC_DIR = path.resolve(process.cwd(), 'src');

const EXCLUDE_BASENAMES = new Set(['api.js', 'server.js', 'env.js']);
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.git', 'scripts']);

const LOCALHOST_REGEX = /(['"`])http:\/\/localhost:3001([^'"`]*)\1/g;

function walk(dir, fileList = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, fileList);
    } else if (/\.(js|jsx)$/.test(entry.name) && !EXCLUDE_BASENAMES.has(entry.name)) {
      fileList.push(full);
    }
  }
  return fileList;
}

function computeImportPath(fileDir, apiFileAbs) {
  let rel = path.relative(fileDir, apiFileAbs).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function findApiFile() {
  const ROOT_DIR = process.cwd();
  const candidates = [
    path.join(ROOT_DIR, 'config', 'api.js'),       // جذر المشروع/config/api.js  ← هذا مكانه عندك
    path.join(SRC_DIR, 'config', 'api.js'),
    path.join(SRC_DIR, 'api.js'),
    path.join(ROOT_DIR, 'api.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function hasApiBaseImport(content) {
  return /import\s*\{\s*API_BASE\s*\}\s*from\s*['"][^'"]+['"]/.test(content);
}

function insertImport(content, importLine) {
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) lastImportIdx = i;
    else if (lastImportIdx !== -1 && lines[i].trim() !== '') break;
  }
  if (lastImportIdx === -1) {
    return importLine + '\n' + content;
  }
  lines.splice(lastImportIdx + 1, 0, importLine);
  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('❌ ما لقيت مجلد src/ — شغّل السكربت من جذر المشروع.');
    process.exit(1);
  }

  const apiFileAbs = findApiFile();
  if (!apiFileAbs) {
    console.error('❌ ما لقيت src/config/api.js أو src/api.js — عدّل السكربت أو تأكد من المسار الصحيح.');
    process.exit(1);
  }
  console.log(`ℹ️  ملف API_BASE المرجعي: ${path.relative(process.cwd(), apiFileAbs)}`);
  console.log(APPLY ? '⚠️  وضع التطبيق الفعلي (--apply)\n' : '🔍 وضع المعاينة فقط (dry-run) — أضف --apply للتطبيق الفعلي\n');

  const files = walk(SRC_DIR);
  let filesChanged = 0;
  let totalReplacements = 0;

  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    let matchCount = 0;
    const replaced = original.replace(LOCALHOST_REGEX, (_match, quote, rest) => {
      matchCount++;
      return `\`\${API_BASE}${rest}\``;
    });

    if (matchCount === 0) continue;

    let finalContent = replaced;
    if (!hasApiBaseImport(replaced)) {
      const importRelPath = computeImportPath(path.dirname(file), apiFileAbs).replace(/\.js$/, '.js');
      const importLine = `import { API_BASE } from '${importRelPath}';`;
      finalContent = insertImport(finalContent, importLine);
    }

    filesChanged++;
    totalReplacements += matchCount;
    const relFile = path.relative(process.cwd(), file);
    console.log(`📄 ${relFile}  →  ${matchCount} استبدال`);

    if (APPLY) {
      fs.writeFileSync(file, finalContent, 'utf8');
    }
  }

  console.log('\n────────────────────────────');
  console.log(`الملفات المتأثرة: ${filesChanged}`);
  console.log(`إجمالي الاستبدالات: ${totalReplacements}`);
  if (!APPLY && filesChanged > 0) {
    console.log('\n➡️  هذه معاينة فقط. راجع القائمة، وإذا كانت صحيحة شغّل:');
    console.log('    node fix-localhost-urls.mjs --apply');
  }
  if (APPLY) {
    console.log('\n✅ تم التطبيق. الآن راجع التغييرات بـ git diff قبل أي commit.');
  }
}

main();