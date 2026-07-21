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

for (const file of walk(srcRoot)) {
  const content = fs.readFileSync(file, 'utf8');
  const opens = (content.match(/<div[\s>]/g) || []).length;
  const closes = (content.match(/<\/div>/g) || []).length;
  if (opens !== closes) {
    console.log(`${path.relative(srcRoot, file)}: opens=${opens} closes=${closes} delta=${opens - closes}`);
  }
}
