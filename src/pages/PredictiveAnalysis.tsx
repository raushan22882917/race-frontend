import { useState, useEffect } from 'react';
import {
  predictiveAnalysisService,
  StintSimulationRequest,
  StintSimulationResponse,
  VehicleIdsRequest,
  LapNumbersRequest,
  FinalResultsRequest,
  PredictNewRaceRequest,
  PreviousLap,
} from '../services/predictiveAnalysisService';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Award,
  Clock,
  Target,
  Zap,
  BarChart3,
  CheckCircle,
  Menu,
  ChevronLeft,
  ChevronRight,
  Settings,
  Play,
  Activity,
  Trophy,
  Sparkles,
  Lightbulb,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { PredictiveAnalysisSidebar } from '../components/PredictiveAnalysisSidebar';
import {
  generatePreEventInsights,
  generateRealTimeInsights,
  generatePostEventInsights,
  getAnalysisModeExplanation,
  PredictiveInsight,
  AnalysisExplanation,
} from '../services/predictiveGeminiService';

const TRACKS = [
  'Barber',
  'Circuit of the Americas',
  'Road America',
  'Sonoma',
  'Virginia International Raceway',
];

const RACE_SESSIONS = ['Race 1', 'Race 2'];

const TRACK_ANALYTICS: Record<string, { r2: number; rmse: number; trackLength: number; avgPitStopTime: number }> = {
  'Barber': { r2: 96.929, rmse: 1.18, trackLength: 2.28, avgPitStopTime: 34 },
  'Circuit of the Americas': { r2: 86.88, rmse: 9.70, trackLength: 3.416, avgPitStopTime: 36 },
  'Road America': { r2: 95.621, rmse: 1.48, trackLength: 4.014, avgPitStopTime: 52 },
  'Sonoma': { r2: 80.01, rmse: 5.24, trackLength: 2.505, avgPitStopTime: 45 },
  'Virginia International Raceway': { r2: 98.15, rmse: 1.52, trackLength: 3.270, avgPitStopTime: 25 },
};

const MIN_LAP_TIME = 25;

type ActiveMode = 'pre' | 'real' | 'post' | 'def' | 'trueEvent' | 'newSession' | null;

export function PredictiveAnalysis() {
  // Form state
  const [selectedTrack, setSelectedTrack] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [startingLap, setStartingLap] = useState<number | null>(null);
  const [stintLength, setStintLength] = useState<number | null>(null);
  const [isPitStop, setIsPitStop] = useState<boolean>(false);
  const [selectedMinLapTime, setSelectedMinLapTime] = useState<number>(60);

  // Data state
  const [vehicles, setVehicles] = useState<string[]>([]);
  const [lapNumbers, setLapNumbers] = useState<number[]>([]);
  const [stintResults, setStintResults] = useState<StintSimulationResponse | null>(null);
  const [realTimeResults, setRealTimeResults] = useState<{
    noPit: StintSimulationResponse;
    pit: StintSimulationResponse;
  } | null>(null);
  const [postEventResults, setPostEventResults] = useState<any>(null);
  const [finalResults, setFinalResults] = useState<any>(null);
  const [newSessionResult, setNewSessionResult] = useState<any>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeMode, setActiveMode] = useState<ActiveMode>(null);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // AI Insights state
  const [aiInsights, setAiInsights] = useState<PredictiveInsight | null>(null);
  const [modeExplanation, setModeExplanation] = useState<AnalysisExplanation | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState<PredictNewRaceRequest>({
    track_name: '',
    vehicle_id: '',
    total_laps_to_predict: 10,
    previous_laps: [],
  });

  const currentAnalytics = selectedTrack ? TRACK_ANALYTICS[selectedTrack] : null;

  // Load vehicles when track and session change
  useEffect(() => {
    if (selectedTrack && selectedSession) {
      loadVehicles();
    } else {
      setVehicles([]);
      setSelectedVehicle('');
    }
  }, [selectedTrack, selectedSession]);

  // Load lap numbers when vehicle changes
  useEffect(() => {
    if (selectedTrack && selectedSession && selectedVehicle) {
      loadLapNumbers();
    } else {
      setLapNumbers([]);
      setStartingLap(null);
    }
  }, [selectedTrack, selectedSession, selectedVehicle]);

  const loadVehicles = async () => {
    if (!selectedTrack || !selectedSession) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const sessionCode = selectedSession === 'Race 1' ? 'R1' : 'R2';
      const request: VehicleIdsRequest = {
        track_name: selectedTrack,
        race_session: sessionCode,
      };

      const response = await predictiveAnalysisService.getVehicleIds(request);
      setVehicles(response.vehicle_ids || []);
      setSelectedVehicle('');
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        setErrorMessage('⚠️ Backend server is not running. Please start the backend server first (run: python3 main.py)');
      } else if (error.message.includes('Models are still loading')) {
        setErrorMessage('⏳ Models are still loading. Please wait a few seconds and try again.');
      } else {
        setErrorMessage(`Failed to load vehicles: ${error.message}`);
      }
      console.error('Failed to load vehicles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLapNumbers = async () => {
    if (!selectedTrack || !selectedSession || !selectedVehicle) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const sessionCode = selectedSession === 'Race 1' ? 'R1' : 'R2';
      const request: LapNumbersRequest = {
        track_name: selectedTrack,
        race_session: sessionCode,
        vehicle_id: selectedVehicle,
      };

      const response = await predictiveAnalysisService.getLapNumbers(request);
      const laps = response.lap_numbers || [];
      if (!laps.includes(1)) {
        laps.unshift(1);
      }
      setLapNumbers(laps);
      setStartingLap(laps.length > 0 ? laps[0] : null);
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        setErrorMessage('⚠️ Backend server is not running. Please start the backend server first (run: python3 main.py)');
      } else if (error.message.includes('Models are still loading')) {
        setErrorMessage('⏳ Models are still loading. Please wait a few seconds and try again.');
      } else {
        setErrorMessage(`Failed to load lap numbers: ${error.message}`);
      }
      console.error('Failed to load lap numbers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidLapTime = (time: number | null | undefined): boolean => {
    return time !== null && time !== undefined && time >= MIN_LAP_TIME;
  };

  const handlePredictStint = async () => {
    if (!selectedSession || !selectedVehicle || !startingLap || !stintLength) {
      setErrorMessage('Please fill all required fields.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const sessionCode = selectedSession === 'Race 1' ? 'R1' : 'R2';
      const request: StintSimulationRequest = {
        track_name: selectedTrack || 'Barber',
        race_session: sessionCode,
        vehicle_id: selectedVehicle,
        start_lap: startingLap,
        stint_length: stintLength,
        is_pit_stop: isPitStop,
      };

      const result = await predictiveAnalysisService.simulateStint(request);
      setStintResults(result);
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        setErrorMessage('⚠️ Backend server is not running. Please start the backend server first (run: python3 main.py)');
      } else {
        setErrorMessage(`Prediction failed: ${error.message}`);
      }
      console.error('Prediction failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runPreEvent = async () => {
    setActiveMode('pre');
    setNewSessionOpen(false);
    setNewSessionResult(null);
    setAiInsights(null);
    setShowExplanation(false);
    await handlePredictStint();
  };
  
  // Generate AI insights when stint results are available for pre-event mode
  useEffect(() => {
    if (activeMode === 'pre' && stintResults && !aiInsights && !isGeneratingInsights) {
      setIsGeneratingInsights(true);
      generatePreEventInsights(
        stintResults.predicted_lap_times,
        stintResults.true_lap_times,
        selectedTrack || 'Barber',
        selectedVehicle,
        startingLap || 1
      )
        .then((insights) => {
          setAiInsights(insights);
        })
        .catch((error) => {
          console.error('Failed to generate AI insights:', error);
        })
        .finally(() => {
          setIsGeneratingInsights(false);
        });
    }
  }, [activeMode, stintResults, selectedTrack, selectedVehicle, startingLap]);

  const runRealTime = async () => {
    setErrorMessage('');
    setActiveMode('real');
    setNewSessionOpen(false);
    setNewSessionResult(null);
    setAiInsights(null);
    setShowExplanation(false);

    if (!selectedVehicle || !startingLap || !stintLength) {
      setErrorMessage('Please fill all required fields.');
      return;
    }

    setIsLoading(true);

    try {
      const sessionCode = selectedSession === 'Race 1' ? 'R1' : 'R2';
      const noPitRequest: StintSimulationRequest = {
        track_name: selectedTrack || 'Barber',
        race_session: sessionCode,
        vehicle_id: selectedVehicle,
        start_lap: startingLap,
        stint_length: stintLength,
        is_pit_stop: false,
      };

      const pitRequest: StintSimulationRequest = {
        ...noPitRequest,
        is_pit_stop: true,
      };

      const [noPit, pit] = await Promise.all([
        predictiveAnalysisService.simulateStint(noPitRequest),
        predictiveAnalysisService.simulateStint(pitRequest),
      ]);

      setRealTimeResults({ noPit, pit });
      
      // Generate AI insights
      setIsGeneratingInsights(true);
      try {
        const insights = await generateRealTimeInsights(
          noPit.predicted_lap_times,
          pit.predicted_lap_times,
          selectedTrack || 'Barber',
          selectedVehicle
        );
        setAiInsights(insights);
      } catch (error) {
        console.error('Failed to generate AI insights:', error);
      } finally {
        setIsGeneratingInsights(false);
      }
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        setErrorMessage('⚠️ Backend server is not running. Please start the backend server first (run: python3 main.py)');
      } else {
        setErrorMessage(`Real-time prediction failed: ${error.message}`);
      }
      console.error('Real-time prediction failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runPostEvent = async () => {
    setErrorMessage('');
    setActiveMode('post');
    setNewSessionOpen(false);
    setNewSessionResult(null);
    setAiInsights(null);
    setShowExplanation(false);

    if (!stintResults?.predicted_lap_times || !stintResults?.true_lap_times) {
      setErrorMessage('Please run a prediction first to get post-event analysis.');
      setActiveMode(null);
      return;
    }

    const actual = stintResults.true_lap_times;
    const predicted = stintResults.predicted_lap_times;

    const validPairs = actual
      .map((a, i) => ({ actual: a, predicted: predicted[i] }))
      .filter((pair) => isValidLapTime(pair.actual) && isValidLapTime(pair.predicted));

    const absErrors = validPairs.map((pair) => Math.abs(pair.predicted - pair.actual));
    const mae = validPairs.length ? absErrors.reduce((a, b) => a + b, 0) / absErrors.length : 0;
    const rmse = validPairs.length
      ? Math.sqrt(absErrors.map((e) => e ** 2).reduce((a, b) => a + b, 0) / absErrors.length)
      : 0;

    const laps = actual.map((_, i) => i + 1);
    const { m, b } = computeTrendline(laps, actual.filter(isValidLapTime));
    const trendline = laps.map((x) => m * x + b);

    const modelStats = currentAnalytics || { r2: 0, rmse: 0, trackLength: 0 };
    const delta = rmse - modelStats.rmse;
    let performanceStatus = 'on par';
    if (delta <= -0.2) performanceStatus = 'above average';
    else if (delta >= 0.2) performanceStatus = 'below average';

    setPostEventResults({
      actual,
      predicted,
      trendline,
      mae,
      rmse,
      model_r2: modelStats.r2,
      model_rmse: modelStats.rmse,
      performanceStatus,
      insight: getPostEventInsight(mae, rmse, modelStats.r2),
    });
    
    // Generate AI insights
    setIsGeneratingInsights(true);
    try {
      const insights = await generatePostEventInsights(
        mae,
        rmse,
        modelStats.r2,
        modelStats.rmse,
        performanceStatus,
        selectedTrack || 'Barber'
      );
      setAiInsights(insights);
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const runTrueEvent = async () => {
    setErrorMessage('');
    setActiveMode('trueEvent');
    setNewSessionOpen(false);
    setNewSessionResult(null);

    if (!selectedTrack || !selectedSession) {
      setErrorMessage('Please select track and session first.');
      return;
    }

    setIsLoading(true);

    try {
      const sessionCode = selectedSession === 'Race 1' ? 'R1' : 'R2';
      const request: FinalResultsRequest = {
        track_name: selectedTrack,
        race_session: sessionCode,
        min_lap_time_enforced: selectedMinLapTime,
      };

      const response = await predictiveAnalysisService.getFinalResults(request);
      setFinalResults(response);
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        setErrorMessage('⚠️ Backend server is not running. Please start the backend server first (run: python3 main.py)');
      } else {
        setErrorMessage(`Failed to load final results: ${error.message}`);
      }
      console.error('Failed to load final results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openNewSession = () => {
    setActiveMode('newSession');
    setNewSessionOpen(true);
    setNewSessionResult(null);
    setNewSessionForm({
      track_name: selectedTrack || 'Barber',
      vehicle_id: '',
      total_laps_to_predict: 10,
      previous_laps: [],
    });
  };

  const addPrevLapRow = () => {
    setNewSessionForm((prev) => ({
      ...prev,
      previous_laps: [
        ...(prev.previous_laps || []),
        {
          lap: (prev.previous_laps?.length || 0) + 1,
          lap_time_seconds: 100,
        },
      ],
    }));
  };

  const removePrevLapRow = (idx: number) => {
    setNewSessionForm((prev) => ({
      ...prev,
      previous_laps: prev.previous_laps?.filter((_, i) => i !== idx) || [],
    }));
  };

  const predictNewSession = async () => {
    if (!newSessionForm.track_name || !newSessionForm.vehicle_id || !newSessionForm.total_laps_to_predict) {
      setErrorMessage('Fill track, vehicle id and total laps to predict.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const payload: PredictNewRaceRequest = {
        ...newSessionForm,
        previous_laps: newSessionForm.previous_laps?.map((p) => ({
          lap: Number(p.lap),
          lap_time_seconds: p.lap_time_seconds ? Number(p.lap_time_seconds) : 0,
          laps_on_tires: p.laps_on_tires ? Number(p.laps_on_tires) : undefined,
          fuel_load_proxy: p.fuel_load_proxy ? Number(p.fuel_load_proxy) : undefined,
          session_air_temp: p.session_air_temp ? Number(p.session_air_temp) : undefined,
          session_track_temp: p.session_track_temp ? Number(p.session_track_temp) : undefined,
        })),
      };

      const res = await predictiveAnalysisService.predictNewRaceSession(payload);
      setNewSessionResult(res);
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        setErrorMessage('⚠️ Backend server is not running. Please start the backend server first (run: python3 main.py)');
      } else {
        setErrorMessage(`Failed to predict new race session: ${error.message}`);
      }
      console.error('predictNewSession failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  const computeTrendline = (x: number[], y: number[]) => {
    const validY = y.filter((val) => isValidLapTime(val));
    const validX = x.slice(0, validY.length);
    const n = validX.length;
    if (n === 0) return { m: 0, b: 0 };

    const sumX = validX.reduce((a, b) => a + b, 0);
    const sumY = validY.reduce((a, b) => a + b, 0);
    const sumXY = validX.reduce((a, b, i) => a + b * validY[i], 0);
    const sumX2 = validX.reduce((a, b) => a + b * b, 0);
    const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
    const b = (sumY - m * sumX) / n;
    return { m, b };
  };

  const getPostEventInsight = (mae: number, rmse: number, r2: number): string => {
    if (rmse < 0.5 && r2 > 0.95)
      return '🏎️ Excellent predictive accuracy — model closely matches actual lap evolution.';
    if (rmse < 1.0 && r2 > 0.9)
      return '⚙️ Strong model performance — minor deviations, but pacing trend is well captured.';
    if (rmse < 1.5)
      return '📉 Moderate fit — overall pattern correct, but larger lap-to-lap variation.';
    return '⚠️ Weak agreement — model drifted from actual race behavior. Consider retraining.';
  };

  const formatTime = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined) return 'N/A';
    return seconds.toFixed(2);
  };

  // Prepare chart data
  const preEventChartData = stintResults
    ? stintResults.predicted_lap_times.map((pred, i) => ({
        lap: (startingLap || 0) + i,
        predicted: isValidLapTime(pred) ? pred : null,
        true: isValidLapTime(stintResults.true_lap_times[i])
          ? stintResults.true_lap_times[i]
          : isValidLapTime(pred)
          ? pred
          : null,
      }))
    : [];

  const realTimeChartData = realTimeResults
    ? realTimeResults.noPit.predicted_lap_times.map((noPit, i) => ({
        lap: (startingLap || 0) + i,
        noPit: isValidLapTime(noPit) ? noPit : null,
        pit: isValidLapTime(realTimeResults.pit.predicted_lap_times[i])
          ? realTimeResults.pit.predicted_lap_times[i]
          : null,
      }))
    : [];

  const postEventChartData = postEventResults
    ? postEventResults.actual.map((actual: number, i: number) => ({
        lap: (startingLap || 0) + i,
        actual: isValidLapTime(actual) ? actual : isValidLapTime(postEventResults.predicted[i]) ? postEventResults.predicted[i] : null,
        predicted: isValidLapTime(postEventResults.predicted[i]) ? postEventResults.predicted[i] : null,
        trendline: isValidLapTime(actual) && i < postEventResults.trendline.length ? postEventResults.trendline[i] : null,
      }))
    : [];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <PredictiveAnalysisSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)}>
        <div className="space-y-6">
          {/* Track Analytics Card */}
          {currentAnalytics && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Track Analytics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-gray-400">R² Score</div>
                  <div className="text-lg font-bold text-green-400">{currentAnalytics.r2.toFixed(2)}%</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-gray-400">RMSE</div>
                  <div className="text-lg font-bold text-blue-400">{currentAnalytics.rmse.toFixed(2)}s</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-gray-400">Track Length</div>
                  <div className="text-lg font-bold">{currentAnalytics.trackLength.toFixed(3)} mi</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-gray-400">Avg Pit Stop</div>
                  <div className="text-lg font-bold">{currentAnalytics.avgPitStopTime}s</div>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Form */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-400">Track</label>
                <select
                  value={selectedTrack}
                  onChange={(e) => setSelectedTrack(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 text-sm"
                >
                  <option value="">Select Track</option>
                  {TRACKS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-400">Race Session</label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 text-sm"
                >
                  <option value="">Select Session</option>
                  {RACE_SESSIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-400">Vehicle ID</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 text-sm"
                  disabled={vehicles.length === 0}
                >
                  <option value="">{vehicles.length === 0 ? 'Loading...' : 'Select Vehicle'}</option>
                  {vehicles.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-400">Starting Lap</label>
                <select
                  value={startingLap || ''}
                  onChange={(e) => setStartingLap(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 text-sm"
                  disabled={lapNumbers.length === 0}
                >
                  <option value="">Select Lap</option>
                  {lapNumbers.map((lap) => (
                    <option key={lap} value={lap}>
                      {lap}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-400">Stint Length</label>
                <select
                  value={stintLength || ''}
                  onChange={(e) => setStintLength(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 text-sm"
                >
                  <option value="">Select Length</option>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-400">Pit Stop?</label>
                <select
                  value={isPitStop ? 'true' : 'false'}
                  onChange={(e) => setIsPitStop(e.target.value === 'true')}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 text-sm"
                >
                  <option value="false">False</option>
                  <option value="true">True</option>
                </select>
              </div>

              <button
                onClick={handlePredictStint}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Predicting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Predict
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Analysis Modes
            </h3>
            <div className="space-y-3">
              {/* Pre-Event Mode */}
              <button
                onClick={runPreEvent}
                className={`w-full text-left p-3 rounded-lg transition-all border-2 ${
                  activeMode === 'pre' 
                    ? 'bg-green-600 text-white border-green-500 shadow-lg' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <TrendingUp className={`h-5 w-5 mt-0.5 ${activeMode === 'pre' ? 'text-white' : 'text-green-400'}`} />
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">Pre-Event Analysis</div>
                    <div className={`text-xs ${activeMode === 'pre' ? 'text-green-100' : 'text-gray-400'}`}>
                      Compare predicted vs actual lap times before race starts
                    </div>
                  </div>
                  {activeMode === 'pre' && <CheckCircle className="h-4 w-4 text-white" />}
                </div>
              </button>

              {/* Real-Time Mode */}
              <button
                onClick={runRealTime}
                className={`w-full text-left p-3 rounded-lg transition-all border-2 ${
                  activeMode === 'real' 
                    ? 'bg-yellow-600 text-white border-yellow-500 shadow-lg' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Zap className={`h-5 w-5 mt-0.5 ${activeMode === 'real' ? 'text-white' : 'text-yellow-400'}`} />
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">Real-Time Strategy</div>
                    <div className={`text-xs ${activeMode === 'real' ? 'text-yellow-100' : 'text-gray-400'}`}>
                      Compare pit stop vs no-pit strategies during race
                    </div>
                  </div>
                  {activeMode === 'real' && <CheckCircle className="h-4 w-4 text-white" />}
                </div>
              </button>

              {/* Post-Event Mode */}
              <button
                onClick={runPostEvent}
                className={`w-full text-left p-3 rounded-lg transition-all border-2 ${
                  activeMode === 'post' 
                    ? 'bg-purple-600 text-white border-purple-500 shadow-lg' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <BarChart3 className={`h-5 w-5 mt-0.5 ${activeMode === 'post' ? 'text-white' : 'text-purple-400'}`} />
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">Post-Event Analysis</div>
                    <div className={`text-xs ${activeMode === 'post' ? 'text-purple-100' : 'text-gray-400'}`}>
                      Analyze prediction accuracy with metrics and insights
                    </div>
                  </div>
                  {activeMode === 'post' && <CheckCircle className="h-4 w-4 text-white" />}
                </div>
              </button>

              {/* Race Results Mode */}
              <button
                onClick={runTrueEvent}
                className={`w-full text-left p-3 rounded-lg transition-all border-2 ${
                  activeMode === 'trueEvent' 
                    ? 'bg-red-600 text-white border-red-500 shadow-lg' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Trophy className={`h-5 w-5 mt-0.5 ${activeMode === 'trueEvent' ? 'text-white' : 'text-red-400'}`} />
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">Race Results</div>
                    <div className={`text-xs ${activeMode === 'trueEvent' ? 'text-red-100' : 'text-gray-400'}`}>
                      View final standings, best laps, and completion status
                    </div>
                  </div>
                  {activeMode === 'trueEvent' && <CheckCircle className="h-4 w-4 text-white" />}
                </div>
              </button>

              {/* New Session Mode */}
              <button
                onClick={openNewSession}
                className={`w-full text-left p-3 rounded-lg transition-all border-2 ${
                  activeMode === 'newSession' 
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Sparkles className={`h-5 w-5 mt-0.5 ${activeMode === 'newSession' ? 'text-white' : 'text-indigo-400'}`} />
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">New Session Prediction</div>
                    <div className={`text-xs ${activeMode === 'newSession' ? 'text-indigo-100' : 'text-gray-400'}`}>
                      Predict future race sessions with minimal input data
                    </div>
                  </div>
                  {activeMode === 'newSession' && <CheckCircle className="h-4 w-4 text-white" />}
                </div>
              </button>
            </div>
          </div>
        </div>
      </PredictiveAnalysisSidebar>

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-80' : 'ml-16'}`}>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Target className="h-8 w-8 text-blue-400" />
                  Race Predictor Dashboard
                </h1>
                <p className="text-gray-400 mt-1">Predict race pace, pit-stop impact, and best lap time with ML-powered analytics</p>
              </div>
              
              {/* Active Mode Badge */}
              {activeMode && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Active Mode:</span>
                  <div className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                    activeMode === 'pre' ? 'bg-green-600 text-white' :
                    activeMode === 'real' ? 'bg-yellow-600 text-white' :
                    activeMode === 'post' ? 'bg-purple-600 text-white' :
                    activeMode === 'trueEvent' ? 'bg-red-600 text-white' :
                    activeMode === 'newSession' ? 'bg-indigo-600 text-white' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {activeMode === 'pre' && <TrendingUp className="h-4 w-4" />}
                    {activeMode === 'real' && <Zap className="h-4 w-4" />}
                    {activeMode === 'post' && <BarChart3 className="h-4 w-4" />}
                    {activeMode === 'trueEvent' && <Trophy className="h-4 w-4" />}
                    {activeMode === 'newSession' && <Sparkles className="h-4 w-4" />}
                    <span>
                      {activeMode === 'pre' ? 'Pre-Event Analysis' :
                       activeMode === 'real' ? 'Real-Time Analysis' :
                       activeMode === 'post' ? 'Post-Event Analysis' :
                       activeMode === 'trueEvent' ? 'Race Results' :
                       activeMode === 'newSession' ? 'New Session Prediction' :
                       ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Quick Info Bar */}
            {selectedTrack && selectedSession && selectedVehicle && (
              <div className="flex items-center gap-4 mt-4 text-sm">
                <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                  <span className="text-gray-400">Track:</span>
                  <span className="ml-2 font-semibold">{selectedTrack}</span>
                </div>
                <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                  <span className="text-gray-400">Session:</span>
                  <span className="ml-2 font-semibold">{selectedSession}</span>
                </div>
                <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                  <span className="text-gray-400">Vehicle:</span>
                  <span className="ml-2 font-mono font-semibold">{selectedVehicle}</span>
                </div>
                {startingLap && (
                  <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                    <span className="text-gray-400">Start Lap:</span>
                    <span className="ml-2 font-semibold">{startingLap}</span>
                  </div>
                )}
                {stintLength && (
                  <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                    <span className="text-gray-400">Stint Length:</span>
                    <span className="ml-2 font-semibold">{stintLength} laps</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Loading Overlay */}
          {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
              <div className="flex flex-col items-center">
                <Loader2 className="h-16 w-16 animate-spin text-blue-500 mb-4" />
                <p className="text-xl">Loading...</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-4 mb-6 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Default Results */}
          {stintResults && activeMode !== 'pre' && activeMode !== 'real' && activeMode !== 'post' && activeMode !== 'newSession' && activeMode !== 'trueEvent' && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Predicted Lap Times
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2">Lap #</th>
                      <th className="text-left py-2">Predicted Time (s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stintResults.predicted_lap_times.map((time, i) => (
                      <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="py-2">{(startingLap || 0) + i}</td>
                        <td className="py-2 font-mono">{formatTime(time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Insights Component */}
          {aiInsights && (
            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg p-6 mb-6 border-2 border-blue-500/50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Sparkles className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      AI-Powered Insights
                      {aiInsights.confidence && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          aiInsights.confidence === 'high' ? 'bg-green-500/20 text-green-300' :
                          aiInsights.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {aiInsights.confidence} confidence
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-400">Powered by Gemini AI</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-200 leading-relaxed">{aiInsights.summary}</p>
              </div>
              
              {aiInsights.keyFindings && aiInsights.keyFindings.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-400" />
                    Key Findings
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    {aiInsights.keyFindings.map((finding, i) => (
                      <li key={i} className="text-sm">{finding}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-400" />
                    Recommendations
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    {aiInsights.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {aiInsights.warnings && aiInsights.warnings.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-yellow-300">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-yellow-200">
                    {aiInsights.warnings.map((warning, i) => (
                      <li key={i} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {isGeneratingInsights && (
            <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
              <span className="text-gray-300">Generating AI insights...</span>
            </div>
          )}

          {/* Mode Explanation */}
          {activeMode && (
            <div className="mb-6">
              <button
                onClick={async () => {
                  if (!showExplanation) {
                    const explanation = await getAnalysisModeExplanation(activeMode);
                    setModeExplanation(explanation);
                  }
                  setShowExplanation(!showExplanation);
                }}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Info className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {showExplanation ? 'Hide' : 'Show'} explanation for this mode
                </span>
              </button>
              
              {showExplanation && modeExplanation && (
                <div className="mt-3 bg-gray-800 rounded-lg p-5 border border-gray-700">
                  <h4 className="text-lg font-bold mb-2">{modeExplanation.title}</h4>
                  <p className="text-gray-300 mb-3">{modeExplanation.description}</p>
                  
                  <div className="mb-3">
                    <h5 className="font-semibold text-gray-200 mb-1">What it means:</h5>
                    <p className="text-gray-400 text-sm">{modeExplanation.whatItMeans}</p>
                  </div>
                  
                  <div className="mb-3">
                    <h5 className="font-semibold text-gray-200 mb-1">How to use:</h5>
                    <ol className="list-decimal list-inside space-y-1 text-gray-400 text-sm">
                      {modeExplanation.howToUse.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold text-gray-200 mb-1">Tips:</h5>
                    <ul className="list-disc list-inside space-y-1 text-gray-400 text-sm">
                      {modeExplanation.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pre-Event Mode */}
          {activeMode === 'pre' && stintResults && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Pre-Event Prediction Results
              </h3>
              <div className="overflow-x-auto mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2">Lap #</th>
                      <th className="text-left py-2">Predicted</th>
                      <th className="text-left py-2">True Time</th>
                      <th className="text-left py-2">Abs Error</th>
                      <th className="text-left py-2">% Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stintResults.predicted_lap_times.map((pred, i) => {
                      const actual = stintResults.true_lap_times[i];
                      const absError = isValidLapTime(pred) && isValidLapTime(actual) ? Math.abs(pred - actual) : null;
                      const pctError =
                        isValidLapTime(pred) && isValidLapTime(actual)
                          ? ((Math.abs(pred - actual) / actual) * 100).toFixed(1)
                          : null;
                      return (
                        <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="py-2">{(startingLap || 0) + i}</td>
                          <td className="py-2 font-mono">{isValidLapTime(pred) ? formatTime(pred) : 'N/A'}</td>
                          <td className="py-2 font-mono">{isValidLapTime(actual) ? formatTime(actual) : 'N/A'}</td>
                          <td className="py-2 font-mono">{absError !== null ? formatTime(absError) : 'N/A'}</td>
                          <td className="py-2">{pctError !== null ? `${pctError}%` : 'N/A'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={preEventChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="lap" stroke="#999" />
                    <YAxis stroke="#999" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                    <Legend />
                    <Line type="monotone" dataKey="predicted" stroke="#00BFFF" strokeWidth={2} name="Predicted Lap Times" />
                    <Line type="monotone" dataKey="true" stroke="#4CAF50" strokeWidth={2} name="True Lap Times" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Real-Time Mode */}
          {activeMode === 'real' && realTimeResults && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                Real-Time Strategy Comparison
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-900 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 text-blue-400">No Pit Stop Strategy</h4>
                  <div className="space-y-1">
                    {realTimeResults.noPit.predicted_lap_times.slice(0, 5).map((time, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-400">Lap {(startingLap || 0) + i}</span>
                        <span className="font-mono">{formatTime(time)}s</span>
                      </div>
                    ))}
                    {realTimeResults.noPit.predicted_lap_times.length > 5 && (
                      <div className="text-xs text-gray-500 pt-2">+ {realTimeResults.noPit.predicted_lap_times.length - 5} more laps</div>
                    )}
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 text-orange-400">With Pit Stop Strategy</h4>
                  <div className="space-y-1">
                    {realTimeResults.pit.predicted_lap_times.slice(0, 5).map((time, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-400">Lap {(startingLap || 0) + i}</span>
                        <span className="font-mono">{formatTime(time)}s</span>
                      </div>
                    ))}
                    {realTimeResults.pit.predicted_lap_times.length > 5 && (
                      <div className="text-xs text-gray-500 pt-2">+ {realTimeResults.pit.predicted_lap_times.length - 5} more laps</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={realTimeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="lap" stroke="#999" />
                    <YAxis stroke="#999" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                    <Legend />
                    <Bar dataKey="noPit" fill="#007bff" name="No Pit" />
                    <Bar dataKey="pit" fill="#ff9800" name="Pit Stop" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Post-Event Mode */}
          {activeMode === 'post' && postEventResults && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
              <div className="mb-6 bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                  Post-Event Analysis Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">Session MAE</div>
                    <div className="text-2xl font-bold text-blue-400">{postEventResults.mae.toFixed(2)}s</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">Model R²</div>
                    <div className="text-2xl font-bold text-green-400">{postEventResults.model_r2.toFixed(3)}%</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">Session RMSE</div>
                    <div className="text-2xl font-bold text-yellow-400">{postEventResults.rmse.toFixed(2)}s</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">Model RMSE</div>
                    <div className="text-2xl font-bold text-orange-400">{postEventResults.model_rmse.toFixed(2)}s</div>
                  </div>
                </div>
                <div
                  className={`inline-block px-4 py-2 rounded-full font-semibold mb-4 ${
                    postEventResults.performanceStatus === 'above average'
                      ? 'bg-green-900 text-green-200'
                      : postEventResults.performanceStatus === 'below average'
                      ? 'bg-red-900 text-red-200'
                      : 'bg-yellow-900 text-yellow-200'
                  }`}
                >
                  Performance: {postEventResults.performanceStatus}
                </div>
                <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4">
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Insight
                  </h4>
                  <p className="text-sm">{postEventResults.insight}</p>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-4">Detailed Analysis</h3>
              <div className="overflow-x-auto mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2">Lap</th>
                      <th className="text-left py-2">True Time</th>
                      <th className="text-left py-2">Predicted Time</th>
                      <th className="text-left py-2">Abs Error</th>
                      <th className="text-left py-2">% Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postEventResults.actual.map((actual: number, i: number) => {
                      const predicted = postEventResults.predicted[i];
                      const absError = isValidLapTime(predicted) && isValidLapTime(actual) ? Math.abs(predicted - actual) : null;
                      const pctError =
                        isValidLapTime(predicted) && isValidLapTime(actual)
                          ? ((Math.abs(predicted - actual) / actual) * 100).toFixed(1)
                          : null;
                      return (
                        <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="py-2">{(startingLap || 0) + i}</td>
                          <td className="py-2 font-mono">{isValidLapTime(actual) ? formatTime(actual) : 'N/A'}</td>
                          <td className="py-2 font-mono">{isValidLapTime(predicted) ? formatTime(predicted) : 'N/A'}</td>
                          <td className="py-2 font-mono">{absError !== null ? formatTime(absError) : 'N/A'}</td>
                          <td className="py-2">{pctError !== null ? `${pctError}%` : 'N/A'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={postEventChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="lap" stroke="#999" />
                    <YAxis stroke="#999" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                    <Legend />
                    <Line type="monotone" dataKey="actual" stroke="#4caf50" strokeWidth={2} name="True Lap Times" />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#00BFFF"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Predicted Lap Times"
                    />
                    <Line
                      type="monotone"
                      dataKey="trendline"
                      stroke="#ff9800"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={false}
                      name="Trendline (True)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Final Race Results */}
          {activeMode === 'trueEvent' && finalResults && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                Final Race Results
              </h3>
              <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-400">Track</div>
                    <div className="font-semibold">{finalResults.track_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Race Session</div>
                    <div className="font-semibold">{finalResults.race_session}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Max Laps</div>
                    <div className="font-semibold">{finalResults.max_lap}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Min Lap Time (seconds)</label>
                    <select
                      value={selectedMinLapTime}
                      onChange={(e) => {
                        setSelectedMinLapTime(Number(e.target.value));
                        runTrueEvent();
                      }}
                      className="w-full bg-gray-700 text-white rounded px-2 py-1 border border-gray-600 mt-1 text-sm"
                    >
                      {Array.from({ length: 11 }, (_, i) => i * 10).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2">Position</th>
                      <th className="text-left py-2">Vehicle ID</th>
                      <th className="text-left py-2">Completed Laps</th>
                      <th className="text-left py-2">Best Lap Time (s)</th>
                      <th className="text-left py-2">Total Time (s)</th>
                      <th className="text-left py-2">Invalid Laps</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalResults.results.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="py-2 font-bold">{i + 1}</td>
                        <td className="py-2 font-mono">{r.vehicle_id}</td>
                        <td className="py-2">{r.completed_laps}</td>
                        <td className="py-2 font-mono">{r.best_lap_time ? formatTime(r.best_lap_time) : 'N/A'}</td>
                        <td className="py-2 font-mono">{r.total_time ? formatTime(r.total_time) : 'N/A'}</td>
                        <td className="py-2 text-xs">{r.invalid_laps.length > 0 ? r.invalid_laps.join(', ') : 'None'}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              r.status === 'Finished' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* New Race Session */}
          {newSessionOpen && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                New Race Session Prediction
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Track*</label>
                  <select
                    value={newSessionForm.track_name}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, track_name: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                  >
                    {TRACKS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Vehicle ID*</label>
                  <input
                    type="text"
                    value={newSessionForm.vehicle_id}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, vehicle_id: e.target.value })}
                    placeholder="e.g. NEW-CAR-001"
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Total Laps to Predict*</label>
                  <input
                    type="number"
                    value={newSessionForm.total_laps_to_predict}
                    onChange={(e) =>
                      setNewSessionForm({ ...newSessionForm, total_laps_to_predict: Number(e.target.value) })
                    }
                    min="1"
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-4">* = Required</p>

              {newSessionForm.previous_laps && newSessionForm.previous_laps.length > 0 && (
                <div className="mb-4 bg-gray-900 rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Previous Laps</h4>
                  {newSessionForm.previous_laps.map((p, i) => (
                    <div key={i} className="grid grid-cols-2 md:grid-cols-7 gap-2 mb-2 items-end">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Lap #*</label>
                        <input
                          type="number"
                          value={p.lap}
                          onChange={(e) => {
                            const updated = [...(newSessionForm.previous_laps || [])];
                            updated[i].lap = Number(e.target.value);
                            setNewSessionForm({ ...newSessionForm, previous_laps: updated });
                          }}
                          min="1"
                          className="w-full bg-gray-700 text-white rounded px-2 py-1 border border-gray-600 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Lap Time (s)*</label>
                        <input
                          type="number"
                          value={p.lap_time_seconds}
                          onChange={(e) => {
                            const updated = [...(newSessionForm.previous_laps || [])];
                            updated[i].lap_time_seconds = Number(e.target.value);
                            setNewSessionForm({ ...newSessionForm, previous_laps: updated });
                          }}
                          min="1"
                          className="w-full bg-gray-700 text-white rounded px-2 py-1 border border-gray-600 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Laps on tires</label>
                        <input
                          type="number"
                          value={p.laps_on_tires || ''}
                          onChange={(e) => {
                            const updated = [...(newSessionForm.previous_laps || [])];
                            updated[i].laps_on_tires = e.target.value ? Number(e.target.value) : undefined;
                            setNewSessionForm({ ...newSessionForm, previous_laps: updated });
                          }}
                          className="w-full bg-gray-700 text-white rounded px-2 py-1 border border-gray-600 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Fuel Load Proxy</label>
                        <input
                          type="number"
                          value={p.fuel_load_proxy || ''}
                          onChange={(e) => {
                            const updated = [...(newSessionForm.previous_laps || [])];
                            updated[i].fuel_load_proxy = e.target.value ? Number(e.target.value) : undefined;
                            setNewSessionForm({ ...newSessionForm, previous_laps: updated });
                          }}
                          className="w-full bg-gray-700 text-white rounded px-2 py-1 border border-gray-600 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Air Temp</label>
                        <input
                          type="number"
                          value={p.session_air_temp || ''}
                          onChange={(e) => {
                            const updated = [...(newSessionForm.previous_laps || [])];
                            updated[i].session_air_temp = e.target.value ? Number(e.target.value) : undefined;
                            setNewSessionForm({ ...newSessionForm, previous_laps: updated });
                          }}
                          className="w-full bg-gray-700 text-white rounded px-2 py-1 border border-gray-600 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Track Temp</label>
                        <input
                          type="number"
                          value={p.session_track_temp || ''}
                          onChange={(e) => {
                            const updated = [...(newSessionForm.previous_laps || [])];
                            updated[i].session_track_temp = e.target.value ? Number(e.target.value) : undefined;
                            setNewSessionForm({ ...newSessionForm, previous_laps: updated });
                          }}
                          className="w-full bg-gray-700 text-white rounded px-2 py-1 border border-gray-600 text-sm"
                        />
                      </div>
                      <div>
                        <button
                          onClick={() => removePrevLapRow(i)}
                          className="w-full bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-2 rounded"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-4 mb-4">
                <button
                  onClick={addPrevLapRow}
                  className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
                >
                  Add Previous Lap (optional)
                </button>
                <button
                  onClick={predictNewSession}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
                >
                  Predict New Race
                </button>
                <button
                  onClick={() => setNewSessionOpen(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
                >
                  Close
                </button>
              </div>

              {newSessionResult && (
                <div className="bg-gray-900 rounded-lg p-4 mt-4 border border-gray-700">
                  <h4 className="font-bold mb-3">Prediction Result</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-400">Track</div>
                      <div className="font-semibold">{newSessionResult.track_name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Vehicle</div>
                      <div className="font-semibold">{newSessionResult.vehicle_id}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Start Lap Predicted From</div>
                      <div className="font-semibold">{newSessionResult.start_lap_predicted_from}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Total Predicted Time</div>
                      <div className="font-semibold font-mono">{formatTime(newSessionResult.total_predicted_time)}s</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Best Lap</div>
                      <div className="font-semibold font-mono">{formatTime(newSessionResult.best_lap_time)}s</div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-2">Lap</th>
                          <th className="text-left py-2">Time (s)</th>
                          <th className="text-left py-2">Provided?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newSessionResult.predicted_laps.map((r: any, i: number) => (
                          <tr key={i} className="border-b border-gray-700 hover:bg-gray-800">
                            <td className="py-2">{r.lap}</td>
                            <td className="py-2 font-mono">{r.lap_time_seconds ? formatTime(r.lap_time_seconds) : 'N/A'}</td>
                            <td className="py-2">
                              <span className={`px-2 py-1 rounded text-xs ${r.provided ? 'bg-green-900 text-green-200' : 'bg-blue-900 text-blue-200'}`}>
                                {r.provided ? 'Yes' : 'Predicted'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analysis Modes Selection - Always Visible */}
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 mb-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                <Activity className="h-6 w-6 text-blue-400" />
                Choose Your Analysis Mode
              </h2>
              <p className="text-gray-400">Select an analysis mode to begin predicting race performance</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Pre-Event Mode Card */}
              <button
                onClick={runPreEvent}
                disabled={!selectedTrack || !selectedSession || !selectedVehicle || !startingLap || !stintLength}
                className={`group relative bg-gradient-to-br rounded-xl p-6 border-2 transition-all duration-300 transform hover:scale-105 ${
                  activeMode === 'pre'
                    ? 'bg-gradient-to-br from-green-600 to-green-700 border-green-500 shadow-lg shadow-green-500/50'
                    : 'bg-gray-900 border-gray-700 hover:border-green-500/50'
                } ${(!selectedTrack || !selectedSession || !selectedVehicle || !startingLap || !stintLength) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-4 rounded-full mb-4 ${
                    activeMode === 'pre' ? 'bg-white/20' : 'bg-green-500/20 group-hover:bg-green-500/30'
                  } transition-colors`}>
                    <TrendingUp className={`h-8 w-8 ${
                      activeMode === 'pre' ? 'text-white' : 'text-green-400'
                    }`} />
                  </div>
                  <h3 className={`text-lg font-bold mb-2 ${
                    activeMode === 'pre' ? 'text-white' : 'text-white'
                  }`}>
                    Pre-Event Analysis
                  </h3>
                  <p className={`text-sm mb-3 ${
                    activeMode === 'pre' ? 'text-green-100' : 'text-gray-400'
                  }`}>
                    Compare predicted vs actual lap times before race starts
                  </p>
                  {activeMode === 'pre' && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {(!selectedTrack || !selectedSession || !selectedVehicle || !startingLap || !stintLength) && (
                    <div className="text-xs text-gray-500 mt-2">Configure settings first</div>
                  )}
                </div>
              </button>

              {/* Real-Time Mode Card */}
              <button
                onClick={runRealTime}
                disabled={!selectedTrack || !selectedSession || !selectedVehicle || !startingLap || !stintLength}
                className={`group relative bg-gradient-to-br rounded-xl p-6 border-2 transition-all duration-300 transform hover:scale-105 ${
                  activeMode === 'real'
                    ? 'bg-gradient-to-br from-yellow-600 to-yellow-700 border-yellow-500 shadow-lg shadow-yellow-500/50'
                    : 'bg-gray-900 border-gray-700 hover:border-yellow-500/50'
                } ${(!selectedTrack || !selectedSession || !selectedVehicle || !startingLap || !stintLength) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-4 rounded-full mb-4 ${
                    activeMode === 'real' ? 'bg-white/20' : 'bg-yellow-500/20 group-hover:bg-yellow-500/30'
                  } transition-colors`}>
                    <Zap className={`h-8 w-8 ${
                      activeMode === 'real' ? 'text-white' : 'text-yellow-400'
                    }`} />
                  </div>
                  <h3 className={`text-lg font-bold mb-2 ${
                    activeMode === 'real' ? 'text-white' : 'text-white'
                  }`}>
                    Real-Time Strategy
                  </h3>
                  <p className={`text-sm mb-3 ${
                    activeMode === 'real' ? 'text-yellow-100' : 'text-gray-400'
                  }`}>
                    Compare pit stop vs no-pit strategies during race
                  </p>
                  {activeMode === 'real' && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {(!selectedTrack || !selectedSession || !selectedVehicle || !startingLap || !stintLength) && (
                    <div className="text-xs text-gray-500 mt-2">Configure settings first</div>
                  )}
                </div>
              </button>

              {/* Post-Event Mode Card */}
              <button
                onClick={runPostEvent}
                disabled={!stintResults?.predicted_lap_times || !stintResults?.true_lap_times}
                className={`group relative bg-gradient-to-br rounded-xl p-6 border-2 transition-all duration-300 transform hover:scale-105 ${
                  activeMode === 'post'
                    ? 'bg-gradient-to-br from-purple-600 to-purple-700 border-purple-500 shadow-lg shadow-purple-500/50'
                    : 'bg-gray-900 border-gray-700 hover:border-purple-500/50'
                } ${(!stintResults?.predicted_lap_times || !stintResults?.true_lap_times) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-4 rounded-full mb-4 ${
                    activeMode === 'post' ? 'bg-white/20' : 'bg-purple-500/20 group-hover:bg-purple-500/30'
                  } transition-colors`}>
                    <BarChart3 className={`h-8 w-8 ${
                      activeMode === 'post' ? 'text-white' : 'text-purple-400'
                    }`} />
                  </div>
                  <h3 className={`text-lg font-bold mb-2 ${
                    activeMode === 'post' ? 'text-white' : 'text-white'
                  }`}>
                    Post-Event Analysis
                  </h3>
                  <p className={`text-sm mb-3 ${
                    activeMode === 'post' ? 'text-purple-100' : 'text-gray-400'
                  }`}>
                    Analyze prediction accuracy with metrics and insights
                  </p>
                  {activeMode === 'post' && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {(!stintResults?.predicted_lap_times || !stintResults?.true_lap_times) && (
                    <div className="text-xs text-gray-500 mt-2">Run a prediction first</div>
                  )}
                </div>
              </button>

              {/* Race Results Mode Card */}
              <button
                onClick={runTrueEvent}
                disabled={!selectedTrack || !selectedSession}
                className={`group relative bg-gradient-to-br rounded-xl p-6 border-2 transition-all duration-300 transform hover:scale-105 ${
                  activeMode === 'trueEvent'
                    ? 'bg-gradient-to-br from-red-600 to-red-700 border-red-500 shadow-lg shadow-red-500/50'
                    : 'bg-gray-900 border-gray-700 hover:border-red-500/50'
                } ${(!selectedTrack || !selectedSession) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-4 rounded-full mb-4 ${
                    activeMode === 'trueEvent' ? 'bg-white/20' : 'bg-red-500/20 group-hover:bg-red-500/30'
                  } transition-colors`}>
                    <Trophy className={`h-8 w-8 ${
                      activeMode === 'trueEvent' ? 'text-white' : 'text-red-400'
                    }`} />
                  </div>
                  <h3 className={`text-lg font-bold mb-2 ${
                    activeMode === 'trueEvent' ? 'text-white' : 'text-white'
                  }`}>
                    Race Results
                  </h3>
                  <p className={`text-sm mb-3 ${
                    activeMode === 'trueEvent' ? 'text-red-100' : 'text-gray-400'
                  }`}>
                    View final standings, best laps, and completion status
                  </p>
                  {activeMode === 'trueEvent' && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {(!selectedTrack || !selectedSession) && (
                    <div className="text-xs text-gray-500 mt-2">Select track & session</div>
                  )}
                </div>
              </button>

              {/* New Session Mode Card */}
              <button
                onClick={openNewSession}
                disabled={!selectedTrack}
                className={`group relative bg-gradient-to-br rounded-xl p-6 border-2 transition-all duration-300 transform hover:scale-105 ${
                  activeMode === 'newSession'
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 border-indigo-500 shadow-lg shadow-indigo-500/50'
                    : 'bg-gray-900 border-gray-700 hover:border-indigo-500/50'
                } ${!selectedTrack ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-4 rounded-full mb-4 ${
                    activeMode === 'newSession' ? 'bg-white/20' : 'bg-indigo-500/20 group-hover:bg-indigo-500/30'
                  } transition-colors`}>
                    <Sparkles className={`h-8 w-8 ${
                      activeMode === 'newSession' ? 'text-white' : 'text-indigo-400'
                    }`} />
                  </div>
                  <h3 className={`text-lg font-bold mb-2 ${
                    activeMode === 'newSession' ? 'text-white' : 'text-white'
                  }`}>
                    New Session Prediction
                  </h3>
                  <p className={`text-sm mb-3 ${
                    activeMode === 'newSession' ? 'text-indigo-100' : 'text-gray-400'
                  }`}>
                    Predict future race sessions with minimal input data
                  </p>
                  {activeMode === 'newSession' && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {!selectedTrack && (
                    <div className="text-xs text-gray-500 mt-2">Select track first</div>
                  )}
                </div>
              </button>

              {/* Quick Predict Card */}
              <button
                onClick={handlePredictStint}
                disabled={!selectedSession || !selectedVehicle || !startingLap || !stintLength || isLoading}
                className={`group relative bg-gradient-to-br rounded-xl p-6 border-2 transition-all duration-300 transform hover:scale-105 ${
                  'bg-gray-900 border-gray-700 hover:border-blue-500/50'
                } ${(!selectedSession || !selectedVehicle || !startingLap || !stintLength || isLoading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-4 rounded-full mb-4 ${
                    'bg-blue-500/20 group-hover:bg-blue-500/30'
                  } transition-colors`}>
                    <Play className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-white">
                    Quick Predict
                  </h3>
                  <p className="text-sm mb-3 text-gray-400">
                    Run a basic prediction without analysis mode
                  </p>
                  {(!selectedSession || !selectedVehicle || !startingLap || !stintLength) && (
                    <div className="text-xs text-gray-500 mt-2">Configure settings first</div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Model Capabilities Info */}
          {activeMode === null && !newSessionOpen && (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-8 mb-6 border border-gray-700">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Target className="h-6 w-6 text-blue-400" />
                What This Model Can Solve
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Currently Solved */}
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-green-400 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Currently Available
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span><strong>Pre-Event Prediction:</strong> Predict lap times before race starts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span><strong>Real-Time Strategy:</strong> Compare pit stop vs no-pit strategies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span><strong>Post-Event Analysis:</strong> Analyze prediction accuracy with metrics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span><strong>Race Results:</strong> View final standings and statistics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span><strong>New Session Prediction:</strong> Predict future sessions with minimal data</span>
                    </li>
                  </ul>
                </div>
                
                {/* Potential Extensions */}
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-yellow-400 flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Potential Extensions
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">⚡</span>
                      <span><strong>Tire Degradation:</strong> Predict tire wear and optimal pit timing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">⚡</span>
                      <span><strong>Fuel Strategy:</strong> Optimize fuel load and consumption</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">⚡</span>
                      <span><strong>Weather Impact:</strong> Predict performance under different conditions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">⚡</span>
                      <span><strong>Driver Comparison:</strong> Compare multiple drivers' performance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">⚡</span>
                      <span><strong>Setup Optimization:</strong> Recommend optimal vehicle setup</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">⚡</span>
                      <span><strong>Full Race Strategy:</strong> Optimize entire race with multiple pit stops</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-gray-300">
                  <strong className="text-blue-400">💡 Note:</strong> The model uses machine learning to predict lap times based on historical data. 
                  Current accuracy ranges from 80-98% depending on track. See <code className="bg-gray-800 px-2 py-1 rounded text-xs">PREDICTIVE_MODEL_CAPABILITIES.md</code> for detailed documentation.
                </p>
              </div>
            </div>
          )}

          {/* Empty State - Show when no mode selected and no results */}
          {!stintResults && activeMode === null && !newSessionOpen && (
            <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
              <Target className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-400">Get Started</h3>
              <p className="text-gray-500 mb-6">
                Configure your prediction settings in the sidebar, then select an analysis mode above to begin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
