/**
 * API Configuration
 * All services run on integrated FastAPI server (port 8000)
 * Using REST API with polling for real-time data streaming
 * 
 * Backend URL can be configured via environment variable:
 * - VITE_API_BASE_URL (defaults to http://127.0.0.1:8000/)
 */

// Get base URL from environment variable or use default
const getBaseUrl = (): string => {
  // Vite uses import.meta.env for environment variables
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    // Remove trailing slash if present
    return envUrl.trim().replace(/\/$/, '');
  }
  // Default to localhost:8000
  // This ensures consistent hostname between frontend (localhost:3000) and backend (localhost:8000)
  return 'http://127.0.0.1:8000/';
};

const BASE_URL = getBaseUrl();

export const API_CONFIG = {
  // Integrated FastAPI server URL (all services on one port)
  BASE_URL,
  
  // REST API endpoints - primary method for data access
  API: {
    HEALTH: '/api/health',
    TELEMETRY: '/api/telemetry',
    ENDURANCE: '/api/endurance',
    LEADERBOARD: '/api/leaderboard',
    CONTROL: '/api/control',
  },
};

// Log the configured backend URL on startup
console.log('🔌 Backend API Configuration:');
console.log(`   Base URL: ${API_CONFIG.BASE_URL}`);
console.log(`   Frontend URL: ${typeof window !== 'undefined' ? window.location.origin : 'N/A (SSR)'}`);
console.log(`   Using REST API with polling for real-time streaming`);
console.log(`   REST API Endpoints:`);
console.log(`   - Telemetry: ${API_CONFIG.BASE_URL}${API_CONFIG.API.TELEMETRY} (polling: 100ms)`);
console.log(`   - Endurance: ${API_CONFIG.BASE_URL}${API_CONFIG.API.ENDURANCE} (polling: 500ms)`);
console.log(`   - Leaderboard: ${API_CONFIG.BASE_URL}${API_CONFIG.API.LEADERBOARD} (polling: 1000ms)`);
console.log(`   - Control: ${API_CONFIG.BASE_URL}${API_CONFIG.API.CONTROL}`);

// Test if backend is reachable
if (typeof window !== 'undefined') {
  fetch(`${API_CONFIG.BASE_URL}/api/health`)
    .then(res => res.json())
    .then(data => {
      console.log(`   ✅ Backend server is reachable:`, data);
    })
    .catch(err => {
      console.warn(`   ⚠️ Backend server appears unreachable at ${API_CONFIG.BASE_URL}:`, err.message);
      console.warn(`   Make sure the FastAPI server is running`);
    });
}

console.log(`   To configure, set environment variables in .env file:`);
console.log(`   - VITE_API_BASE_URL=https://your-backend-url.com`);

