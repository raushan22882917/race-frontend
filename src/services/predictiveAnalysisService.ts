/**
 * Predictive Analysis Service
 * Connects to FastAPI backend for race predictions
 * 
 * Backend URL can be configured via environment variable:
 * - VITE_API_BASE_URL (defaults to http://127.0.0.1:8000)
 */

import { API_CONFIG } from '../config/api';

// Use the same base URL as other API services (from .env or default)
const PREDICTIVE_API_BASE_URL = API_CONFIG.BASE_URL;

export interface StintSimulationRequest {
  track_name: string;
  race_session: string;
  vehicle_id: string;
  start_lap: number;
  stint_length: number;
  is_pit_stop: boolean;
}

export interface StintSimulationResponse {
  race_session: string;
  vehicle_id: string;
  start_lap: number;
  predicted_lap_times: number[];
  true_lap_times: number[];
}

export interface VehicleIdsRequest {
  track_name: string;
  race_session: string;
}

export interface VehicleIdsResponse {
  race_session: string;
  vehicle_ids: string[];
  count: number;
}

export interface LapNumbersRequest {
  track_name: string;
  race_session: string;
  vehicle_id: string;
}

export interface LapNumbersResponse {
  lap_numbers: number[];
}

export interface FinalResultsRequest {
  track_name: string;
  race_session: string;
  min_lap_time_enforced?: number;
}

export interface FinalResultsResponse {
  track_name: string;
  race_session: string;
  max_lap: number;
  min_lap_time_enforced: number;
  results: Array<{
    vehicle_id: string;
    completed_laps: number;
    total_time: number | null;
    best_lap_time: number | null;
    invalid_laps: number[];
    status: 'Finished' | 'DNF';
  }>;
}

export interface PreviousLap {
  lap: number;
  lap_time_seconds: number;
  laps_on_tires?: number;
  fuel_load_proxy?: number;
  session_air_temp?: number;
  session_track_temp?: number;
}

export interface PredictNewRaceRequest {
  track_name: string;
  vehicle_id: string;
  total_laps_to_predict: number;
  previous_laps?: PreviousLap[];
}

export interface PredictNewRaceResponse {
  track_name: string;
  vehicle_id: string;
  total_laps_to_predict: number;
  start_lap_predicted_from: number;
  predicted_laps: Array<{
    lap: number;
    lap_time_seconds: number | null;
    provided: boolean;
  }>;
  predicted_lap_times: number[];
  total_predicted_time: number;
  best_lap_time: number;
}

class PredictiveAnalysisService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = PREDICTIVE_API_BASE_URL;
  }

  async simulateStint(request: StintSimulationRequest): Promise<StintSimulationResponse> {
    const response = await fetch(`${this.baseUrl}/api/predictive/simulate-stint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getVehicleIds(request: VehicleIdsRequest): Promise<VehicleIdsResponse> {
    const response = await fetch(`${this.baseUrl}/api/predictive/get-vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      const errorMessage = error.detail || error.error || `HTTP ${response.status}`;
      
      // Provide more helpful error messages
      if (response.status === 503) {
        throw new Error('Models are still loading. Please wait a few seconds and try again.');
      } else if (response.status === 400) {
        throw new Error(errorMessage);
      } else {
        throw new Error(errorMessage);
      }
    }

    return response.json();
  }

  async getLapNumbers(request: LapNumbersRequest): Promise<LapNumbersResponse> {
    const response = await fetch(`${this.baseUrl}/api/predictive/get-laps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getFinalResults(request: FinalResultsRequest): Promise<FinalResultsResponse> {
    const response = await fetch(`${this.baseUrl}/api/predictive/get-final-results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async predictNewRaceSession(request: PredictNewRaceRequest): Promise<PredictNewRaceResponse> {
    const response = await fetch(`${this.baseUrl}/api/predictive/predict-new-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

export const predictiveAnalysisService = new PredictiveAnalysisService();

