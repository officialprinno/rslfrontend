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

let updated = 0;
for (const file of walk(srcRoot)) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  content = content.replace(/class="table-container card--scroll-body/g, 'class="table-container');
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    updated++;
  }
}
console.log(`Removed card--scroll-body from ${updated} files.`);
