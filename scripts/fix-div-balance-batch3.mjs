import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = path.join(__dirname, '..', 'src', 'app', 'modules');

function patch(rel, mutator) {
  const p = path.join(base, rel);
  const old = fs.readFileSync(p, 'utf8');
  const neu = mutator(old);
  if (old === neu) console.log('NO CHANGE:', rel);
  else {
    fs.writeFileSync(p, neu);
    console.log('FIXED:', rel);
  }
}

patch('inventory/pages/categories/categories.component.html', (c) =>
  c.replace(
    /      <button type="button" class="btn-ghost" \(click\)="exportExcel\(\)">Export to Excel<\/button>\r?\n  \}/,
    '      <button type="button" class="btn-ghost" (click)="exportExcel()">Export to Excel</button>\n    </div>\n  }'
  )
);

patch('inventory/pages/stock-overview/stock-overview.component.html', (c) =>
  c.replace(
    /        <p class="card-stat__label">Total Stock Value<\/p>\r?\n    <\/div>\r?\n  \}/,
    '        <p class="card-stat__label">Total Stock Value</p>\n      </div>\n    </div>\n  }'
  )
);

patch('inventory/pages/dashboard/inventory-dashboard.component.html', (c) =>
  c.replace(
    /              <\/table>\r?\n      <\/div>\r?\n    <\/div>\r?\n          <\/div>\r?\n        \}\r?\n      <\/app-dashboard-section>/,
    '              </table>\n            </div>\n          </div>\n        }\n      </app-dashboard-section>'
  )
);

// production-receipts, fuel, bom - missing table-scroll close pattern
for (const rel of [
  'inventory/pages/production-receipts/production-receipts.component.html',
  'logistics/pages/fuel/fuel-list.component.html',
  'production/pages/bom/bom-list.component.html',
]) {
  patch(rel, (c) => {
    if (!c.includes('table-scroll-viewport')) return c;
    return c.replace(
      /        <\/table>\r?\n      <\/div>\r?\n      <app-pagination/,
      '        </table>\n      </div>\n      </div>\n      <app-pagination'
    ).replace(
      /        <\/table>\r?\n    <\/div>\r?\n      <app-pagination/,
      '        </table>\n      </div>\n    </div>\n      <app-pagination'
    );
  });
}

