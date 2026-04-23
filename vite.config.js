// vite.config.js
import crossOriginIsolation from 'vite-plugin-cross-origin-isolation'

export default {
  plugins: [
    crossOriginIsolation()
  ],
  optimizeDeps: {
    exclude: ['stockfish']
  }
}