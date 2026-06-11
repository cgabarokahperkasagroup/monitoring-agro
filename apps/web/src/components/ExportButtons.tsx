import { useState } from 'react';
import { downloadCsv, downloadPdf, type ExportColumn } from '@/lib/export';

export function ExportButtons<T>({
  title,
  filename,
  subtitle,
  columns,
  rows,
}: {
  title: string;
  filename: string;
  subtitle?: string;
  columns: ExportColumn<T>[];
  rows: T[];
}) {
  const disabled = rows.length === 0;
  const [pdfBusy, setPdfBusy] = useState(false);

  async function onPdf() {
    setPdfBusy(true);
    try {
      await downloadPdf({ title, filename, subtitle, columns, rows });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        className="btn btn-sm"
        disabled={disabled}
        onClick={() => downloadCsv(filename, columns, rows)}
        title="Unduh sebagai CSV (buka di Excel)"
      >
        ⬇ Excel
      </button>
      <button
        className="btn btn-sm"
        disabled={disabled || pdfBusy}
        onClick={onPdf}
        title="Unduh sebagai PDF"
      >
        {pdfBusy ? 'Menyiapkan…' : '⬇ PDF'}
      </button>
    </div>
  );
}
