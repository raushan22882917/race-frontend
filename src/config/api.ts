/**
 * API Configuration
 * All services run on integrated FastAPI server (port 8001)
 * Using REST API with polling for real-time data streaming
 * 
 * Backend URL can be configured via environment variable:
 * - VITE_API_BASE_URL (defaults to http://127.0.0.1:8001/)
 */

// Get base URL from environment variable (.env file)
// Vite automatically loads .env file variables into import.meta.env
const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  // If VITE_API_BASE_URL is set, use it
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    const url = envUrl.trim().replace(/\/$/, '');
    
    // Check if it's a localhost URL
    const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
    
    if (isDevelopment && isLocalhost) {
      // For localhost in development, use proxy (empty string) to avoid CORS
      console.log('🔧 Development mode: Using proxy for localhost backend');
      return '';
    } else {
      // For deployed URLs or production, use the URL directly
      console.log(`✅ Using API Base URL from .env: ${url}`);
      return url;
    }
  }
  
  // Fallback: In development without env var, use proxy for localhost
  if (isDevelopment) {
    console.log('🔧 Development mode: Using proxy (no VITE_API_BASE_URL set)');
    return '';
  }
  
  // Fallback default for production
  console.warn('⚠️ VITE_API_BASE_URL not found in .env, using default port 8001');
  return 'http://127.0.0.1:8001';
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
    VEHICLES: '/api/vehicles',
    
    // Post-Event Analysis
    ANALYSIS: {
      RACE_STORY: '/api/analysis/race-story',
      SECTOR_COMPARISON: '/api/analysis/sector-comparison',
      DRIVER_INSIGHTS: '/api/analysis/driver',
    },
    
    // Driver Training & Insights
    DRIVER: {
      RACING_LINE: '/api/driver',
      BRAKING: '/api/driver',
      CORNERING: '/api/driver',
      IMPROVEMENTS: '/api/driver',
    },
    
    // Real-Time Analytics
    REALTIME: {
      GAPS: '/api/realtime/gaps',
      PIT_WINDOW: '/api/realtime/pit-window',
      STRATEGY: '/api/realtime/strategy',
      TIRE_DEGRADATION: '/api/realtime/tire-degradation',
      STRATEGY_INSIGHTS: '/api/realtime/strategy-insights',
    },
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
    .then(async (res) => {
      if (res.ok) {
        try {
          const data = await res.json();
          console.log(`   ✅ Backend server is reachable:`, data);
        } catch {
          const text = await res.text();
          console.log(`   ✅ Backend server is reachable (status: ${res.status})`);
        }
      } else {
        const text = await res.text();
        console.warn(`   ⚠️ Backend server returned ${res.status}: ${text}`);
      }
    })
    .catch(err => {
      console.warn(`   ⚠️ Backend server appears unreachable at ${API_CONFIG.BASE_URL || '(proxy)'}:`, err.message);
      console.warn(`   Make sure the FastAPI server is running`);
    });
}

console.log(`   To configure, set environment variables in .env file:`);
console.log(`   - VITE_API_BASE_URL=https://your-backend-url.com`);

