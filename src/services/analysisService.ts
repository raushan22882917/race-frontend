/**
 * Analysis Service - Post-Event Analysis, Driver Insights, Real-Time Analytics
 */

import { API_CONFIG } from '../config/api';

class AnalysisService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Ensure endpoint starts with / if baseUrl ends with /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl.replace(/\/$/, '')}${cleanEndpoint}`;
    
    try {
      console.log(`🔍 API Request: ${url}`);
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error [${response.status}]: ${url}`);
        console.error(`Response: ${errorText.substring(0, 500)}`);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0, 200)}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // ==================== POST-EVENT ANALYSIS ====================
  
  async getRaceStory() {
    return this.request(API_CONFIG.API.ANALYSIS.RACE_STORY);
  }

  async getSectorComparison() {
    return this.request(API_CONFIG.API.ANALYSIS.SECTOR_COMPARISON);
  }

  async getDriverInsights(vehicleId: string) {
    return this.request(`${API_CONFIG.API.ANALYSIS.DRIVER_INSIGHTS}/${vehicleId}`);
  }

  async getPostEventAnalysis(trackName: string, raceSession: string, minLapTime?: number) {
    return this.request('/api/analysis/post-event', {
      method: 'POST',
      body: JSON.stringify({
        track_name: trackName,
        race_session: raceSession,
        min_lap_time: minLapTime || 25.0
      })
    });
  }

  // ==================== DRIVER TRAINING & INSIGHTS ====================
  
  async getRacingLineComparison(vehicleId: string, lap1: number, lap2: number) {
    return this.request(`${API_CONFIG.API.DRIVER.RACING_LINE}/${vehicleId}/racing-line?lap1=${lap1}&lap2=${lap2}`);
  }

  async getBrakingAnalysis(vehicleId: string, lap?: number) {
    const lapParam = lap ? `?lap=${lap}` : '';
    return this.request(`${API_CONFIG.API.DRIVER.BRAKING}/${vehicleId}/braking${lapParam}`);
  }

  async getCornerAnalysis(vehicleId: string, lap?: number) {
    const lapParam = lap ? `?lap=${lap}` : '';
    return this.request(`${API_CONFIG.API.DRIVER.CORNERING}/${vehicleId}/cornering${lapParam}`);
  }

  async getImprovementOpportunities(vehicleId: string) {
    return this.request(`${API_CONFIG.API.DRIVER.IMPROVEMENTS}/${vehicleId}/improvements`);
  }

  async getSpeedTraceComparison(vehicleId: string, lap1: number, lap2: number) {
    return this.request(`${API_CONFIG.API.DRIVER.RACING_LINE}/${vehicleId}/speed-trace?lap1=${lap1}&lap2=${lap2}`);
  }

  async getBestWorstLapAnalysis(vehicleId: string) {
    return this.request(`${API_CONFIG.API.DRIVER.RACING_LINE}/${vehicleId}/best-worst`);
  }

  async getAIDriverInsights(vehicleId: string) {
    return this.request(`${API_CONFIG.API.DRIVER.RACING_LINE}/${vehicleId}/ai-insights`);
  }

  async getSectorAIAnalysis(vehicleId: string, sector: string) {
    return this.request(`${API_CONFIG.API.DRIVER.RACING_LINE}/${vehicleId}/sector/${sector}/ai-analysis`);
  }

  async getPerformancePrediction(vehicleId: string, futureLaps: number = 5) {
    return this.request(`${API_CONFIG.API.DRIVER.RACING_LINE}/${vehicleId}/performance-prediction?future_laps=${futureLaps}`);
  }

  async getOptimalRacingLine(vehicleId: string, lapNumbers?: string, segmentSize: number = 50, smoothWindow: number = 3, includeTelemetry: boolean = false) {
    const params = new URLSearchParams();
    if (lapNumbers) params.append('lap_numbers', lapNumbers);
    params.append('segment_size', segmentSize.toString());
    params.append('smooth_window', smoothWindow.toString());
    params.append('include_telemetry', includeTelemetry.toString());
    return this.request(`${API_CONFIG.API.DRIVER.RACING_LINE}/${vehicleId}/optimal-racing-line?${params.toString()}`);
  }

  async getTrainingPlan(vehicleId: string) {
    return this.request(`${API_CONFIG.API.DRIVER.RACING_LINE}/${vehicleId}/training-plan`);
  }

  async getSectorPrediction(vehicleId: string, sector: string, futureLaps: number = 5) {
    return this.request(`${API_CONFIG.API.DRIVER.RACING_LINE}/${vehicleId}/sector/${sector}/prediction?future_laps=${futureLaps}`);
  }

  // ==================== REAL-TIME ANALYTICS ====================
  
  async getRealTimeGaps(timestamp?: string) {
    const timestampParam = timestamp ? `?timestamp=${timestamp}` : '';
    return this.request(`${API_CONFIG.API.REALTIME.GAPS}${timestampParam}`);
  }

  async getPitWindowAnalysis(vehicleId: string, currentLap: number, totalLaps: number = 27) {
    return this.request(`${API_CONFIG.API.REALTIME.PIT_WINDOW}/${vehicleId}?current_lap=${currentLap}&total_laps=${totalLaps}`);
  }

  async getStrategySimulation(vehicleId: string, pitLap: number, pitTime: number = 25.0, totalLaps: number = 27) {
    return this.request(`${API_CONFIG.API.REALTIME.STRATEGY}/${vehicleId}?pit_lap=${pitLap}&pit_time=${pitTime}&total_laps=${totalLaps}`);
  }

  async getTireDegradation(vehicleId: string) {
    return this.request(`${API_CONFIG.API.REALTIME.TIRE_DEGRADATION}/${vehicleId}`);
  }

  async getStrategyInsights(vehicleId: string, currentLap: number = 15, totalLaps: number = 27, pitLap: number = 15, pitTime: number = 25.0) {
    return this.request(`${API_CONFIG.API.REALTIME.STRATEGY_INSIGHTS}/${vehicleId}?current_lap=${currentLap}&total_laps=${totalLaps}&pit_lap=${pitLap}&pit_time=${pitTime}`);
  }

  // ==================== PREDICTIVE MODEL FOR REAL-TIME ====================
  
  async getPredictNextLaps(vehicleId: string, currentLap: number, lapsAhead: number = 5, trackName: string = 'Barber', raceSession: string = 'R1') {
    return this.request(`/api/realtime/predict-next-laps/${vehicleId}?current_lap=${currentLap}&laps_ahead=${lapsAhead}&track_name=${trackName}&race_session=${raceSession}`);
  }

  async getOptimalPitTimingPredictive(vehicleId: string, currentLap: number, totalLaps: number = 27, trackName: string = 'Barber', raceSession: string = 'R1') {
    return this.request(`/api/realtime/optimal-pit-timing/${vehicleId}?current_lap=${currentLap}&total_laps=${totalLaps}&track_name=${trackName}&race_session=${raceSession}`);
  }

  async getStrategyComparisonPredictive(request: {
    vehicleId: string;
    currentLap: number;
    totalLaps: number;
    trackName?: string;
    raceSession?: string;
    pitLap?: number;
  }) {
    return this.request('/api/realtime/strategy-comparison-predictive', {
      method: 'POST',
      body: JSON.stringify({
        vehicle_id: request.vehicleId,
        current_lap: request.currentLap,
        total_laps: request.totalLaps,
        track_name: request.trackName || 'Barber',
        race_session: request.raceSession || 'R1',
        pit_lap: request.pitLap || request.currentLap + 10
      })
    });
  }

  // ==================== VEHICLE INFO ====================
  
  async getVehicles() {
    return this.request('/api/vehicles');
  }
}

export const analysisService = new AnalysisService();

