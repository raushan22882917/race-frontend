import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Get backend URL from environment variable
  const backendUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

  return {
  plugins: [react()],
  server: {
    host: 'localhost', // Explicitly use localhost
    port: 3000,
    open: true,
    // Proxy API requests to backend to avoid CORS issues in development
    // Uses VITE_API_BASE_URL from .env file (defaults to http://127.0.0.1:8000)
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: false, // Set to false for localhost, true for HTTPS
        // Keep the /api prefix - don't rewrite
        // Example: /api/endurance -> http://127.0.0.1:8000/api/endurance
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // Silent error handling
          });
        },
      },
    },
  },
  resolve: {
    // Ensure React is resolved correctly
    alias: {
      // Explicitly resolve React for ESM compatibility
    },
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    esbuildOptions: {
      target: 'es2020'
    }
  }
  };
})

