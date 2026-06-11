// =====================================================================
// Ekspor tabel ke Excel (CSV, kompatibel Excel) & PDF (jsPDF + autotable).
// CSV dipakai untuk "Excel" agar tanpa dependensi rentan; angka tetap mentah
// supaya Excel mem-parse sebagai angka. PDF untuk laporan cetak/arsip.
// jsPDF di-import dinamis (lazy) agar tidak membengkakkan bundle utama.
// =====================================================================
export type ExportColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function cell(v: string | number | null | undefined): string {
  return v == null ? '' : String(v);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCsv<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const esc = (s: string) => (/[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const header = columns.map((c) => esc(c.header)).join(',');
  const body = rows
    .map((r) => columns.map((c) => esc(cell(c.value(r)))).join(','))
    .join('\r\n');
  // 'sep=,' memberi tahu Excel pemisah kolom apa pun locale-nya; BOM untuk UTF-8.
  const content = `sep=,\r\n${header}\r\n${body}`;
  triggerDownload(new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

export async function downloadPdf<T>(opts: {
  title: string;
  filename: string;
  subtitle?: string;
  columns: ExportColumn<T>[];
  rows: T[];
}) {
  // Lazy-load: jsPDF + autotable (besar) hanya diunduh saat ekspor PDF dipakai.
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text(opts.title, 40, 40);
  if (opts.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(opts.subtitle, 40, 58);
  }
  autoTable(doc, {
    startY: opts.subtitle ? 72 : 56,
    head: [opts.columns.map((c) => c.header)],
    body: opts.rows.map((r) => opts.columns.map((c) => cell(c.value(r)))),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [21, 128, 61] },
    alternateRowStyles: { fillColor: [247, 249, 248] },
    margin: { left: 40, right: 40 },
  });
  doc.save(`${opts.filename}.pdf`);
}
