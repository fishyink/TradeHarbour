import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  plugins: [react()],
  base: isDev ? '/' : './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8080,
    strictPort: false,
  },
})