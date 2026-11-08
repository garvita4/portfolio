import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: 'src/main.ts',
      output: {
        format: 'iife',
        name: 'Portfolio',
        entryFileNames: 'bundle.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'bundle.css'
          }
          return 'assets/[name].[ext]'
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})
