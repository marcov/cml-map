import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'CML Map',
        short_name: 'CML Map',
        description: 'CML Realtime Map',
        theme_color: '#ffffff',
        // TODO: Add actual icons here (e.g., pwa-192x192.png, pwa-512x512.png)
        // icons: [
        //   {
        //     src: 'pwa-192x192.png',
        //     sizes: '192x192',
        //     type: 'image/png'
        //   },
        //   {
        //     src: 'pwa-512x512.png',
        //     sizes: '512x512',
        //     type: 'image/png'
        //   },
        //   {
        //     src: 'pwa-512x512.png',
        //     sizes: '512x512',
        //     type: 'image/png',
        //     purpose: 'any maskable'
        //   }
        // ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,ts}']
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://www.centrometeolombardo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
