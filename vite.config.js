import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  envDir: 'env',
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src')
    }
  },
  plugins: [
    react(),
  ]
});
