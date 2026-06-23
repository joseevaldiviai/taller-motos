import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui':     ['lucide-react', 'react-hot-toast', 'zustand'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-pdf':    ['jspdf', 'jspdf-autotable'],
          'vendor-xlsx':   ['xlsx'],
        },
      },
    },
  },
})
