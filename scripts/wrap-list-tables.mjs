/**
 * Wraps legacy list <table> elements in .table-scroll-viewport inside .table-container.
 * Adds card--scroll-body when missing. Skips dashboards, modals, and already-wrapped tables.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '..', 'src', 'app', 'modules');

const SKIP_SNIPPETS = [
  'dash-table-wrap',
  'table-scroll-viewport',
  'modal-body-inner',
];

function shouldSkip(content, filePath) {
  if (filePath.includes('dashboard') && content.includes('dash-table-wrap')) return true;
  return false;
}

function processContent(content) {
  if (!content.includes('table-container') || !content.includes('<table')) {
    return { content, changed: false };
  }

  let next = content;

  // Add card--scroll-body to table-container shells (not dash-table-wrap)
  next = next.replace(
    /class="table-container([^"]*)"/g,
    (full, rest) => {
      if (rest.includes('dash-table-wrap') || rest.includes('card--scroll-body')) {
        return full;
      }
      return `class="table-container card--scroll-body${rest}"`;
    },
  );

  // Wrap bare <table> inside table-container with scroll viewport
  next = next.replace(
    /(<div class="table-container[^"]*">)(\s*)(<table[\s>])/g,
    (match, open, ws, tableTag, offset) => {
      const before = next.slice(Math.max(0, offset - 80), offset);
      if (before.includes('table-scroll-viewport')) return match;
      return `${open}${ws}<div class="table-scroll-viewport">${tableTag}`;
    },
  );

  // Close viewport before pagination or end of table-container block
  next = next.replace(
    /(<div class="table-scroll-viewport">[\s\S]*?<\/table>)(\s*)(<app-pagination[\s>])/g,
    '$1$2</div>$2$3',
  );

  // Close viewport when table is last child before closing table-container
  next = next.replace(
    /(<div class="table-scroll-viewport">)([\s\S]*?)(<\/table>)(\s*)(<\/div>\s*<\/div>)/g,
    (match, vpOpen, mid, tableClose, ws, closeDivs) => {
      if (mid.includes('</div>')) return match;
      return `${vpOpen}${mid}${tableClose}${ws}</div>${ws}${closeDivs}`;
    },
  );

  return { content: next, changed: next !== content };
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

const files = walk(srcRoot);
let updated = 0;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  if (shouldSkip(original, file)) continue;
  const { content, changed } = processContent(original);
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    updated++;
    console.log('updated:', path.relative(srcRoot, file));
  }
}

console.log(`Done. ${updated} file(s) updated.`);
