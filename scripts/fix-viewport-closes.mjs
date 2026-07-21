/**
 * Fixes table-container + table-scroll-viewport closing structure.
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

  // viewport + table: missing table-container close before block end
  next = next.replace(
    /(<div class="table-container card--scroll-body">\s*<div class="table-scroll-viewport">[\s\S]*?<\/table>)\s*<\/div>(\s*\n\s*\})/g,
    '$1\n      </div>\n    </div>$2',
  );

  // viewport + pagination: ensure both wrappers close
  next = next.replace(
    /(<div class="table-container card--scroll-body">\s*<div class="table-scroll-viewport">[\s\S]*?<\/table>)\s*<\/div>\s*(<app-pagination[\s\S]*?(?:\/>|<\/app-pagination>))(\s*\n\s*\})/g,
    '$1\n      </div>\n      $2\n    </div>$3',
  );

  return next;
}

let updated = 0;
for (const file of walk(srcRoot)) {
  const original = fs.readFileSync(file, 'utf8');
  const next = fix(original);
  if (next !== original) {
    fs.writeFileSync(file, next, 'utf8');
    updated++;
    console.log('fixed:', path.relative(srcRoot, file));
  }
}
console.log(`Done. ${updated} file(s).`);
