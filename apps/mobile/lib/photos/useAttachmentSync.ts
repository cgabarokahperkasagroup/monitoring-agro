// Jalankan proses upload foto saat koneksi tersedia (dan sekali saat mount).
import { useStatus } from '@powersync/react';
import { useEffect } from 'react';
import { processPendingUploads } from './uploader';

export function useAttachmentSync() {
  const status = useStatus();
  const connected = status?.connected ?? false;

  useEffect(() => {
    void processPendingUploads();
  }, []);

  useEffect(() => {
    if (connected) void processPendingUploads();
  }, [connected]);
}
