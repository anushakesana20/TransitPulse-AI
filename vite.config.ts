import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // The preview is served through a proxy that does not forward Vite's
      // development WebSocket, so keep the middleware server HTTP-only.
      hmr: false,
      watch: null,
    },
  };
});
