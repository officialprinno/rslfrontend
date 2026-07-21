/**
 * Closes overflow-x-auto wrappers before pagination inside list table containers.
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
  if (!content.includes('overflow-x-auto')) return { content, changed: false };
  let next = content;

  next = next.replace(
    /<div class="overflow-x-auto">/g,
    '<div class="table-scroll-viewport">',
  );

  next = next.replace(
    /(<div class="table-scroll-viewport">[\s\S]*?<\/table>)\s*(<app-pagination)/g,
    '$1\n      </div>\n      $2',
  );

  next = next.replace(
    /(<div class="table-scroll-viewport">[\s\S]*?<\/table>)\s*(<\/div>\s*<\/div>)/g,
    (match, head, tail) => {
      if (head.includes('</div>')) return match;
      return `${head}\n      </div>\n    ${tail.trimStart()}`;
    },
  );

  return { content: next, changed: next !== content };
}

let updated = 0;
for (const file of walk(srcRoot)) {
  const original = fs.readFileSync(file, 'utf8');
  const { content, changed } = fix(original);
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    updated++;
    console.log('fixed overflow:', path.relative(srcRoot, file));
  }
}

console.log(`Done. ${updated} file(s).`);
