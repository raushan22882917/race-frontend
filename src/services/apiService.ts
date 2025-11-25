/**
 * REST API Service for FastAPI backend
 */

import { API_CONFIG } from '../config/api';
import { ControlMessage } from '../types/telemetry';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Only apply timeout to GET requests (polling), not POST/PUT/DELETE (control commands)
    // Also exclude health checks from timeout (they're quick checks, not polling)
    const isPollingRequest = (!options?.method || options.method === 'GET') && 
                             !endpoint.includes('/health');
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let abortController: AbortController | null = null;
    
    // Use provided signal, or create timeout only for polling requests
    // If a signal is provided, use it directly (from usePolling hook)
    // Otherwise, create a timeout signal for polling requests only
    const signal = options?.signal || (isPollingRequest ? (() => {
      abortController = new AbortController();
      // Set 30 second timeout for polling requests (longer to handle slow responses)
      // This is a fallback timeout - usePolling will handle cancellation
      timeoutId = setTimeout(() => {
        if (abortController && !abortController.signal.aborted) {
          abortController.abort();
        }
      }, 30000);
      return abortController.signal;
    })() : undefined);
    
    try {
      const response = await fetch(url, {
        ...options,
        ...(signal && { signal }),
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      // Clear timeout if request succeeded
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        // Handle specific HTTP status codes
        if (response.status === 503) {
          const isDevelopment = import.meta.env.DEV;
          // Show the actual URL being requested
          const actualUrl = this.baseUrl ? `${this.baseUrl}${endpoint}` : endpoint;
          const envBackendUrl = import.meta.env.VITE_API_BASE_URL;
          const backendInfo = isDevelopment && !this.baseUrl
            ? `Proxied to: ${envBackendUrl || 'localhost'}${endpoint}`
            : `Backend: ${this.baseUrl || envBackendUrl || 'unknown'}`;
          
          const errorMsg = `Service Unavailable (503): The backend endpoint ${endpoint} is currently unavailable.\n\n` +
            `Possible reasons:\n` +
            `- The endpoint is temporarily overloaded\n` +
            `- The service needs to be initialized (e.g., no race data yet)\n` +
            `- The backend service for this endpoint is down\n\n` +
            `${backendInfo}\n` +
            `Mode: ${isDevelopment ? (this.baseUrl ? 'Development (direct)' : 'Development (using proxy)') : 'Production'}\n` +
            `Request URL: ${actualUrl}`;
          throw new Error(errorMsg);
        }
        if (response.status === 404) {
          throw new Error(`Not Found (404): Endpoint ${endpoint} does not exist`);
        }
        if (response.status === 403) {
          throw new Error(`Forbidden (403): Access denied to ${endpoint}`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Don't log aborted requests as errors (they're expected for polling)
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('aborted')) {
          // For polling requests, aborts are expected (timeout or cleanup from usePolling)
          // For control commands, this shouldn't happen, so log it
          if (!isPollingRequest) {
            console.error(`Control command aborted unexpectedly: ${endpoint}`, error);
          }
          // Silently rethrow abort errors for polling requests
          throw error;
        }
        // Check for CORS errors
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_INSUFFICIENT_RESOURCES')) {
          const isCorsError = error.message.includes('CORS') || error.message.includes('Access-Control');
          if (isCorsError) {
            console.error(`❌ CORS Error: Backend is not allowing requests from this origin.`, error.message);
            console.error(`   Frontend origin: ${typeof window !== 'undefined' ? window.location.origin : 'unknown'}`);
            console.error(`   Backend URL: ${this.baseUrl || 'unknown'}`);
            console.error(`   Fix: Configure backend CORS to allow: ${typeof window !== 'undefined' ? window.location.origin : 'your-frontend-origin'}`);
          } else {
            console.warn(`API request failed (network/resource issue): ${endpoint}`, error.message);
          }
        } else if (error.message.includes('503')) {
          // For 503 errors, log at warning level for polling requests (they're expected to retry)
          // But log at error level for non-polling requests
          if (isPollingRequest) {
            console.warn(`⚠️ Backend endpoint unavailable (503): ${endpoint} - Will retry on next poll`);
          } else {
            console.error(`❌ Backend endpoint unavailable (503): ${endpoint}`, error.message);
          }
        } else {
          console.error(`API request failed: ${endpoint}`, error);
        }
      } else {
        console.error(`API request failed: ${endpoint}`, error);
      }
      throw error;
    }
  }

  async healthCheck() {
    return this.request(API_CONFIG.API.HEALTH);
  }

  async getTelemetry(signal?: AbortSignal) {
    return this.request(API_CONFIG.API.TELEMETRY, { signal });
  }

  async getEndurance(signal?: AbortSignal) {
    return this.request(API_CONFIG.API.ENDURANCE, { signal });
  }

  async getEnduranceByVehicle(vehicleId: string, signal?: AbortSignal) {
    return this.request(`${API_CONFIG.API.ENDURANCE}/vehicle/${vehicleId}`, { signal });
  }

  async getLeaderboard(signal?: AbortSignal) {
    return this.request(API_CONFIG.API.LEADERBOARD, { signal });
  }

  async getLeaderboardByPosition(position: number) {
    return this.request(`${API_CONFIG.API.LEADERBOARD}/position/${position}`);
  }

  async sendControlCommand(command: ControlMessage) {
    return this.request(API_CONFIG.API.CONTROL, {
      method: 'POST',
      body: JSON.stringify(command),
    });
  }

  async getVehicles(eventName?: string) {
    const url = eventName 
      ? `${API_CONFIG.API.VEHICLES}?event_name=${encodeURIComponent(eventName)}`
      : API_CONFIG.API.VEHICLES;
    return this.request(url);
  }

  async clearVehicleCache() {
    return this.request('/api/vehicles/clear-cache', {
      method: 'POST',
    });
  }

  async getEvents() {
    return this.request('/api/events');
  }

  async startRecording(eventName?: string) {
    return this.request('/api/recording/start', {
      method: 'POST',
      body: JSON.stringify({ event_name: eventName }),
    });
  }

  async stopRecording() {
    return this.request('/api/recording/stop', {
      method: 'POST',
    });
  }

  async getRecordingStatus() {
    return this.request('/api/recording/status');
  }
}

export const apiService = new ApiService();

