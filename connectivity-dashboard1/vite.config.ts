import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Plotly (used only by the Analytics route) is by far the largest
    // dependency; keep it in its own chunk so the initial bundle does not
    // pay for it.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'plotly', test: /[\\/]node_modules[\\/](plotly\.js|react-plotly\.js)[\\/]/ },
            { name: 'leaflet', test: /[\\/]node_modules[\\/]leaflet[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
