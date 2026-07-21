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

patch('finance/pages/journal-entries/journal-entries-list.component.html', (c) =>
  c.replace('    <app-table-skeleton [cols]="4" />\r\n  </div>\r\n  } @else if', '    <app-table-skeleton [cols]="4" />\r\n  } @else if')
    .replace('    <app-table-skeleton [cols]="4" />\n  </div>\n  } @else if', '    <app-table-skeleton [cols]="4" />\n  } @else if')
);

patch('finance/pages/reconciliation/reconciliation-detail.component.html', (c) => {
  let x = c.replace(
    /          <\/table>\r?\n    <\/div>\r?\n        \}\r?\n      <\/div>/,
    '          </table>\n        }\n      </div>'
  );
  x = x.replace(
    /          <\/table>\r?\n    <\/div>\r?\n        \}\r?\n    <\/div>\r?\n  \}/,
    '          </table>\n        }\n      </div>\n    </div>\n  }'
  );
  return x;
});

patch('inventory/pages/categories/categories.component.html', (c) =>
  c.replace(
    /        <\/table>\r?\n    <\/div>\r?\n    <div class="flex justify-end mt-3">/,
    '        </table>\n      </div>\n    </div>\n    <div class="flex justify-end mt-3">'
  ).replace(
    /    <\/div>\r?\n  \}\r?\n<\/div>\r?\n\r?\n<app-modal/,
    '  }\n</div>\n\n<app-modal'
  )
);

// categories: after export div we removed container close - wait the fix added container close before export. Structure should be:
// table-container > scroll > table, then export OUTSIDE container? Original had export inside @else block. Let me check - after my fix:
// table-container, scroll, table, close scroll, close container, export div, close @else
// Need to NOT remove closing before modal - I may have broken categories. Re-read logic.

patch('inventory/pages/purchase-requisitions/purchase-requisitions.component.html', (c) =>
  c.replace(
    /        <\/table>\r?\n    <\/div>\r?\n  \}/,
    '        </table>\n      </div>\n    </div>\n  }'
  )
);

patch('inventory/pages/stock-overview/stock-overview.component.html', (c) => {
  // delta 1 - check if missing scroll close - read file count
  return c.replace(
    /        <\/table>\r?\n      <\/div>\r?\n      <app-pagination/,
    '        </table>\n      </div>\n      <app-pagination'
  ); // no op likely - search elsewhere
});

patch('inventory/pages/valuation/valuation.component.html', (c) =>
  c.replace(
    /        <\/table>\r?\n    <\/div>\r?\n\r?\n    <div class="table-container">\r?\n      <h3 class="px-4 pt-4 text-sm font-semibold text-gray-700">Item Detail<\/h3>/,
    '        </table>\n      </div>\n    </div>\n\n    <div class="table-container">\n      <h3 class="px-4 pt-4 text-sm font-semibold text-gray-700">Item Detail</h3>'
  ).replace(
    /        <\/table>\r?\n    <\/div>\r?\n  \}/,
    '        </table>\n      </div>\n    </div>\n  }'
  )
);

patch('production/pages/reports/production-reports.component.html', (c) =>
  c.replace(
    /          <\/table>\r?\n    <\/div>\r?\n    \}/,
    '          </table>\n        </div>\n      </div>\n    }'
  )
);

patch('inventory/pages/dashboard/inventory-dashboard.component.html', (c) =>
  c.replace(
    /                <\/table>\r?\n      <\/div>\r?\n    <\/div>\r?\n          <\/div>\r?\n        \}/,
    '                </table>\n              </div>\n            </div>\n          }'
  )
);

