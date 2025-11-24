import { useState, useEffect, useMemo } from 'react';
import { analysisService } from '../services/analysisService';
import { predictiveAnalysisService } from '../services/predictiveAnalysisService';
import { useTelemetryStore } from '../store/telemetryStore';
import { DriverSidebar } from '../components/DriverSidebar';
import { 
  Brain, Target, TrendingUp, AlertTriangle, CheckCircle, Loader2,
  BarChart3, Zap, Gauge, Award, ArrowUp, ArrowDown, Clock, 
  Activity, MapPin, CornerUpRight, Square, PlayCircle, LineChart,
  ChevronRight, AlertCircle, TrendingDown, Sparkles, Layers, ChevronDown, Timer, Calendar
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Racing Line Visualization Component
function RacingLineVisualization({ 
  lap1Coords, 
  lap2Coords, 
  deviations,
  showOptimalLine,
  showDriverLine,
  showDeviationHeatmap,
  lap1Label,
  lap2Label
}: {
  lap1Coords: Array<{ lat: number; lon: number; time?: string }>;
  lap2Coords: Array<{ lat: number; lon: number; time?: string }>;
  deviations?: Array<{ lat: number; lon: number; deviation_meters: number }>;
  showOptimalLine: boolean;
  showDriverLine: boolean;
  showDeviationHeatmap: boolean;
  lap1Label?: string;
  lap2Label?: string;
}) {
  // Calculate bounds and scale for SVG
  const allCoords = [...lap1Coords, ...lap2Coords];
  
  if (allCoords.length === 0) {
    return (
      <div className="h-64 bg-[#1a242a] rounded-lg border border-[#3b4b54] flex items-center justify-center">
        <p className="text-[#9db0b9] text-sm text-center">
          No GPS coordinates available for visualization
        </p>
      </div>
    );
  }

  const minLat = Math.min(...allCoords.map(c => c.lat));
  const maxLat = Math.max(...allCoords.map(c => c.lat));
  const minLon = Math.min(...allCoords.map(c => c.lon));
  const maxLon = Math.max(...allCoords.map(c => c.lon));

  const latRange = maxLat - minLat || 0.001;
  const lonRange = maxLon - minLon || 0.001;
  
  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 400;
  const padding = 20;
  const width = svgWidth - padding * 2;
  const height = svgHeight - padding * 2;

  // Scale functions
  const scaleX = (lon: number) => padding + ((lon - minLon) / lonRange) * width;
  const scaleY = (lat: number) => padding + height - ((lat - minLat) / latRange) * height;

  // Convert coordinates to SVG path
  const coordsToPath = (coords: Array<{ lat: number; lon: number }>) => {
    if (coords.length === 0) return '';
    const points = coords.map(c => `${scaleX(c.lon)},${scaleY(c.lat)}`).join(' ');
    return `M ${points}`;
  };

  // Get deviation color
  const getDeviationColor = (deviation: number) => {
    if (deviation < 5) return '#10b981'; // Green - small deviation
    if (deviation < 15) return '#f59e0b'; // Yellow - medium deviation
    return '#ef4444'; // Red - large deviation
  };

  return (
    <div className="h-96 bg-[#1a242a] rounded-lg border border-[#3b4b54] overflow-hidden">
      <svg width={svgWidth} height={svgHeight} className="w-full h-full">
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#374151" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={svgWidth} height={svgHeight} fill="#1a242a" />
        <rect width={svgWidth} height={svgHeight} fill="url(#grid)" />

        {/* Deviation heatmap */}
        {showDeviationHeatmap && deviations && deviations.length > 0 && (
          <g opacity="0.6">
            {deviations.map((dev, idx) => (
              <circle
                key={idx}
                cx={scaleX(dev.lon)}
                cy={scaleY(dev.lat)}
                r={Math.max(2, Math.min(8, dev.deviation_meters / 2))}
                fill={getDeviationColor(dev.deviation_meters)}
                stroke="#fff"
                strokeWidth="0.5"
              />
            ))}
          </g>
        )}

        {/* Lap 2 (compare lap) - shown as optimal/best line */}
        {showOptimalLine && lap2Coords.length > 0 && (
          <polyline
            points={lap2Coords.map(c => `${scaleX(c.lon)},${scaleY(c.lat)}`).join(' ')}
            fill="none"
            stroke="#00FF41"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
        )}

        {/* Lap 1 (current lap) - shown as driver's line */}
        {showDriverLine && lap1Coords.length > 0 && (
          <polyline
            points={lap1Coords.map(c => `${scaleX(c.lon)},${scaleY(c.lat)}`).join(' ')}
            fill="none"
            stroke="#00BFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
        )}

        {/* Start markers */}
        {lap1Coords.length > 0 && (
          <circle
            cx={scaleX(lap1Coords[0].lon)}
            cy={scaleY(lap1Coords[0].lat)}
            r="4"
            fill="#00BFFF"
            stroke="#fff"
            strokeWidth="1"
          />
        )}
        {lap2Coords.length > 0 && (
          <circle
            cx={scaleX(lap2Coords[0].lon)}
            cy={scaleY(lap2Coords[0].lat)}
            r="4"
            fill="#00FF41"
            stroke="#fff"
            strokeWidth="1"
          />
        )}

        {/* End markers */}
        {lap1Coords.length > 0 && (
          <circle
            cx={scaleX(lap1Coords[lap1Coords.length - 1].lon)}
            cy={scaleY(lap1Coords[lap1Coords.length - 1].lat)}
            r="3"
            fill="#00BFFF"
            stroke="#fff"
            strokeWidth="1"
            opacity="0.7"
          />
        )}
        {lap2Coords.length > 0 && (
          <circle
            cx={scaleX(lap2Coords[lap2Coords.length - 1].lon)}
            cy={scaleY(lap2Coords[lap2Coords.length - 1].lat)}
            r="3"
            fill="#00FF41"
            stroke="#fff"
            strokeWidth="1"
            opacity="0.7"
          />
        )}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 bg-[#111618]/90 backdrop-blur-sm p-3 rounded-lg border border-[#3b4b54]">
        {showDriverLine && lap1Coords.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-0.5 bg-[#00BFFF]"></div>
            <span className="text-[#9db0b9]">{lap1Label || 'Lap 1'}</span>
          </div>
        )}
        {showOptimalLine && lap2Coords.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-0.5 bg-[#00FF41]"></div>
            <span className="text-[#9db0b9]">{lap2Label || 'Lap 2'}</span>
          </div>
        )}
        {showDeviationHeatmap && deviations && deviations.length > 0 && (
          <div className="flex items-center gap-2 text-xs mt-1 pt-1 border-t border-[#3b4b54]">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
              <span className="text-[#9db0b9]">&lt;5m</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
              <span className="text-[#9db0b9]">5-15m</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
              <span className="text-[#9db0b9]">&gt;15m</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface Vehicle {
  id: string;
  name: string;
  file?: string;
  vehicle_number?: number;
  car_number?: number;
  driver_number?: number;
  has_endurance_data?: boolean;
}

interface SectorAnalysis {
  sector: string;
  averageTime: number;
  bestTime: number;
  worstTime: number;
  consistency: number;
  improvement: number;
  aiAnalysis?: any;
}

interface LapInfo {
  lapNumber: number;
  lapTime: number;
  formattedTime: string;
}

export function DriverTrainingInsights() {
  const { vehicles: telemetryVehicles, leaderboard, selectedVehicleId: storeSelectedVehicle, setSelectedVehicle: setStoreSelectedVehicle } = useTelemetryStore();
  
  // State declarations
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('overview');
  
  // Data states
  const [vehicleInfoMap, setVehicleInfoMap] = useState<Record<string, Vehicle>>({});
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [improvements, setImprovements] = useState<any>(null);
  const [bestWorst, setBestWorst] = useState<any>(null);
  const [brakingAnalysis, setBrakingAnalysis] = useState<any>(null);
  const [corneringAnalysis, setCorneringAnalysis] = useState<any>(null);
  const [optimalRacingLine, setOptimalRacingLine] = useState<any>(null);
  const [trainingPlan, setTrainingPlan] = useState<any>(null);
  const [performancePrediction, setPerformancePrediction] = useState<any>(null);
  const [sectorAnalyses, setSectorAnalyses] = useState<Record<string, SectorAnalysis>>({});
  
  // Predictive analysis state
  const [predictiveData, setPredictiveData] = useState<any>(null);
  const [selectedTrack, setSelectedTrack] = useState<string>('Barber');
  const [selectedSession, setSelectedSession] = useState<string>('R1');
  const [stintPrediction, setStintPrediction] = useState<any>(null);
  const [racePrediction, setRacePrediction] = useState<any>(null);
  
  // Lap analysis state
  const [currentLap, setCurrentLap] = useState<LapInfo | null>(null);
  const [compareLap, setCompareLap] = useState<LapInfo | null>(null);
  const [availableLaps, setAvailableLaps] = useState<LapInfo[]>([]);
  const [displayOptions, setDisplayOptions] = useState({
    optimalLine: true,
    driverLine: true,
    deviationHeatmap: true,
  });
  const [lapSelectorOpen, setLapSelectorOpen] = useState(false);
  const [racingLineComparison, setRacingLineComparison] = useState<any>(null);
  const [speedProfileData, setSpeedProfileData] = useState<any>(null);
  
  const [loading, setLoading] = useState({
    overview: false,
    lapAnalysis: false,
    sectors: false,
    racingLine: false,
    braking: false,
    cornering: false,
    training: false,
    predictive: false,
  });

  // Fetch vehicle info from API
  useEffect(() => {
    const fetchVehicleInfo = async () => {
      try {
        const response = await analysisService.getVehicles() as { vehicles?: any[] };
        const infoMap: Record<string, Vehicle> = {};
        response.vehicles?.forEach((v: any) => {
          infoMap[v.id] = {
            id: v.id,
            name: v.name,
            file: v.file,
            vehicle_number: v.vehicle_number,
            car_number: v.car_number,
            driver_number: v.driver_number,
            has_endurance_data: v.has_endurance_data
          };
        });
        setVehicleInfoMap(infoMap);
      } catch (error) {
        console.error('Failed to fetch vehicle info:', error);
      }
    };
    
    fetchVehicleInfo();
  }, []);

  // Convert telemetry store vehicles to Vehicle format
  const vehicles = useMemo<Vehicle[]>(() => {
    return Object.keys(telemetryVehicles).map(vehicleId => {
      const leaderboardEntry = leaderboard.find(e => e.vehicle_id === vehicleId);
      const apiInfo = vehicleInfoMap[vehicleId];
      return {
        id: vehicleId,
        name: leaderboardEntry?.vehicle || vehicleId,
        file: `${vehicleId}.csv`,
        vehicle_number: apiInfo?.vehicle_number,
        car_number: apiInfo?.car_number,
        driver_number: apiInfo?.driver_number,
        has_endurance_data: apiInfo?.has_endurance_data
      };
    }).sort((a, b) => a.id.localeCompare(b.id));
  }, [telemetryVehicles, leaderboard, vehicleInfoMap]);

  // Initialize selected vehicle from store
  useEffect(() => {
    if (storeSelectedVehicle && !selectedVehicle) {
      setSelectedVehicle(storeSelectedVehicle);
    }
  }, [storeSelectedVehicle, selectedVehicle]);

  // Load all data when vehicle changes
  useEffect(() => {
    if (selectedVehicle) {
      loadOverviewData();
    }
  }, [selectedVehicle]);

  // Load section-specific data when section changes
  useEffect(() => {
    if (selectedVehicle && activeSection) {
      switch (activeSection) {
        case 'lap-analysis':
          loadLapAnalysisData();
          break;
        case 'sectors':
          loadSectorAnalysis();
          break;
        case 'racing-line':
          loadRacingLineData();
          break;
        case 'braking':
          loadBrakingData();
          break;
        case 'cornering':
          loadCorneringData();
          break;
        case 'training':
          loadTrainingData();
          break;
        case 'predictive':
          loadPredictiveAnalysis();
          break;
      }
    }
  }, [selectedVehicle, activeSection]);

  // Load racing line comparison when laps change
  useEffect(() => {
    if (selectedVehicle && currentLap && compareLap && activeSection === 'lap-analysis') {
      loadRacingLineComparison();
      loadSpeedProfile();
    }
  }, [selectedVehicle, currentLap, compareLap, activeSection]);

  const loadOverviewData = async () => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, overview: true }));
    try {
      const [insights, improvementsData, bestWorstData, prediction] = await Promise.all([
        analysisService.getAIDriverInsights(selectedVehicle).catch(() => null),
        analysisService.getImprovementOpportunities(selectedVehicle).catch(() => null),
        analysisService.getBestWorstLapAnalysis(selectedVehicle).catch(() => null),
        analysisService.getPerformancePrediction(selectedVehicle, 5).catch(() => null),
      ]);
      
      setAiInsights(insights);
      setImprovements(improvementsData);
      setBestWorst(bestWorstData);
      setPerformancePrediction(prediction);
    } catch (error: any) {
      console.error('Failed to load overview data:', error);
    } finally {
      setLoading(prev => ({ ...prev, overview: false }));
    }
  };

  const loadLapAnalysisData = async () => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, lapAnalysis: true }));
    try {
      // Get both best/worst analysis and driver insights (which has all lap times)
      const [bestWorstData, driverInsights] = await Promise.all([
        analysisService.getBestWorstLapAnalysis(selectedVehicle).catch(() => null),
        analysisService.getDriverInsights(selectedVehicle).catch(() => null)
      ]);
      
      // Extract lap data from driver insights (has all lap times)
      const laps: LapInfo[] = [];
      
      // Add all available laps from driver insights lap_times
      if (driverInsights?.lap_times && Array.isArray(driverInsights.lap_times)) {
        driverInsights.lap_times.forEach((lap: any) => {
          if (lap.lap !== undefined && lap.lap_time_seconds !== undefined && lap.lap_time_seconds !== null) {
            laps.push({
              lapNumber: lap.lap,
              lapTime: lap.lap_time_seconds,
              formattedTime: formatLapTime(lap.lap_time_seconds)
            });
          }
        });
      }
      
      // Fallback: Add best and worst laps from best/worst analysis if no lap_times
      if (laps.length === 0 && bestWorstData) {
        if (bestWorstData.best_lap?.lap_number && bestWorstData.best_lap?.lap_time_seconds) {
          laps.push({
            lapNumber: bestWorstData.best_lap.lap_number,
            lapTime: bestWorstData.best_lap.lap_time_seconds,
            formattedTime: formatLapTime(bestWorstData.best_lap.lap_time_seconds)
          });
        }
        
        if (bestWorstData.worst_lap?.lap_number && bestWorstData.worst_lap?.lap_time_seconds) {
          const existingLap = laps.find(l => l.lapNumber === bestWorstData.worst_lap.lap_number);
          if (!existingLap) {
            laps.push({
              lapNumber: bestWorstData.worst_lap.lap_number,
              lapTime: bestWorstData.worst_lap.lap_time_seconds,
              formattedTime: formatLapTime(bestWorstData.worst_lap.lap_time_seconds)
            });
          }
        }
      }
      
      // Sort by lap number
      const sortedLaps = laps.sort((a, b) => a.lapNumber - b.lapNumber);
      setAvailableLaps(sortedLaps);
      
      // Set default comparison: worst vs best
      if (sortedLaps.length >= 2 && bestWorstData) {
        const bestLapNum = bestWorstData.best_lap?.lap_number;
        const worstLapNum = bestWorstData.worst_lap?.lap_number;
        
        const bestLap = bestLapNum ? sortedLaps.find(l => l.lapNumber === bestLapNum) : sortedLaps[0];
        const worstLap = worstLapNum ? sortedLaps.find(l => l.lapNumber === worstLapNum) : sortedLaps[sortedLaps.length - 1];
        
        if (bestLap && worstLap) {
          setCurrentLap(worstLap);
          setCompareLap(bestLap);
        } else if (sortedLaps.length > 0) {
          setCurrentLap(sortedLaps[0]);
          setCompareLap(sortedLaps[sortedLaps.length - 1]);
        }
      } else if (sortedLaps.length === 1) {
        setCurrentLap(sortedLaps[0]);
        setCompareLap(sortedLaps[0]);
      } else if (sortedLaps.length === 0) {
        // No laps available - show message
        setCurrentLap(null);
        setCompareLap(null);
      }
    } catch (error: any) {
      console.error('Failed to load lap analysis data:', error);
    } finally {
      setLoading(prev => ({ ...prev, lapAnalysis: false }));
    }
  };

  const loadRacingLineComparison = async () => {
    if (!selectedVehicle || !currentLap || !compareLap) return;
    setLoading(prev => ({ ...prev, lapAnalysis: true }));
    try {
      const data = await analysisService.getRacingLineComparison(
        selectedVehicle,
        currentLap.lapNumber,
        compareLap.lapNumber
      );
      setRacingLineComparison(data);
    } catch (error: any) {
      console.error('Failed to load racing line comparison:', error);
    } finally {
      setLoading(prev => ({ ...prev, lapAnalysis: false }));
    }
  };

  const loadSpeedProfile = async () => {
    if (!selectedVehicle || !currentLap || !compareLap) return;
    setLoading(prev => ({ ...prev, lapAnalysis: true }));
    try {
      const data = await analysisService.getSpeedTraceComparison(
        selectedVehicle,
        currentLap.lapNumber,
        compareLap.lapNumber
      );
      setSpeedProfileData(data);
    } catch (error: any) {
      console.error('Failed to load speed profile:', error);
    } finally {
      setLoading(prev => ({ ...prev, lapAnalysis: false }));
    }
  };

  const loadSectorAnalysis = async () => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, sectors: true }));
    try {
      const sectors = ['S1', 'S2', 'S3'];
      const sectorData: Record<string, SectorAnalysis> = {};
      
      // Also get best/worst data for sector times
      const bestWorstData = await analysisService.getBestWorstLapAnalysis(selectedVehicle).catch(() => null);
      
      for (const sector of sectors) {
        try {
          const aiAnalysis = await analysisService.getSectorAIAnalysis(selectedVehicle, sector);
          const prediction = await analysisService.getSectorPrediction(selectedVehicle, sector, 5).catch(() => null);
          
          // Extract sector times from best/worst data if available
          let bestTime = aiAnalysis?.best_time || 0;
          let worstTime = aiAnalysis?.worst_time || 0;
          let averageTime = aiAnalysis?.average_time || 0;
          
          if (bestWorstData) {
            const sectorKey = sector === 'S1' ? 'best_sector1_time' : sector === 'S2' ? 'best_sector2_time' : 'best_sector3_time';
            const worstSectorKey = sector === 'S1' ? 'worst_sector1_time' : sector === 'S2' ? 'worst_sector2_time' : 'worst_sector3_time';
            if (bestWorstData[sectorKey]) bestTime = bestWorstData[sectorKey];
            if (bestWorstData[worstSectorKey]) worstTime = bestWorstData[worstSectorKey];
          }
          
          sectorData[sector] = {
            sector,
            averageTime: averageTime || 0,
            bestTime: bestTime || 0,
            worstTime: worstTime || 0,
            consistency: aiAnalysis?.consistency_score || aiAnalysis?.consistency || 0,
            improvement: prediction?.predicted_improvement || prediction?.improvement_potential || 0,
            aiAnalysis: {
              ...aiAnalysis,
              recommendations: aiAnalysis?.recommendations || aiAnalysis?.insights?.[0]?.action || aiAnalysis?.summary,
            },
          };
        } catch (error) {
          console.error(`Failed to load sector ${sector}:`, error);
          // Set default values if sector fails to load
          sectorData[sector] = {
            sector,
            averageTime: 0,
            bestTime: 0,
            worstTime: 0,
            consistency: 0,
            improvement: 0,
          };
        }
      }
      
      setSectorAnalyses(sectorData);
    } catch (error: any) {
      console.error('Failed to load sector analysis:', error);
    } finally {
      setLoading(prev => ({ ...prev, sectors: false }));
    }
  };

  const loadRacingLineData = async () => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, racingLine: true }));
    try {
      const data = await analysisService.getOptimalRacingLine(selectedVehicle);
      setOptimalRacingLine(data);
    } catch (error: any) {
      console.error('Failed to load racing line data:', error);
    } finally {
      setLoading(prev => ({ ...prev, racingLine: false }));
    }
  };

  const loadBrakingData = async () => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, braking: true }));
    try {
      const data = await analysisService.getBrakingAnalysis(selectedVehicle);
      setBrakingAnalysis(data);
    } catch (error: any) {
      console.error('Failed to load braking analysis:', error);
    } finally {
      setLoading(prev => ({ ...prev, braking: false }));
    }
  };

  const loadCorneringData = async () => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, cornering: true }));
    try {
      const data = await analysisService.getCornerAnalysis(selectedVehicle);
      setCorneringAnalysis(data);
    } catch (error: any) {
      console.error('Failed to load cornering analysis:', error);
    } finally {
      setLoading(prev => ({ ...prev, cornering: false }));
    }
  };

  const loadTrainingData = async () => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, training: true }));
    try {
      const data = await analysisService.getTrainingPlan(selectedVehicle);
      setTrainingPlan(data);
    } catch (error: any) {
      console.error('Failed to load training plan:', error);
    } finally {
      setLoading(prev => ({ ...prev, training: false }));
    }
  };

  function formatLapTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${minutes}:${secs.padStart(6, '0')}`;
  }

  const selectedVehicleInfo = useMemo(() => {
    return vehicles.find(v => v.id === selectedVehicle);
  }, [vehicles, selectedVehicle]);

  // Calculate key metrics
  const keyMetrics = useMemo(() => {
    const bestLapTime = bestWorst?.best_lap_time || aiInsights?.summary?.best_lap_time;
    const avgLapTime = aiInsights?.summary?.average_lap_time;
    const worstLapTime = bestWorst?.worst_lap_time;
    const consistencyScore = aiInsights?.summary?.consistency_score;
    const potentialGain = bestWorst?.total_difference_seconds || 
      (bestLapTime && avgLapTime ? avgLapTime - bestLapTime : null);

    return {
      bestLap: bestLapTime ? formatLapTime(bestLapTime) : 'N/A',
      averageLap: avgLapTime ? formatLapTime(avgLapTime) : 'N/A',
      worstLap: worstLapTime ? formatLapTime(worstLapTime) : 'N/A',
      consistency: consistencyScore !== null && consistencyScore !== undefined
        ? Math.max(0, Math.min(100, Math.round(100 - (consistencyScore * 10))))
        : null,
      potentialGain: potentialGain !== null ? potentialGain.toFixed(3) : null,
      lapVariation: bestLapTime && worstLapTime ? (worstLapTime - bestLapTime).toFixed(3) : null,
    };
  }, [aiInsights, bestWorst]);

  const loadPredictiveAnalysis = async () => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, predictive: true }));
    try {
      // Try to get available vehicles for the track/session
      try {
        const vehicles = await predictiveAnalysisService.getVehicleIds({
          track_name: selectedTrack,
          race_session: selectedSession
        });
        setPredictiveData({ vehicles: vehicles.vehicle_ids });
      } catch (error) {
        console.error('Failed to load predictive vehicles:', error);
      }
    } catch (error: any) {
      console.error('Failed to load predictive analysis:', error);
    } finally {
      setLoading(prev => ({ ...prev, predictive: false }));
    }
  };

  const predictStint = async (startLap: number, stintLength: number, isPitStop: boolean = false) => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, predictive: true }));
    try {
      const result = await predictiveAnalysisService.simulateStint({
        track_name: selectedTrack,
        race_session: selectedSession,
        vehicle_id: selectedVehicle,
        start_lap: startLap,
        stint_length: stintLength,
        is_pit_stop: isPitStop
      });
      setStintPrediction(result);
    } catch (error: any) {
      console.error('Failed to predict stint:', error);
      alert(`Failed to predict stint: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, predictive: false }));
    }
  };

  const predictRace = async (totalLaps: number, previousLaps?: any[]) => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, predictive: true }));
    try {
      const result = await predictiveAnalysisService.predictNewRaceSession({
        track_name: selectedTrack,
        vehicle_id: selectedVehicle,
        total_laps_to_predict: totalLaps,
        previous_laps: previousLaps
      });
      setRacePrediction(result);
    } catch (error: any) {
      console.error('Failed to predict race:', error);
      alert(`Failed to predict race: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, predictive: false }));
    }
  };

  const TRACKS = [
    'Barber',
    'Circuit of the Americas',
    'Road America',
    'Sonoma',
    'Virginia International Raceway',
  ];

  const sections = [
    { id: 'overview', label: 'Overview', icon: Gauge, description: 'Performance summary' },
    { id: 'lap-analysis', label: 'Lap Analysis', icon: Clock, description: 'Compare laps & racing lines' },
    { id: 'sectors', label: 'Sector Analysis', icon: BarChart3, description: 'Sector-by-sector breakdown' },
    { id: 'racing-line', label: 'Racing Line', icon: Target, description: 'Optimal line optimization' },
    { id: 'braking', label: 'Braking Analysis', icon: Square, description: 'Braking points & efficiency' },
    { id: 'cornering', label: 'Cornering', icon: CornerUpRight, description: 'Cornering performance' },
    { id: 'training', label: 'Training Plan', icon: PlayCircle, description: 'Personalized training' },
    { id: 'predictive', label: 'Predictive Analysis', icon: Sparkles, description: 'ML model predictions' },
  ];

  return (
    <div className="w-full bg-[#101c22] min-h-screen flex">
      {/* Sidebar */}
      <DriverSidebar
        collapsed={sidebarCollapsed}
        onCollapseChange={setSidebarCollapsed}
        activePage="driver-training-insights"
        onPageChange={(page) => {
          console.log('Navigate to:', page);
        }}
        selectedVehicle={selectedVehicle}
        onVehicleChange={(vehicleId) => {
          setSelectedVehicle(vehicleId);
          setStoreSelectedVehicle(vehicleId);
        }}
      />
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <main className="w-full p-6 sm:p-8">
          <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
              <h1 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">
                Driver Training & Insights
              </h1>
              <p className="text-[#9db0b9] text-base font-normal leading-normal">
                Comprehensive analysis to identify areas for improvement, optimize racing lines, and enhance performance
              </p>
            </div>

            {/* Section Navigation */}
            <div className="flex flex-wrap gap-2 border-b border-[#3b4b54] pb-4">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600/20 border border-blue-500/50 text-blue-400'
                        : 'bg-[#111618] border border-[#3b4b54] text-[#9db0b9] hover:border-blue-500/50 hover:text-blue-400'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{section.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            {!selectedVehicle ? (
              <div className="text-center py-20 text-gray-400">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Please select a vehicle to view driver analytics</p>
              </div>
            ) : activeSection === 'overview' && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#111618] border border-[#3b4b54]">
                    <p className="text-gray-400 text-sm font-medium">Best Lap</p>
                    <p className="text-white text-2xl font-bold">
                      {loading.overview ? <Loader2 className="h-6 w-6 animate-spin text-blue-500" /> : keyMetrics.bestLap}
                    </p>
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4 text-[#0bda57]" />
                      <p className="text-[#0bda57] text-sm">Personal best</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#111618] border border-[#3b4b54]">
                    <p className="text-gray-400 text-sm font-medium">Average Lap</p>
                    <p className="text-white text-2xl font-bold">
                      {loading.overview ? <Loader2 className="h-6 w-6 animate-spin text-blue-500" /> : keyMetrics.averageLap}
                    </p>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-[#9db0b9]" />
                      <p className="text-[#9db0b9] text-sm">vs best: {keyMetrics.potentialGain ? `+${keyMetrics.potentialGain}s` : 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#111618] border border-[#3b4b54]">
                    <p className="text-gray-400 text-sm font-medium">Consistency</p>
                    <p className="text-white text-2xl font-bold">
                      {loading.overview ? <Loader2 className="h-6 w-6 animate-spin text-blue-500" /> : 
                        keyMetrics.consistency !== null ? `${keyMetrics.consistency}%` : 'N/A'}
                    </p>
                    <div className="flex items-center gap-1">
                      <Activity className="h-4 w-4 text-[#0bda57]" />
                      <p className="text-[#0bda57] text-sm">
                        {keyMetrics.consistency !== null && keyMetrics.consistency >= 90 ? 'Excellent' : 
                         keyMetrics.consistency !== null && keyMetrics.consistency >= 80 ? 'Good' : 'Needs work'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#111618] border border-[#3b4b54]">
                    <p className="text-gray-400 text-sm font-medium">Potential Gain</p>
                    <p className="text-white text-2xl font-bold">
                      {loading.overview ? <Loader2 className="h-6 w-6 animate-spin text-blue-500" /> : 
                        keyMetrics.potentialGain ? `-${keyMetrics.potentialGain}s` : 'N/A'}
                    </p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-[#0bda57]" />
                      <p className="text-[#0bda57] text-sm">vs optimal</p>
                    </div>
                  </div>
                </div>

                {/* AI Patterns */}
                {aiInsights?.patterns && aiInsights.patterns.length > 0 && (
                  <div className="rounded-xl bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/50 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="h-6 w-6 text-purple-400" />
                      <h2 className="text-xl font-bold text-white">AI-Detected Patterns</h2>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                        {aiInsights.patterns.length} patterns
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aiInsights.patterns.map((pattern: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-lg bg-[#1a242a] border border-purple-500/30">
                          <div className="flex items-start gap-2 mb-2">
                            <Activity className="h-5 w-5 text-purple-400 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="text-white font-semibold text-sm">{pattern.type || 'Driver Pattern'}</h4>
                              <p className="text-[#9db0b9] text-xs mt-1">{pattern.description}</p>
                              {pattern.implication && (
                                <p className="text-[#9db0b9] text-xs mt-1 italic">Implication: {pattern.implication}</p>
                              )}
                              {pattern.recommendation && (
                                <p className="text-blue-400 text-xs mt-2">💡 {pattern.recommendation}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Insights & Recommendations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* AI Insights */}
                  <div className="rounded-xl bg-[#111618] border border-[#3b4b54] p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Brain className="h-6 w-6 text-blue-400" />
                      <h2 className="text-xl font-bold text-white">AI-Powered Insights</h2>
                      {aiInsights?.summary && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          {aiInsights.summary.total_insights || 0} insights
                        </span>
                      )}
                    </div>
                    {loading.overview ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      </div>
                    ) : aiInsights?.insights && aiInsights.insights.length > 0 ? (
                      <div className="space-y-3">
                        {aiInsights.insights.slice(0, 5).map((insight: any, idx: number) => {
                          const IconComponent = insight.severity === 'high' 
                            ? AlertTriangle 
                            : insight.severity === 'medium'
                            ? AlertCircle
                            : CheckCircle;
                          const iconColor = insight.severity === 'high' 
                            ? 'text-[#fa5f38]' 
                            : insight.severity === 'medium'
                            ? 'text-[#FFC107]'
                            : 'text-[#0bda57]';
                          
                          return (
                            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-[#1a242a] border border-[#3b4b54] hover:border-blue-500/50 transition-colors">
                              <IconComponent className={`text-xl ${iconColor} mt-1 flex-shrink-0`} />
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-1">
                                  <h3 className="font-semibold text-white text-sm">{insight.title}</h3>
                                  {insight.category && (
                                    <span className="px-2 py-0.5 bg-[#3b4b54] text-[#9db0b9] text-xs rounded">
                                      {insight.category}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[#9db0b9] text-xs mt-1">{insight.description}</p>
                                {insight.action && (
                                  <p className="text-blue-400 text-xs mt-2 font-medium">💡 {insight.action}</p>
                                )}
                                {insight.potential_gain && (
                                  <p className="text-[#0bda57] text-xs mt-2 font-semibold">
                                    Potential: {insight.potential_gain}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No AI insights available</p>
                      </div>
                    )}
                  </div>

                  {/* Improvement Opportunities */}
                  <div className="rounded-xl bg-[#111618] border border-[#3b4b54] p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <TrendingUp className="h-6 w-6 text-[#0bda57]" />
                      <h2 className="text-xl font-bold text-white">AI Improvement Opportunities</h2>
                      {improvements?.improvement_opportunities && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                          {improvements.improvement_opportunities.length} opportunities
                        </span>
                      )}
                    </div>
                    {loading.overview ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      </div>
                    ) : improvements?.improvement_opportunities && improvements.improvement_opportunities.length > 0 ? (
                      <div className="space-y-3">
                        {improvements.improvement_opportunities.slice(0, 5).map((opp: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-lg bg-[#1a242a] border border-[#3b4b54] hover:border-green-500/50 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h3 className="font-semibold text-white text-sm">{opp.sector || opp.title || 'Improvement Opportunity'}</h3>
                                {opp.best_lap && opp.worst_lap && (
                                  <span className="text-[#9db0b9] text-xs mt-1 block">
                                    Best: Lap {opp.best_lap} | Worst: Lap {opp.worst_lap}
                                  </span>
                                )}
                              </div>
                              {opp.improvement_potential_seconds && (
                                <span className="text-[#0bda57] text-xs font-semibold ml-2">
                                  -{opp.improvement_potential_seconds.toFixed(3)}s
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                              {opp.best_time && (
                                <div>
                                  <p className="text-[#9db0b9]">Best Time</p>
                                  <p className="text-white font-semibold">{formatLapTime(opp.best_time)}</p>
                                </div>
                              )}
                              {opp.worst_time && (
                                <div>
                                  <p className="text-[#9db0b9]">Worst Time</p>
                                  <p className="text-white font-semibold">{formatLapTime(opp.worst_time)}</p>
                                </div>
                              )}
                              {opp.average && (
                                <div>
                                  <p className="text-[#9db0b9]">Average</p>
                                  <p className="text-white">{formatLapTime(opp.average)}</p>
                                </div>
                              )}
                              {opp.consistency !== undefined && (
                                <div>
                                  <p className="text-[#9db0b9]">Consistency</p>
                                  <p className="text-white">{opp.consistency.toFixed(3)}s std</p>
                                </div>
                              )}
                            </div>
                            {improvements?.recommendations && idx < 2 && (
                              <p className="text-blue-400 text-xs mt-2 font-medium">
                                💡 {improvements.recommendations[idx]}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No improvement opportunities found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Prediction */}
                {performancePrediction && (
                  <div className="rounded-xl bg-[#111618] border border-[#3b4b54] p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <LineChart className="h-6 w-6 text-purple-400" />
                      <h2 className="text-xl font-bold text-white">Performance Prediction</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                        <p className="text-gray-400 text-xs mb-1">Next Lap Prediction</p>
                        <p className="text-white text-lg font-bold">
                          {performancePrediction.next_lap_prediction ? formatLapTime(performancePrediction.next_lap_prediction) : 'N/A'}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                        <p className="text-gray-400 text-xs mb-1">Trend</p>
                        <div className="flex items-center gap-2">
                          {performancePrediction.trend === 'improving' ? (
                            <>
                              <ArrowDown className="h-4 w-4 text-[#0bda57]" />
                              <p className="text-[#0bda57] text-sm font-semibold">Improving</p>
                            </>
                          ) : performancePrediction.trend === 'declining' ? (
                            <>
                              <ArrowUp className="h-4 w-4 text-[#fa5f38]" />
                              <p className="text-[#fa5f38] text-sm font-semibold">Declining</p>
                            </>
                          ) : (
                            <>
                              <Activity className="h-4 w-4 text-[#9db0b9]" />
                              <p className="text-[#9db0b9] text-sm font-semibold">Stable</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                        <p className="text-gray-400 text-xs mb-1">Confidence</p>
                        <p className="text-white text-lg font-bold">
                          {performancePrediction.confidence ? `${Math.round(performancePrediction.confidence * 100)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!selectedVehicle ? null : activeSection === 'lap-analysis' && (
              <div className="space-y-6">
                {/* Lap Comparison Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-[#111618] border border-[#3b4b54]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-[#00BFFF]"></div>
                      <div className="flex flex-col">
                        <p className="text-[#9db0b9] text-xs">Current Lap</p>
                        <p className="text-white text-sm font-medium">
                          {currentLap ? `Lap ${currentLap.lapNumber} (${currentLap.formattedTime})` : 'Select lap...'}
                        </p>
                      </div>
                    </div>
                    <div className="w-px h-8 bg-[#3b4b54]"></div>
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-[#00FF41]"></div>
                      <div className="flex flex-col">
                        <p className="text-[#9db0b9] text-xs">Compare With</p>
                        <p className="text-white text-sm font-medium">
                          {compareLap ? `Lap ${compareLap.lapNumber} (${compareLap.formattedTime})` : 'Select lap...'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setLapSelectorOpen(!lapSelectorOpen)}
                    className="text-[#13a4ec] text-sm font-medium hover:underline"
                  >
                    Change Laps
                  </button>
                </div>

                {/* Lap Selector */}
                {lapSelectorOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-[#111618] border border-[#3b4b54]">
                    <div>
                      <label className="block text-sm font-medium text-[#9db0b9] mb-2">Current Lap</label>
                      {availableLaps.length > 0 ? (
                        <select
                          value={currentLap?.lapNumber || ''}
                          onChange={(e) => {
                            const lap = availableLaps.find(l => l.lapNumber === parseInt(e.target.value));
                            if (lap) setCurrentLap(lap);
                          }}
                          className="w-full px-3 py-2 bg-[#1a242a] border border-[#3b4b54] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a lap...</option>
                          {availableLaps.map(lap => (
                            <option key={lap.lapNumber} value={lap.lapNumber}>
                              Lap {lap.lapNumber} - {lap.formattedTime}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-3 py-2 bg-[#1a242a] border border-[#3b4b54] rounded-lg text-[#9db0b9] text-sm">
                          {loading.lapAnalysis ? 'Loading laps...' : 'No laps available'}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#9db0b9] mb-2">Compare With</label>
                      {availableLaps.length > 0 ? (
                        <select
                          value={compareLap?.lapNumber || ''}
                          onChange={(e) => {
                            const lap = availableLaps.find(l => l.lapNumber === parseInt(e.target.value));
                            if (lap) setCompareLap(lap);
                          }}
                          className="w-full px-3 py-2 bg-[#1a242a] border border-[#3b4b54] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a lap...</option>
                          {availableLaps.map(lap => (
                            <option key={lap.lapNumber} value={lap.lapNumber}>
                              Lap {lap.lapNumber} - {lap.formattedTime}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-3 py-2 bg-[#1a242a] border border-[#3b4b54] rounded-lg text-[#9db0b9] text-sm">
                          {loading.lapAnalysis ? 'Loading laps...' : 'No laps available'}
                        </div>
                      )}
                    </div>
                    {availableLaps.length === 0 && !loading.lapAnalysis && (
                      <div className="col-span-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <p className="text-yellow-400 text-sm">
                          ⚠️ No lap data available. Make sure the vehicle has completed laps in the race.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Display Options */}
                <div className="relative">
                  <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer list-none rounded-lg bg-[#111618] border border-[#3b4b54] px-4 py-3 hover:bg-[#1a242a] transition-colors">
                      <Layers className="h-5 w-5 text-white" />
                      <span className="text-white text-sm font-medium">Display Options</span>
                      <ChevronDown className={`h-5 w-5 text-[#9db0b9] transition-transform ${lapSelectorOpen ? 'rotate-180' : ''}`} />
                    </summary>
                    <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-[#111618] border border-[#3b4b54] shadow-lg z-10 p-3 space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={displayOptions.optimalLine}
                          onChange={(e) => setDisplayOptions({ ...displayOptions, optimalLine: e.target.checked })}
                          className="form-checkbox bg-[#1a242a] border-[#3b4b54] rounded text-[#00FF41] focus:ring-[#00FF41]"
                        />
                        <span className="text-[#e0e0e0] text-sm">Optimal Line</span>
                        <div className="w-4 h-0.5 bg-[#00FF41] ml-auto"></div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={displayOptions.driverLine}
                          onChange={(e) => setDisplayOptions({ ...displayOptions, driverLine: e.target.checked })}
                          className="form-checkbox bg-[#1a242a] border-[#3b4b54] rounded text-[#00BFFF] focus:ring-[#00BFFF]"
                        />
                        <span className="text-[#e0e0e0] text-sm">Driver's Line</span>
                        <div className="w-4 h-0.5 bg-[#00BFFF] ml-auto"></div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={displayOptions.deviationHeatmap}
                          onChange={(e) => setDisplayOptions({ ...displayOptions, deviationHeatmap: e.target.checked })}
                          className="form-checkbox bg-[#1a242a] border-[#3b4b54] rounded text-[#FF0000] focus:ring-[#FF0000]"
                        />
                        <span className="text-[#e0e0e0] text-sm">Deviation Heatmap</span>
                        <div className="w-4 h-4 rounded-sm ml-auto bg-gradient-to-r from-yellow-400 to-[#FF0000]"></div>
                      </label>
                    </div>
                  </details>
                </div>

                {/* Track Visualization */}
                <div className="grid grid-rows-3 gap-6">
                  <div className="row-span-2 w-full bg-center bg-no-repeat bg-contain rounded-xl bg-[#111618] border border-[#3b4b54] flex items-center justify-center min-h-[400px]">
                    {loading.lapAnalysis ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-[#13a4ec]" />
                        <p className="text-[#9db0b9]">Loading track visualization...</p>
                      </div>
                    ) : racingLineComparison ? (
                      <div className="w-full h-full p-6 space-y-4">
                        {racingLineComparison.lap1_coordinates && racingLineComparison.lap2_coordinates && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="p-3 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                              <p className="text-[#9db0b9] text-xs mb-1">Lap {currentLap?.lapNumber} Points</p>
                              <p className="text-white text-sm font-semibold">{racingLineComparison.lap1_coordinates.length} GPS points</p>
                            </div>
                            <div className="p-3 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                              <p className="text-[#9db0b9] text-xs mb-1">Lap {compareLap?.lapNumber} Points</p>
                              <p className="text-white text-sm font-semibold">{racingLineComparison.lap2_coordinates.length} GPS points</p>
                            </div>
                          </div>
                        )}
                        {racingLineComparison.average_deviation !== undefined && (
                          <div className="p-3 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                            <p className="text-[#9db0b9] text-xs mb-1">Average Deviation</p>
                            <p className="text-white text-sm font-semibold">{racingLineComparison.average_deviation.toFixed(2)} meters</p>
                          </div>
                        )}
                        <RacingLineVisualization 
                          lap1Coords={racingLineComparison.lap1_coordinates || []}
                          lap2Coords={racingLineComparison.lap2_coordinates || []}
                          deviations={racingLineComparison.deviations || []}
                          showOptimalLine={displayOptions.optimalLine}
                          showDriverLine={displayOptions.driverLine}
                          showDeviationHeatmap={displayOptions.deviationHeatmap}
                          lap1Label={currentLap ? `Lap ${currentLap.lapNumber}` : 'Lap 1'}
                          lap2Label={compareLap ? `Lap ${compareLap.lapNumber}` : 'Lap 2'}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <AlertCircle className="h-12 w-12 text-[#9db0b9] opacity-50" />
                        <p className="text-[#9db0b9]">Select laps to view racing line comparison</p>
                      </div>
                    )}
                  </div>

                  {/* Speed Profile */}
                  <div className="row-span-1 bg-[#111618] rounded-xl p-4 border border-[#3b4b54] flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-semibold text-white">Speed Profile</h3>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-0.5 bg-[#00FF41]"></div>
                          <span className="text-[#9db0b9]">Best Lap</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-0.5 bg-[#00BFFF]"></div>
                          <span className="text-[#9db0b9]">Current Lap</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 w-full bg-center bg-no-repeat bg-contain flex items-center justify-center min-h-[150px]">
                      {loading.lapAnalysis ? (
                        <Loader2 className="h-6 w-6 animate-spin text-[#13a4ec]" />
                      ) : speedProfileData ? (
                        <div className="w-full h-full space-y-2">
                          {speedProfileData.lap1_speeds && speedProfileData.lap2_speeds && (
                            <>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2 rounded bg-[#1a242a] border border-[#3b4b54]">
                                  <p className="text-[#9db0b9]">Lap {currentLap?.lapNumber} Avg</p>
                                  <p className="text-white font-semibold">
                                    {speedProfileData.lap1_speeds.length > 0 
                                      ? `${(speedProfileData.lap1_speeds.reduce((a: number, b: number) => a + b, 0) / speedProfileData.lap1_speeds.length).toFixed(1)} km/h`
                                      : 'N/A'}
                                  </p>
                                </div>
                                <div className="p-2 rounded bg-[#1a242a] border border-[#3b4b54]">
                                  <p className="text-[#9db0b9]">Lap {compareLap?.lapNumber} Avg</p>
                                  <p className="text-white font-semibold">
                                    {speedProfileData.lap2_speeds.length > 0
                                      ? `${(speedProfileData.lap2_speeds.reduce((a: number, b: number) => a + b, 0) / speedProfileData.lap2_speeds.length).toFixed(1)} km/h`
                                      : 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <p className="text-[#9db0b9] text-xs text-center">
                                Speed trace comparison ({speedProfileData.lap1_speeds.length} vs {speedProfileData.lap2_speeds.length} data points)
                              </p>
                            </>
                          )}
                        </div>
                      ) : (
                        <p className="text-[#9db0b9] text-sm text-center">
                          Speed profile data will appear here when laps are selected
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!selectedVehicle ? null : activeSection === 'sectors' && (
              <div className="space-y-6">
                <div className="rounded-xl bg-[#111618] border border-[#3b4b54] p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Sector Performance Analysis</h2>
                  {loading.sectors ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : Object.keys(sectorAnalyses).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['S1', 'S2', 'S3'].map((sector) => {
                        const analysis = sectorAnalyses[sector];
                        if (!analysis) return null;
                        
                        return (
                          <div key={sector} className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-bold text-white">{sector}</h3>
                              {analysis.improvement > 0 && (
                                <span className="text-[#0bda57] text-xs font-semibold">
                                  -{analysis.improvement.toFixed(3)}s potential
                                </span>
                              )}
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Best:</span>
                                <span className="text-white font-semibold">{formatLapTime(analysis.bestTime)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Average:</span>
                                <span className="text-white">{formatLapTime(analysis.averageTime)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Worst:</span>
                                <span className="text-white">{formatLapTime(analysis.worstTime)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Consistency:</span>
                                <span className={`font-semibold ${analysis.consistency >= 80 ? 'text-[#0bda57]' : 'text-[#fa5f38]'}`}>
                                  {Math.round(analysis.consistency)}%
                                </span>
                              </div>
                            </div>
                            {analysis.aiAnalysis?.recommendations && (
                              <div className="mt-3 pt-3 border-t border-[#3b4b54]">
                                <p className="text-[#9db0b9] text-xs">{analysis.aiAnalysis.recommendations}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No sector data available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selectedVehicle ? null : activeSection === 'racing-line' && (
              <div className="space-y-6">
                <div className="rounded-xl bg-[#111618] border border-[#3b4b54] p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Optimal Racing Line Analysis</h2>
                  {loading.racingLine ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : optimalRacingLine ? (
                    <div className="space-y-4">
                      {optimalRacingLine.statistics && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                            <p className="text-[#9db0b9] text-xs mb-1">Laps Analyzed</p>
                            <p className="text-white text-lg font-bold">{optimalRacingLine.laps_analyzed?.length || 0}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                            <p className="text-[#9db0b9] text-xs mb-1">Avg Speed</p>
                            <p className="text-white text-lg font-bold">
                              {optimalRacingLine.statistics.average_speed?.toFixed(1) || 'N/A'} km/h
                            </p>
                          </div>
                          <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                            <p className="text-[#9db0b9] text-xs mb-1">Max Speed</p>
                            <p className="text-white text-lg font-bold">
                              {optimalRacingLine.statistics.max_speed?.toFixed(1) || 'N/A'} km/h
                            </p>
                          </div>
                          <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                            <p className="text-[#9db0b9] text-xs mb-1">Line Points</p>
                            <p className="text-white text-lg font-bold">{optimalRacingLine.optimal_line?.length || 0}</p>
                          </div>
                        </div>
                      )}
                      {optimalRacingLine.insights && optimalRacingLine.insights.length > 0 && (
                        <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                          <p className="text-white text-sm font-semibold mb-2">Key Insights</p>
                          <ul className="space-y-1">
                            {optimalRacingLine.insights.map((insight: string, idx: number) => (
                              <li key={idx} className="text-[#9db0b9] text-xs">• {insight}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="h-96 bg-[#1a242a] rounded-lg border border-[#3b4b54] flex items-center justify-center">
                        <div className="text-center">
                          <MapPin className="h-12 w-12 text-[#9db0b9] mx-auto mb-2 opacity-50" />
                          <p className="text-[#9db0b9] text-sm">
                            Optimal racing line visualization<br />
                            ({optimalRacingLine.optimal_line?.length || 0} GPS coordinates)
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No racing line data available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selectedVehicle ? null : activeSection === 'braking' && (
              <div className="space-y-6">
                <div className="rounded-xl bg-[#111618] border border-[#3b4b54] p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Braking Analysis</h2>
                  {loading.braking ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : brakingAnalysis ? (
                    <div className="space-y-4">
                      {brakingAnalysis.statistics && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                            <p className="text-[#9db0b9] text-xs mb-1">Total Zones</p>
                            <p className="text-white text-lg font-bold">{brakingAnalysis.statistics.total_braking_zones || 0}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                            <p className="text-[#9db0b9] text-xs mb-1">Avg Pressure</p>
                            <p className="text-white text-lg font-bold">
                              {brakingAnalysis.statistics.average_brake_pressure?.toFixed(1) || 'N/A'} bar
                            </p>
                          </div>
                          <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                            <p className="text-[#9db0b9] text-xs mb-1">Avg Duration</p>
                            <p className="text-white text-lg font-bold">
                              {brakingAnalysis.statistics.average_duration_seconds?.toFixed(2) || 'N/A'}s
                            </p>
                          </div>
                          <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                            <p className="text-[#9db0b9] text-xs mb-1">Total Time</p>
                            <p className="text-white text-lg font-bold">
                              {brakingAnalysis.statistics.total_braking_time_seconds?.toFixed(1) || 'N/A'}s
                            </p>
                          </div>
                        </div>
                      )}
                      {brakingAnalysis.braking_zones && brakingAnalysis.braking_zones.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-white font-semibold mb-3">Braking Zones ({brakingAnalysis.braking_zones.length})</h3>
                          <div className="max-h-96 overflow-y-auto space-y-2">
                            {brakingAnalysis.braking_zones.slice(0, 20).map((zone: any, idx: number) => (
                              <div key={idx} className="p-3 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <span className="text-white font-medium">Zone {idx + 1}</span>
                                    {zone.gps_lat && zone.gps_lon && (
                                      <span className="text-[#9db0b9] text-xs ml-2">
                                        ({zone.gps_lat.toFixed(4)}, {zone.gps_lon.toFixed(4)})
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[#0bda57] text-xs font-semibold">
                                    {zone.max_brake_pressure?.toFixed(1)} bar
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <p className="text-[#9db0b9]">Duration</p>
                                    <p className="text-white">{zone.duration_seconds?.toFixed(2)}s</p>
                                  </div>
                                  <div>
                                    <p className="text-[#9db0b9]">Start Speed</p>
                                    <p className="text-white">{zone.start_speed?.toFixed(0) || 'N/A'} km/h</p>
                                  </div>
                                  <div>
                                    <p className="text-[#9db0b9]">Speed Reduction</p>
                                    <p className="text-white">{zone.speed_reduction?.toFixed(0) || 'N/A'} km/h</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No braking analysis available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selectedVehicle ? null : activeSection === 'cornering' && (
              <div className="space-y-6">
                <div className="rounded-xl bg-[#111618] border border-[#3b4b54] p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Cornering Performance</h2>
                  {loading.cornering ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : corneringAnalysis ? (
                    <div className="space-y-4">
                      {corneringAnalysis.statistics && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                            <p className="text-[#9db0b9] text-xs mb-1">Total Corners</p>
                            <p className="text-white text-lg font-bold">{corneringAnalysis.statistics.total_corners || 0}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                            <p className="text-[#9db0b9] text-xs mb-1">Avg Lateral G</p>
                            <p className="text-white text-lg font-bold">
                              {corneringAnalysis.statistics.average_lateral_g?.toFixed(2) || corneringAnalysis.statistics.average_lateral_g_force?.toFixed(2) || 'N/A'} G
                            </p>
                          </div>
                          <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                            <p className="text-[#9db0b9] text-xs mb-1">Max Lateral G</p>
                            <p className="text-white text-lg font-bold">
                              {corneringAnalysis.statistics.max_lateral_g?.toFixed(2) || corneringAnalysis.statistics.max_lateral_g_force?.toFixed(2) || 'N/A'} G
                            </p>
                          </div>
                          <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                            <p className="text-[#9db0b9] text-xs mb-1">Avg Min Speed</p>
                            <p className="text-white text-lg font-bold">
                              {corneringAnalysis.statistics.average_min_speed?.toFixed(1) || corneringAnalysis.statistics.average_speed?.toFixed(1) || 'N/A'} km/h
                            </p>
                          </div>
                        </div>
                      )}
                      {corneringAnalysis.corners && corneringAnalysis.corners.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-white font-semibold mb-3">Corner Analysis ({corneringAnalysis.corners.length})</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                            {corneringAnalysis.corners.slice(0, 20).map((corner: any, idx: number) => (
                              <div key={idx} className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="text-white font-semibold">Corner {corner.number || idx + 1}</h4>
                                  {corner.gps_lat && corner.gps_lon && (
                                    <span className="text-[#9db0b9] text-xs">
                                      ({corner.gps_lat.toFixed(4)}, {corner.gps_lon.toFixed(4)})
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <p className="text-[#9db0b9] text-xs">Min Speed</p>
                                    <p className="text-white font-semibold">{corner.min_speed?.toFixed(0) || 'N/A'} km/h</p>
                                  </div>
                                  <div>
                                    <p className="text-[#9db0b9] text-xs">Max Lateral G</p>
                                    <p className="text-white font-semibold">{corner.max_lateral_g?.toFixed(2) || corner.max_lateral_g_force?.toFixed(2) || 'N/A'} G</p>
                                  </div>
                                  <div>
                                    <p className="text-[#9db0b9] text-xs">Max Steering</p>
                                    <p className="text-white font-semibold">{corner.max_steering_angle?.toFixed(1) || corner.max_steering?.toFixed(1) || 'N/A'}°</p>
                                  </div>
                                  <div>
                                    <p className="text-[#9db0b9] text-xs">Duration</p>
                                    <p className="text-white font-semibold">{corner.duration_seconds?.toFixed(2) || 'N/A'}s</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No cornering analysis available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selectedVehicle ? null : activeSection === 'training' && (
              <div className="space-y-6">
                <div className="rounded-xl bg-[#111618] border border-[#3b4b54] p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Personalized Training Plan</h2>
                  {loading.training ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : trainingPlan ? (
                    <div className="space-y-6">
                      {trainingPlan.summary && (
                        <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                          <h3 className="text-white font-semibold mb-2">Training Plan Summary</h3>
                          <p className="text-[#9db0b9] text-sm">{trainingPlan.summary}</p>
                        </div>
                      )}
                      
                      {trainingPlan.focus_areas && trainingPlan.focus_areas.length > 0 && (
                        <div>
                          <h3 className="text-white font-semibold mb-3">Focus Areas</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {trainingPlan.focus_areas.map((area: any, idx: number) => (
                              <div key={idx} className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="text-white font-semibold">{area.area || area.name || area.sector || `Area ${idx + 1}`}</h4>
                                  {area.priority && (
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      area.priority === 'high' ? 'bg-[#fa5f38]/20 text-[#fa5f38]' :
                                      area.priority === 'medium' ? 'bg-[#FFC107]/20 text-[#FFC107]' :
                                      'bg-[#0bda57]/20 text-[#0bda57]'
                                    }`}>
                                      {area.priority}
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1 text-xs mb-2">
                                  {area.current_average && (
                                    <p className="text-[#9db0b9]">Current Avg: <span className="text-white">{formatLapTime(area.current_average)}</span></p>
                                  )}
                                  {area.best_time && (
                                    <p className="text-[#9db0b9]">Best Time: <span className="text-[#0bda57]">{formatLapTime(area.best_time)}</span></p>
                                  )}
                                  {area.improvement_potential && (
                                    <p className="text-[#0bda57] font-semibold">
                                      Potential: -{area.improvement_potential.toFixed(3)}s
                                    </p>
                                  )}
                                </div>
                                {area.objectives && Array.isArray(area.objectives) && (
                                  <div className="mt-2 pt-2 border-t border-[#3b4b54]">
                                    <p className="text-gray-400 text-xs mb-1 font-semibold">Objectives:</p>
                                    <ul className="space-y-1">
                                      {area.objectives.map((obj: string, oIdx: number) => (
                                        <li key={oIdx} className="text-[#9db0b9] text-xs">• {obj}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {trainingPlan.training_sessions && trainingPlan.training_sessions.length > 0 && (
                        <div>
                          <h3 className="text-white font-semibold mb-3">Training Sessions</h3>
                          <div className="space-y-3">
                            {trainingPlan.training_sessions.map((session: any, idx: number) => (
                              <div key={idx} className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                                <div className="flex items-center gap-3 mb-2">
                                  <PlayCircle className="h-5 w-5 text-blue-400" />
                                  <div className="flex-1">
                                    <h4 className="text-white font-semibold">
                                      Session {session.session_number || idx + 1}: {session.focus || session.name || session.title || 'Training Session'}
                                    </h4>
                                    {session.duration_minutes && (
                                      <p className="text-[#9db0b9] text-xs mt-1">Duration: {session.duration_minutes} minutes</p>
                                    )}
                                  </div>
                                </div>
                                {session.description && (
                                  <p className="text-[#9db0b9] text-sm mb-2">{session.description}</p>
                                )}
                                {session.objectives && Array.isArray(session.objectives) && session.objectives.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-gray-400 text-xs mb-1 font-semibold">Objectives:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                      {session.objectives.map((obj: string, oIdx: number) => (
                                        <li key={oIdx} className="text-[#9db0b9] text-xs">{obj}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {session.exercises && Array.isArray(session.exercises) && session.exercises.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-gray-400 text-xs mb-1 font-semibold">Exercises:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                      {session.exercises.map((exercise: string, eIdx: number) => (
                                        <li key={eIdx} className="text-[#9db0b9] text-xs">{exercise}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {session.success_metrics && (
                                  <div className="mt-2 pt-2 border-t border-[#3b4b54]">
                                    <p className="text-gray-400 text-xs mb-1 font-semibold">Success Metrics:</p>
                                    <div className="text-[#9db0b9] text-xs space-y-1">
                                      {session.success_metrics.target_improvement && (
                                        <p>Target: {session.success_metrics.target_improvement}</p>
                                      )}
                                      {session.success_metrics.consistency_target && (
                                        <p>Consistency: {session.success_metrics.consistency_target}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {trainingPlan.recommendations && trainingPlan.recommendations.length > 0 && (
                        <div>
                          <h3 className="text-white font-semibold mb-3">General Recommendations</h3>
                          <div className="space-y-2">
                            {trainingPlan.recommendations.map((rec: any, idx: number) => (
                              <div key={idx} className="p-3 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                                <div className="flex items-start justify-between mb-1">
                                  <h4 className="text-white font-semibold text-sm">{rec.title || `Recommendation ${idx + 1}`}</h4>
                                  {rec.priority && (
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      rec.priority === 'high' ? 'bg-[#fa5f38]/20 text-[#fa5f38]' :
                                      rec.priority === 'medium' ? 'bg-[#FFC107]/20 text-[#FFC107]' :
                                      'bg-[#0bda57]/20 text-[#0bda57]'
                                    }`}>
                                      {rec.priority}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[#9db0b9] text-sm">{rec.description || rec}</p>
                                {rec.action_items && Array.isArray(rec.action_items) && rec.action_items.length > 0 && (
                                  <ul className="mt-2 space-y-1">
                                    {rec.action_items.map((item: string, aIdx: number) => (
                                      <li key={aIdx} className="text-[#9db0b9] text-xs flex items-start gap-2">
                                        <span className="text-blue-400 mt-0.5">▸</span>
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {rec.expected_improvement && (
                                  <p className="text-[#0bda57] text-xs font-semibold mt-2">
                                    Expected: {typeof rec.expected_improvement === 'object' 
                                      ? (rec.expected_improvement.expected_improvement || 
                                         (rec.expected_improvement.rate_per_lap 
                                           ? `${rec.expected_improvement.direction || 'Improvement'}: ${rec.expected_improvement.rate_per_lap}`
                                           : null) ||
                                         String(rec.expected_improvement))
                                      : String(rec.expected_improvement)}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {trainingPlan.goals && trainingPlan.goals.length > 0 && (
                        <div>
                          <h3 className="text-white font-semibold mb-3">Training Goals</h3>
                          <div className="space-y-2">
                            {trainingPlan.goals.map((goal: any, idx: number) => (
                              <div key={idx} className="p-3 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                                <h4 className="text-white font-semibold text-sm mb-1">{goal.goal || `Goal ${idx + 1}`}</h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {goal.current_best && (
                                    <div>
                                      <p className="text-[#9db0b9]">Current Best</p>
                                      <p className="text-white">{formatLapTime(goal.current_best)}</p>
                                    </div>
                                  )}
                                  {goal.target && (
                                    <div>
                                      <p className="text-[#9db0b9]">Target</p>
                                      <p className="text-[#0bda57] font-semibold">{formatLapTime(goal.target)}</p>
                                    </div>
                                  )}
                                  {goal.improvement_needed && (
                                    <div>
                                      <p className="text-[#9db0b9]">Improvement Needed</p>
                                      <p className="text-white">{goal.improvement_needed.toFixed(3)}s</p>
                                    </div>
                                  )}
                                  {goal.timeline_weeks && (
                                    <div>
                                      <p className="text-[#9db0b9]">Timeline</p>
                                      <p className="text-white">{goal.timeline_weeks} weeks</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No training plan available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selectedVehicle ? null : activeSection === 'predictive' && (
              <div className="space-y-6">
                {/* Track & Session Selector */}
                <div className="rounded-xl bg-[#111618] border border-[#3b4b54] p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-purple-400" />
                    Predictive Analysis (ML Models)
                  </h2>
                  <p className="text-[#9db0b9] text-sm mb-4">
                    Use machine learning models to predict future performance and simulate race scenarios
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-[#9db0b9] mb-2">Track</label>
                      <select
                        value={selectedTrack}
                        onChange={(e) => setSelectedTrack(e.target.value)}
                        className="w-full px-3 py-2 bg-[#1a242a] border border-[#3b4b54] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {TRACKS.map(track => (
                          <option key={track} value={track}>{track}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#9db0b9] mb-2">Race Session</label>
                      <select
                        value={selectedSession}
                        onChange={(e) => setSelectedSession(e.target.value)}
                        className="w-full px-3 py-2 bg-[#1a242a] border border-[#3b4b54] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="R1">Race 1</option>
                        <option value="R2">Race 2</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={loadPredictiveAnalysis}
                        disabled={loading.predictive}
                        className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading.predictive ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Load Data
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stint Prediction */}
                <div className="rounded-xl bg-[#111618] border border-[#3b4b54] p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Stint Simulation</h3>
                  <p className="text-[#9db0b9] text-sm mb-4">
                    Predict lap times for a specific stint, including pit stop scenarios
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#9db0b9] mb-2">Start Lap</label>
                      <input
                        type="number"
                        id="startLap"
                        defaultValue={1}
                        min={1}
                        className="w-full px-3 py-2 bg-[#1a242a] border border-[#3b4b54] rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#9db0b9] mb-2">Stint Length</label>
                      <input
                        type="number"
                        id="stintLength"
                        defaultValue={5}
                        min={1}
                        max={20}
                        className="w-full px-3 py-2 bg-[#1a242a] border border-[#3b4b54] rounded-lg text-white text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          id="isPitStop"
                          className="form-checkbox bg-[#1a242a] border-[#3b4b54] rounded text-blue-500"
                        />
                        <span className="text-[#9db0b9] text-sm">Pit Stop</span>
                      </label>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          const startLap = parseInt((document.getElementById('startLap') as HTMLInputElement)?.value || '1');
                          const stintLength = parseInt((document.getElementById('stintLength') as HTMLInputElement)?.value || '5');
                          const isPitStop = (document.getElementById('isPitStop') as HTMLInputElement)?.checked || false;
                          predictStint(startLap, stintLength, isPitStop);
                        }}
                        disabled={loading.predictive}
                        className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                      >
                        Predict Stint
                      </button>
                    </div>
                  </div>

                  {loading.predictive && !stintPrediction && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  )}

                  {stintPrediction && (
                    <div className="mt-6">
                      <h4 className="text-white font-semibold mb-3">Prediction Results</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsLineChart data={stintPrediction.predicted_lap_times.map((pred: number, idx: number) => ({
                          lap: stintPrediction.start_lap + idx,
                          predicted: pred,
                          actual: stintPrediction.true_lap_times[idx] || null
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="lap" stroke="#9ca3af" />
                          <YAxis stroke="#9ca3af" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1f2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                            }}
                            formatter={(value: any) => [`${value.toFixed(2)}s`, '']}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="predicted"
                            name="Predicted"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                          {stintPrediction.true_lap_times.some((t: number) => t > 0) && (
                            <Line
                              type="monotone"
                              dataKey="actual"
                              name="Actual"
                              stroke="#10b981"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          )}
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Race Prediction */}
                <div className="rounded-xl bg-[#111618] border border-[#3b4b54] p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Race Prediction</h3>
                  <p className="text-[#9db0b9] text-sm mb-4">
                    Predict an entire race session based on historical data
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#9db0b9] mb-2">Total Laps</label>
                      <input
                        type="number"
                        id="totalLaps"
                        defaultValue={27}
                        min={1}
                        max={100}
                        className="w-full px-3 py-2 bg-[#1a242a] border border-[#3b4b54] rounded-lg text-white text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          const totalLaps = parseInt((document.getElementById('totalLaps') as HTMLInputElement)?.value || '27');
                          predictRace(totalLaps);
                        }}
                        disabled={loading.predictive}
                        className="w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50"
                      >
                        Predict Race
                      </button>
                    </div>
                  </div>

                  {racePrediction && (
                    <div className="mt-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                          <p className="text-[#9db0b9] text-xs mb-1">Total Predicted Time</p>
                          <p className="text-white text-lg font-bold">{formatLapTime(racePrediction.total_predicted_time)}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                          <p className="text-[#9db0b9] text-xs mb-1">Best Lap Time</p>
                          <p className="text-white text-lg font-bold">{formatLapTime(racePrediction.best_lap_time)}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                          <p className="text-[#9db0b9] text-xs mb-1">Predicted Laps</p>
                          <p className="text-white text-lg font-bold">{racePrediction.predicted_laps?.length || 0}</p>
                        </div>
                      </div>
                      {racePrediction.predicted_lap_times && racePrediction.predicted_lap_times.length > 0 && (
                        <ResponsiveContainer width="100%" height={300}>
                          <RechartsLineChart data={racePrediction.predicted_lap_times.map((time: number, idx: number) => ({
                            lap: racePrediction.start_lap_predicted_from + idx,
                            time: time
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="lap" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                              }}
                              formatter={(value: any) => [`${value.toFixed(2)}s`, '']}
                            />
                            <Line
                              type="monotone"
                              dataKey="time"
                              name="Predicted Lap Time"
                              stroke="#8b5cf6"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                            />
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

