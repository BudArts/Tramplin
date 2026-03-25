// frontend/vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    define: {
      // Для продакшена используем пустую строку, чтобы запросы шли на тот же хост
      'import.meta.env.VITE_API_URL': JSON.stringify(
        mode === 'production' ? '' : (env.VITE_API_URL || 'http://localhost:8000')
      ),
    },
    server: {
      host: true,
      port: 3000,
      allowedHosts: 'all',
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    }
  }
})