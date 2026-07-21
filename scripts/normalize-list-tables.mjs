/**
 * Normalizes list table markup after wrap-list-tables / fix-list-tables scripts.
 * Removes table-scroll-viewport wrappers and restores valid table-container structure.
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

function normalize(content) {
  if (!content.includes('table-container card--scroll-body')) {
    return { content, changed: false };
  }

  let next = content;

  // Drop scroll viewport wrappers — CSS handles scroll on table-container directly.
  next = next.replace(/<div class="table-scroll-viewport">/g, '');

  // </table></div><app-pagination → </table><app-pagination (pagination stays in container)
  next = next.replace(/<\/table>\s*<\/div>\s*(<app-pagination)/g, '</table>\n      $1');

  // </table></div></div> → </table></div> (drop viewport close before container close)
  next = next.replace(/<\/table>\s*<\/div>\s*<\/div>/g, '</table>\n    </div>');

  // Pagination followed by extra </div> before block close
  next = next.replace(
    /(<app-pagination[\s\S]*?(?:\/>|<\/app-pagination>))\s*<\/div>\s*<\/div>\s*(\n\s*\})/g,
    '$1\n    </div>$2',
  );

  // Orphan </div> right after pagination when container already closed
  next = next.replace(
    /(<app-pagination[\s\S]*?(?:\/>|<\/app-pagination>))\s*<\/div>\s*(\n\s*\})/g,
    '$1\n    </div>$2',
  );

  // Tables without pagination: ensure container closes
  next = next.replace(
    /(<div class="table-container card--scroll-body">[\s\S]*?<\/table>)\s*(\n\s*\})/g,
    (match, head, blockEnd) => {
      if (head.includes('</div>')) return match;
      return `${head}\n    </div>${blockEnd}`;
    },
  );

  // Collapse duplicate card--scroll-body class
  next = next.replace(/card--scroll-body card--scroll-body/g, 'card--scroll-body');

  return { content: next, changed: next !== content };
}

const files = walk(srcRoot);
let updated = 0;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  const { content, changed } = normalize(original);
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    updated++;
    console.log('normalized:', path.relative(srcRoot, file));
  }
}

console.log(`Done. ${updated} file(s) normalized.`);
