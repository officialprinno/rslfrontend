export type PrintAlign = 'left' | 'right' | 'center';

export interface PrintFilter {
    label: string;
    value: string;
}

export interface PrintColumn {
    key: string;
    label: string;
    align?: PrintAlign;
}

export interface PrintReportOptions {
    title: string;
    subtitle?: string;
    filters?: PrintFilter[];
    columns: PrintColumn[];
    rows: Array<Record<string, string | number | null | undefined>>;
    generatedAt?: string;
    orientation?: 'portrait' | 'landscape' | 'auto';
    footer?: {
        preparedBy?: string;
        signedBy?: string;
        preparedByLabel?: string;
        signedByLabel?: string;
    };
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function alignClass(align: PrintAlign | undefined): string {
    if (align === 'right') return 'right';
    if (align === 'center') return 'center';
    return 'left';
}

export function printReportDocument(options: PrintReportOptions): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        return;
    }

    const filtersHtml = (options.filters ?? [])
        .map((f) => `<div class="filter-pill"><span>${escapeHtml(f.label)}:</span> ${escapeHtml(f.value)}</div>`)
        .join('');

    const headerCells = options.columns
        .map((col) => `<th class="${alignClass(col.align)}">${escapeHtml(col.label)}</th>`)
        .join('');

    const bodyRows = options.rows
        .map((row) => {
            const cells = options.columns
                .map((col) => {
                    const raw = row[col.key];
                    const value = raw == null || raw === '' ? '—' : String(raw);
                    return `<td class="${alignClass(col.align)}">${escapeHtml(value)}</td>`;
                })
                .join('');
            return `<tr>${cells}</tr>`;
        })
        .join('');

    const orientation =
        options.orientation === 'portrait' || options.orientation === 'landscape'
            ? options.orientation
            : options.columns.length > 8
                ? 'landscape'
                : 'portrait';

    const preparedByLabel = options.footer?.preparedByLabel ?? 'Prepared by';
    const signedByLabel = options.footer?.signedByLabel ?? 'Signed by';
    const preparedBy = options.footer?.preparedBy ?? '';
    const signedBy = options.footer?.signedBy ?? '';
    const footerHtml =
        options.footer
            ? `<div class="signatures">
          <div class="signature-box">
            <div class="signature-label">${escapeHtml(preparedByLabel)}</div>
            <div class="signature-line">${escapeHtml(preparedBy || '____________________________')}</div>
          </div>
          <div class="signature-box">
            <div class="signature-label">${escapeHtml(signedByLabel)}</div>
            <div class="signature-line">${escapeHtml(signedBy || '____________________________')}</div>
          </div>
        </div>`
            : '';

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(options.title)}</title>
  <style>
    @page { size: A4 ${orientation}; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #1f2937; margin: 0; }
    .report { width: 100%; }
    .title { font-size: 22px; font-weight: 700; margin: 0; color: #0f172a; }
    .subtitle { margin: 6px 0 10px; color: #475569; font-size: 13px; }
    .meta { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
    .filters { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 14px; }
    .filter-pill { border: 1px solid #d1d5db; border-radius: 999px; padding: 4px 10px; font-size: 12px; color: #334155; }
    .filter-pill span { font-weight: 600; }
    .generated { font-size: 12px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #e2e8f0; padding: 7px 8px; font-size: 11px; vertical-align: top; word-break: break-word; }
    th { background: #f8fafc; color: #334155; text-transform: uppercase; letter-spacing: 0.02em; }
    .left { text-align: left; }
    .right { text-align: right; }
    .center { text-align: center; }
    .signatures { margin-top: 18px; display: flex; gap: 28px; }
    .signature-box { flex: 1; }
    .signature-label { font-size: 12px; color: #475569; margin-bottom: 18px; }
    .signature-line { border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 12px; color: #0f172a; }
  </style>
</head>
<body>
  <div class="report">
    <div class="meta">
      <div>
        <h1 class="title">${escapeHtml(options.title)}</h1>
        ${options.subtitle ? `<div class="subtitle">${escapeHtml(options.subtitle)}</div>` : ''}
      </div>
      <div class="generated">Generated: ${escapeHtml(options.generatedAt ?? new Date().toLocaleString())}</div>
    </div>
    ${filtersHtml ? `<div class="filters">${filtersHtml}</div>` : ''}
    <table>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows || `<tr><td colspan="${options.columns.length}" class="center">No records</td></tr>`}</tbody>
    </table>
    ${footerHtml}
  </div>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for the new document to render before opening browser print preview.
    const triggerPrint = () => {
        printWindow.focus();
        printWindow.print();
    };

    if (printWindow.document.readyState === 'complete') {
        setTimeout(triggerPrint, 50);
        return;
    }

    printWindow.addEventListener('load', () => setTimeout(triggerPrint, 50), { once: true });
}
