import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  server: {
    port: 5175,
    strictPort: true,
  },
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Ensure compatibility with Capacitor
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false,
  },
});
