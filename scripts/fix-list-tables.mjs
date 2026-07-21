/**
 * Fixes list table HTML broken by wrap-list-tables.mjs:
 * - Keeps pagination inside table-container
 * - Closes table-scroll-viewport and table-container properly
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

function fixContent(content) {
  let next = content;
  let changed = false;

  // Pagination was left outside table-container — move it inside before closing container.
  const paginationOutside = /(<div class="table-container card--scroll-body">\s*<div class="table-scroll-viewport">[\s\S]*?<\/table>\s*<\/div>)\s*\n\s*(<app-pagination[\s\S]*?\/>\s*)\n(\s*)\}/g;
  if (paginationOutside.test(next)) {
    next = next.replace(
      paginationOutside,
      '$1\n$2$3</div>\n$3}',
    );
    changed = true;
  }

  // Same pattern when pagination uses closing tag </app-pagination>
  const paginationOutsideBlock = /(<div class="table-container card--scroll-body">\s*<div class="table-scroll-viewport">[\s\S]*?<\/table>\s*<\/div>)\s*\n\s*(<app-pagination[\s\S]*?<\/app-pagination>\s*)\n(\s*)\}/g;
  if (paginationOutsideBlock.test(next)) {
    next = next.replace(
      paginationOutsideBlock,
      '$1\n$2$3</div>\n$3}',
    );
    changed = true;
  }

  // Missing closing </div> for table-scroll-viewport (table closed, only one </div> before pagination inside container)
  const missingViewportClose = /(<div class="table-scroll-viewport">[\s\S]*?<\/table>)\s*\n(\s*<app-pagination)/g;
  const fixedViewport = next.replace(missingViewportClose, '$1\n      </div>\n$2');
  if (fixedViewport !== next) {
    next = fixedViewport;
    changed = true;
  }

  // Ensure table-container closes when pagination is last child
  const containerOpenClose = /(<div class="table-container card--scroll-body">[\s\S]*?<app-pagination[\s\S]*?(?:\/>|<\/app-pagination>))\s*\n(\s*)\}(?!\s*<\/div>)/g;
  const fixedContainer = next.replace(containerOpenClose, '$1\n$2</div>\n$2}');
  if (fixedContainer !== next) {
    next = fixedContainer;
    changed = true;
  }

  // Remove duplicate </div></div> before }
  next = next.replace(/\n\s*<\/div>\s*\n\s*<\/div>\s*\n(\s*)\}/g, '\n    </div>\n$1}');

  return { content: next, changed: content !== next };
}

const files = walk(srcRoot);
let updated = 0;

for (const file of files) {
  if (!fs.readFileSync(file, 'utf8').includes('table-container card--scroll-body')) continue;
  const original = fs.readFileSync(file, 'utf8');
  const { content, changed } = fixContent(original);
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    updated++;
    console.log('fixed:', path.relative(srcRoot, file));
  }
}

console.log(`Done. ${updated} file(s) fixed.`);
