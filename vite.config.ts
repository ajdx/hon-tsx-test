import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Main Vite configuration
export default defineConfig({
  plugins: [
    react()
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },

  server: {
    watch: {
      usePolling: true,
      ignored: [
        '**/tsconfig.json',
        '**/tsconfig.*.json',
        path.resolve(__dirname, 'tsconfig.json')
      ]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
