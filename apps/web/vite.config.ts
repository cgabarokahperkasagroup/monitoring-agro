import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Alias '@' -> ./src. Pakai fileURLToPath agar path ter-decode dengan benar
// (mis. folder dengan karakter "[" / spasi tidak ter-encode jadi %5B / %20).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: 5173 },
});
