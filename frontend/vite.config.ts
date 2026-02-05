import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize for mobile
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          qr: ['qrcode']
        }
      }
    }
  },
  server: {
    // Enable HTTPS for PWA testing in development
    https: false, // Set to true for local HTTPS testing
    host: true,
    allowedHosts: ['pay.sb0.tech'],
    port: 2895,
    hmr: {
      clientPort: 2895,
      host: 'localhost'
    }
  }
})
