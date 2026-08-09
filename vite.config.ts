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
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'index.html'),
          customer: path.resolve(__dirname, 'customer.html'),
          driver: path.resolve(__dirname, 'driver.html'),
          store: path.resolve(__dirname, 'store.html'),
          'store-admin': path.resolve(__dirname, 'store-admin.html'),
          'super-admin': path.resolve(__dirname, 'super-admin.html'),
          'super-admin-staff': path.resolve(__dirname, 'super-admin-staff.html'),
          roles: path.resolve(__dirname, 'roles.html'),
        },
      },
    },
    server: {
      port: 3008,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify: file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
