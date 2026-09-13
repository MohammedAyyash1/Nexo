import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve(process.cwd(), 'src');
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.git', 'scripts']);

function walk(dir, fileList = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, fileList);
    else if (/\.(js|jsx)$/.test(entry.name)) fileList.push(full);
  }
  return fileList;
}

function repairContent(content) {
  const lines = content.split('\n');
  const apiImportRegex = /^import\s*\{\s*API_BASE\s*\}\s*from\s*['"][^'"]+['"];?\s*$/;
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    if (!apiImportRegex.test(lines[i].trim())) continue;

    const prevLine = i > 0 ? lines[i - 1].trim() : '';
    if (!/^import\s*\{\s*$/.test(prevLine)) continue;

    const apiLine = lines[i];
    lines.splice(i, 1);

    let closeIdx = -1;
    for (let j = i; j < lines.length; j++) {
      if (/^\}\s*from\s*['"][^'"]+['"];?\s*$/.test(lines[j].trim())) {
        closeIdx = j;
        break;
      }
    }

    if (closeIdx !== -1) {
      lines.splice(closeIdx + 1, 0, apiLine);
      changed = true;
    } else {
      lines.splice(i, 0, apiLine);
    }
  }

  return { content: lines.join('\n'), changed };
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('khata: ma la2it majalled src/');
    process.exit(1);
  }

  const files = walk(SRC_DIR);
  let fixedCount = 0;

  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    const { content, changed } = repairContent(original);
    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('tam eslah: ' + path.relative(process.cwd(), file));
      fixedCount++;
    }
  }

  console.log('---');
  console.log('total fixed: ' + fixedCount);
}

main();