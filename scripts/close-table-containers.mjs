/**
 * Ensures table-container blocks close before @else/@if block ends.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '..', 'src', 'app', 'modules');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function fix(content) {
  let next = content;
  let changed = false;

  const withPagination = /(<div class="table-container[^"]*">[\s\S]*?<app-pagination[\s\S]*?(?:\/>|<\/app-pagination>))(\s*\n\s*\})/g;
  const fixedPagination = next.replace(withPagination, (match, inner, blockEnd) => {
    if (/\n\s*<\/div>\s*\n\s*\}$/.test(match)) return match;
    changed = true;
    return `${inner}\n    </div>${blockEnd}`;
  });
  next = fixedPagination;

  const withTableOnly = /(<div class="table-container[^"]*">[\s\S]*?<\/table>)(\s*\n\s*\})/g;
  const fixedTable = next.replace(withTableOnly, (match, inner, blockEnd) => {
    if (inner.includes('\n    </div>') || inner.includes('\n  </div>')) return match;
    changed = true;
    return `${inner}\n    </div>${blockEnd}`;
  });
  next = fixedTable;

  return { content: next, changed: next !== content };
}

let updated = 0;
for (const file of walk(srcRoot)) {
  const original = fs.readFileSync(file, 'utf8');
  if (!original.includes('table-container')) continue;
  const { content, changed } = fix(original);
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    updated++;
    console.log('closed:', path.relative(srcRoot, file));
  }
}
console.log(`Done. ${updated} file(s).`);
