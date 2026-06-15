const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/app/core/config/navigation.config.ts');
let c = fs.readFileSync(configPath, 'utf8');

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function routeToKey(route, isTopLevel = false) {
  const parts = route.split('/').filter(Boolean);
  if (parts.length === 1) return `nav.${parts[0]}`;
  const mod = parts[0];
  const rest = parts.slice(1).map(slug).join('.');
  if (isTopLevel && parts.length === 2) {
    return `nav.${mod}.title`;
  }
  return `nav.${mod}.${rest}`;
}

// Top-level nav items (with icon)
c = c.replace(/\{\s*label: '([^']+)',\s*route: '([^']+)',\s*icon:/g, (m, label, route) => {
  return `{ labelKey: '${routeToKey(route, true)}', route: '${route}', icon:`;
});

// Child items
c = c.replace(/\{\s*label: '([^']+)',\s*route: '([^']+)',\s*module:/g, (m, label, route) => {
  return `{ labelKey: '${routeToKey(route)}', route: '${route}', module:`;
});

c = c.replace(
  /export const NAV_SECTION_LABELS[\s\S]*?};/,
  `export const NAV_SECTION_LABELS: Record<Exclude<NavSection, 'main'>, string> = {
  modules: 'nav.sections.modules',
  system: 'nav.sections.system',
};`,
);

fs.writeFileSync(configPath, c);
console.log('navigation.config.ts updated');
