/**
 * Reverts accidental table-scroll-viewport changes in dashboards and forms.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '..', 'src', 'app', 'modules');

const REVERT_PATH_RE = /dashboard|[-/]form\.component\.html$|bill-form|grn-form|permit-form|user-form|recurring-bill-form/i;

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
  const rel = path.relative(srcRoot, file);
  if (!REVERT_PATH_RE.test(rel)) continue;
  const original = fs.readFileSync(file, 'utf8');
  const next = original.replace(/<div class="table-scroll-viewport">/g, '<div class="overflow-x-auto">');
  if (next !== original) {
    fs.writeFileSync(file, next, 'utf8');
    updated++;
    console.log('reverted:', rel);
  }
}
console.log(`Done. ${updated} file(s).`);
