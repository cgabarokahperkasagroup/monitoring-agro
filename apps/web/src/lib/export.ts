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

// CSV dari array objek (kolom diturunkan dari kunci baris pertama).
export function downloadCsvFromRows(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    downloadCsv(filename, [{ header: 'info', value: () => 'tidak ada data' }], [{}]);
    return;
  }
  const keys = Object.keys(rows[0]);
  const columns: ExportColumn<Record<string, unknown>>[] = keys.map((k) => ({
    header: k,
    value: (r) => {
      const v = r[k];
      return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : (v as string | number);
    },
  }));
  downloadCsv(filename, columns, rows);
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

// =====================================================================
// Laporan PDF LENGKAP: judul + KPI + grafik (ditangkap dari DOM via
// html2canvas) + tabel. Semua lib di-import dinamis (lazy).
// =====================================================================
export type ReportTable = { heading: string; columns: ExportColumn<any>[]; rows: any[] };

export async function downloadReportPdf(opts: {
  title: string;
  subtitle?: string;
  filename: string;
  kpis?: { label: string; value: string }[];
  chartEls?: (HTMLElement | null | undefined)[];
  tables?: ReportTable[];
}) {
  const [{ default: jsPDF }, { default: autoTable }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('html2canvas'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 40;
  const contentW = pageW - M * 2;
  let y = M;

  const lastY = () => (doc as any).lastAutoTable?.finalY ?? y;
  const ensure = (need: number) => {
    if (y + need > pageH - M) {
      doc.addPage();
      y = M;
    }
  };

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(opts.title, M, y);
  y += 18;
  if (opts.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(opts.subtitle, M, y);
    y += 14;
  }
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(`Dibuat: ${new Date().toLocaleString('id-ID')}`, M, y);
  y += 18;

  if (opts.kpis?.length) {
    autoTable(doc, {
      startY: y,
      head: [['Metrik', 'Nilai']],
      body: opts.kpis.map((k) => [k.label, k.value]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [21, 128, 61] },
      margin: { left: M, right: M },
      tableWidth: contentW * 0.62,
    });
    y = lastY() + 20;
  }

  for (const el of opts.chartEls ?? []) {
    if (!el) continue;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
    const imgW = contentW;
    const imgH = (canvas.height / canvas.width) * imgW;
    ensure(imgH);
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', M, y, imgW, imgH);
    y += imgH + 20;
  }

  for (const t of opts.tables ?? []) {
    ensure(70);
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(t.heading, M, y);
    y += 6;
    autoTable(doc, {
      startY: y + 4,
      head: [t.columns.map((c) => c.header)],
      body: t.rows.map((r) => t.columns.map((c) => cell(c.value(r)))),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [21, 128, 61] },
      alternateRowStyles: { fillColor: [247, 249, 248] },
      margin: { left: M, right: M },
    });
    y = lastY() + 20;
  }

  doc.save(`${opts.filename}.pdf`);
}
