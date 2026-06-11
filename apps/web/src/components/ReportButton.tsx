import { useState } from 'react';

// Tombol "Laporan PDF" dengan state busy. `run` membangun & mengunduh PDF.
export function ReportButton({
  run,
  label = '⬇ Laporan PDF',
  disabled,
}: {
  run: () => Promise<void>;
  label?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn btn-sm btn-primary"
      disabled={busy || disabled}
      onClick={async () => {
        setBusy(true);
        try {
          await run();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Menyiapkan…' : label}
    </button>
  );
}
