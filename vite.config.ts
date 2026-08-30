import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // The existing public/manifest.json (already linked from index.html) is kept
      // exactly as-is — this only adds the one piece that was missing: a real
      // service worker, so the app is actually installable with offline app-shell
      // support instead of just having manifest metadata with nothing behind it.
      manifest: false,
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // Precache only the built app shell (JS/CSS/HTML/fonts/icons) — never API
        // responses. This is a live multi-tenant restaurant platform (orders,
        // stock, payments, realtime) where serving stale data would be actively
        // harmful, not just stale; offline support should only mean "the app
        // shell loads", never "yesterday's menu/orders look current".
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallbackDenylist: [/^\/functions\//],
        runtimeCaching: [
          {
            // Every Supabase call (REST, Auth, Edge Functions, Realtime) always
            // goes to the network — orders, menu, payments, and auth must never
            // be answered from a cache.
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'animation': ['framer-motion'],
          'supabase': ['@supabase/supabase-js'],
          'icons': ['lucide-react'],
        },
      },
    },
  },
});
