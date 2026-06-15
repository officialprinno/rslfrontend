export interface ExportColumn<T> {
  key: keyof T | string;
  label: string;
  format?: (row: T) => string | number;
}

export function exportToExcel<T extends object>(
  filename: string,
  columns: ExportColumn<T>[],
  rows: T[],
): void {
  const header = columns.map((c) => c.label).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const raw = col.format
            ? col.format(row)
            : (row[col.key as keyof T] as string | number | null | undefined);
          const value = raw ?? '';
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(','),
    )
    .join('\n');

  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
