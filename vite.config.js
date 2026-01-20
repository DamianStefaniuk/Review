import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  // Environment variables starting with VITE_ are automatically exposed
  // VITE_GIST_ID and VITE_GIST_TOKEN will be available via import.meta.env
  envPrefix: 'VITE_'
})
