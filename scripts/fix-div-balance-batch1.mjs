import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = path.join(__dirname, '..', 'src', 'app', 'modules');

function patch(rel, mutator) {
  const p = path.join(base, rel);
  const old = fs.readFileSync(p, 'utf8');
  const neu = mutator(old);
  if (old === neu) {
    console.log('NO CHANGE:', rel);
    return false;
  }
  fs.writeFileSync(p, neu);
  console.log('FIXED:', rel);
  return true;
}

// Common broken table footer (extra closing div)
const tableFooterFix = (c) =>
  c.replace(
    /          <\/table>\r?\n      <\/div>\r?\n    <\/div>\r?\n      <\/div>\r?\n    <\/app-dashboard-section>/g,
    '          </table>\n        </div>\n      </div>\n    </app-dashboard-section>'
  );

patch('dashboard/pages/dashboard-home/dashboard-home.component.html', tableFooterFix);

patch('finance/pages/accounts/accounts.component.html', (c) =>
  c.replace(
    /(<p class="modal-summary-panel__amount">[\s\S]*?<\/p>)\r?\n    <\/div>\r?\n  \}/,
    '$1\n      </div>\n    </div>\n  }'
  )
);

patch('finance/pages/journal-entries/journal-entries-list.component.html', (c) =>
  c.replace(
    /    <app-table-skeleton \[cols\]="4" \/>\r?\n  <\/div>\r?\n  \} @else if \(viewing\(\); as je\)/,
    '    <app-table-skeleton [cols]="4" />\n  } @else if (viewing(); as je)'
  )
);

patch('finance/pages/payables/payables.component.html', (c) =>
  c.replace(
    /          <\/table>\r?\n    <\/div>\r?\n    \}\r?\n  \}/,
    '          </table>\n        </div>\n      </div>\n    }\n  }'
  )
);

patch('finance/pages/receivables/receivables.component.html', (c) => {
  let x = c.replace(
    /        <input type="date" class="input-field" \[ngModel\]="statementDateTo\(\)" \(ngModelChange\)="statementDateTo\.set\(\$event\)" \/>\r?\n    <\/div>\r?\n  \}/,
    '        <input type="date" class="input-field" [ngModel]="statementDateTo()" (ngModelChange)="statementDateTo.set($event)" />\n      </div>\n    </div>\n  }'
  );
  return x;
});

patch('finance/pages/dashboard/finance-dashboard.component.html', (c) =>
  c.replace(
    /              <\/table>\r?\n      <\/div>\r?\n    <\/div>\r?\n          <\/div>\r?\n        \} @else \{/,
    '              </table>\n            </div>\n          </div>\n        } @else {'
  )
);

patch('hr/pages/dashboard/hr-dashboard.component.html', (c) =>
  c.replace(
    /                <\/table>\r?\n      <\/div>\r?\n    <\/div>\r?\n            <\/div>\r?\n          \} @else \{/,
    '                </table>\n              </div>\n            </div>\n          } @else {'
  )
);

