import { useState, useEffect, useMemo } from 'react';
import { analysisService } from '../services/analysisService';
import { useTelemetryStore } from '../store/telemetryStore';
import { useTelemetryServiceWS } from '../services/telemetryServiceWS';
import { useLeaderboardServiceWS } from '../services/leaderboardServiceWS';
import { Zap, Clock, Target, TrendingDown, Loader2, AlertCircle, RefreshCw, Sparkles, TrendingUp, Menu, Brain } from 'lucide-react';

export function RealTimeAnalytics() {
  // Connect to real-time telemetry data
  useTelemetryServiceWS();
  useLeaderboardServiceWS();
  
  const { vehicles, leaderboard, isPlaying } = useTelemetryStore();
  
  // State declarations - must be before useMemo hooks that use them
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [currentLap, setCurrentLap] = useState<number>(0);
  const [totalLaps, setTotalLaps] = useState<number>(27);
  const [pitLap, setPitLap] = useState<number>(15);
  const [pitTime, setPitTime] = useState<number>(25.0);
  
  // Get available vehicle IDs from real data
  const availableVehicles = useMemo(() => {
    return Object.keys(vehicles).sort();
  }, [vehicles]);
  
  // Get real-time data for selected vehicle
  const selectedVehicleData = useMemo(() => {
    if (!selectedVehicle || !vehicles[selectedVehicle]) return null;
    return vehicles[selectedVehicle];
  }, [selectedVehicle, vehicles]);
  
  // Extract real current lap from vehicle telemetry
  const realCurrentLap = useMemo(() => {
    return selectedVehicleData?.telemetry?.lap || 0;
  }, [selectedVehicleData]);
  
  // Calculate total laps from leaderboard (max lap + buffer)
  const realTotalLaps = useMemo(() => {
    if (leaderboard.length === 0) return 27; // Default
    const maxLap = Math.max(...leaderboard.map(e => e.laps || 0));
    return Math.max(maxLap + 5, 27); // At least 27, or max + buffer
  }, [leaderboard]);
  
  const [gaps, setGaps] = useState<any>(null);
  const [pitWindow, setPitWindow] = useState<any>(null);
  const [strategy, setStrategy] = useState<any>(null);
  const [tireDegradation, setTireDegradation] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [performancePrediction, setPerformancePrediction] = useState<any>(null);
  
  // Predictive model integration state
  const [nextLapsPrediction, setNextLapsPrediction] = useState<any>(null);
  const [optimalPitTiming, setOptimalPitTiming] = useState<any>(null);
  const [strategyComparison, setStrategyComparison] = useState<any>(null);
  const [trackName, setTrackName] = useState<string>('Barber');
  const [raceSession, setRaceSession] = useState<string>('R1');
  
  const [loading, setLoading] = useState({
    gaps: false,
    pitWindow: false,
    strategy: false,
    tireDegradation: false,
    aiInsights: false,
    prediction: false,
    nextLaps: false,
    optimalPit: false,
    strategyCompare: false,
  });
  
  const [activeTab, setActiveTab] = useState<'gaps' | 'pit-window' | 'strategy' | 'tire-degradation' | 'predictive'>('gaps');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-select first vehicle when vehicles become available
  useEffect(() => {
    if (availableVehicles.length > 0 && !selectedVehicle) {
      setSelectedVehicle(availableVehicles[0]);
    }
  }, [availableVehicles, selectedVehicle]);

  // Update current lap from real-time data when race is playing
  useEffect(() => {
    if (isPlaying && realCurrentLap > 0) {
      setCurrentLap(realCurrentLap);
    }
  }, [isPlaying, realCurrentLap]);

  // Update total laps from real-time data
  useEffect(() => {
    if (realTotalLaps > 0) {
      setTotalLaps(realTotalLaps);
    }
  }, [realTotalLaps]);

  // Auto-refresh when race is playing
  useEffect(() => {
    if (isPlaying) {
      setAutoRefresh(true);
    }
  }, [isPlaying]);

  useEffect(() => {
    loadGaps();
  }, []);

  useEffect(() => {
    if (selectedVehicle && currentLap && totalLaps) {
      loadPitWindow();
    }
  }, [selectedVehicle, currentLap, totalLaps]);

  useEffect(() => {
    if (selectedVehicle) {
      loadTireDegradation();
      loadAIInsights();
      loadPerformancePrediction();
    }
  }, [selectedVehicle]);

  useEffect(() => {
    if (selectedVehicle && pitLap && pitTime && totalLaps) {
      loadStrategy();
    }
  }, [selectedVehicle, pitLap, pitTime, totalLaps]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        if (activeTab === 'gaps') loadGaps();
        if (activeTab === 'pit-window') loadPitWindow();
        if (activeTab === 'tire-degradation') loadTireDegradation();
        if (activeTab === 'strategy') loadStrategy();
        if (activeTab === 'predictive') {
          loadNextLapsPrediction();
          loadOptimalPitTiming();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, activeTab]);

  // Load predictive model data when vehicle/lap changes
  useEffect(() => {
    if (selectedVehicle && currentLap > 0) {
      loadNextLapsPrediction();
      loadOptimalPitTiming();
      loadStrategyComparison();
    }
  }, [selectedVehicle, currentLap, totalLaps, pitLap, trackName, raceSession]);

  const loadGaps = async () => {
    setLoading(prev => ({ ...prev, gaps: true }));
    try {
      const data = await analysisService.getRealTimeGaps();
      setGaps(data);
    } catch (error) {
      console.error('Failed to load gaps:', error);
    } finally {
      setLoading(prev => ({ ...prev, gaps: false }));
    }
  };

  const loadPitWindow = async () => {
    if (!selectedVehicle || currentLap <= 0) {
      setPitWindow(null);
      return;
    }
    setLoading(prev => ({ ...prev, pitWindow: true }));
    try {
      const data = await analysisService.getPitWindowAnalysis(selectedVehicle, currentLap, totalLaps);
      setPitWindow(data);
    } catch (error: any) {
      console.error('Failed to load pit window:', error);
      // Set error state for better UX
      setPitWindow({
        error: error.message || 'Failed to load pit window data',
        vehicle_id: selectedVehicle,
        current_lap: currentLap
      });
    } finally {
      setLoading(prev => ({ ...prev, pitWindow: false }));
    }
  };

  const loadStrategy = async () => {
    setLoading(prev => ({ ...prev, strategy: true }));
    try {
      const data = await analysisService.getStrategySimulation(selectedVehicle, pitLap, pitTime, totalLaps);
      setStrategy(data);
    } catch (error) {
      console.error('Failed to load strategy:', error);
    } finally {
      setLoading(prev => ({ ...prev, strategy: false }));
    }
  };

  const loadTireDegradation = async () => {
    setLoading(prev => ({ ...prev, tireDegradation: true }));
    try {
      const data = await analysisService.getTireDegradation(selectedVehicle);
      setTireDegradation(data);
    } catch (error) {
      console.error('Failed to load tire degradation:', error);
    } finally {
      setLoading(prev => ({ ...prev, tireDegradation: false }));
    }
  };

  const loadAIInsights = async () => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, aiInsights: true }));
    try {
      const data = await analysisService.getAIDriverInsights(selectedVehicle);
      setAiInsights(data);
    } catch (error) {
      console.error('Failed to load AI insights:', error);
    } finally {
      setLoading(prev => ({ ...prev, aiInsights: false }));
    }
  };

  const loadPerformancePrediction = async () => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, prediction: true }));
    try {
      const data = await analysisService.getPerformancePrediction(selectedVehicle, 5);
      setPerformancePrediction(data);
    } catch (error) {
      console.error('Failed to load performance prediction:', error);
    } finally {
      setLoading(prev => ({ ...prev, prediction: false }));
    }
  };

  // Predictive model integration functions
  const loadNextLapsPrediction = async () => {
    if (!selectedVehicle || currentLap <= 0) return;
    setLoading(prev => ({ ...prev, nextLaps: true }));
    try {
      const data = await analysisService.getPredictNextLaps(
        selectedVehicle,
        currentLap,
        5, // Predict next 5 laps
        trackName,
        raceSession
      );
      setNextLapsPrediction(data);
    } catch (error) {
      console.error('Failed to load next laps prediction:', error);
    } finally {
      setLoading(prev => ({ ...prev, nextLaps: false }));
    }
  };

  const loadOptimalPitTiming = async () => {
    if (!selectedVehicle || currentLap <= 0) return;
    setLoading(prev => ({ ...prev, optimalPit: true }));
    try {
      const data = await analysisService.getOptimalPitTimingPredictive(
        selectedVehicle,
        currentLap,
        totalLaps,
        trackName,
        raceSession
      );
      setOptimalPitTiming(data);
    } catch (error) {
      console.error('Failed to load optimal pit timing:', error);
    } finally {
      setLoading(prev => ({ ...prev, optimalPit: false }));
    }
  };

  const loadStrategyComparison = async () => {
    if (!selectedVehicle || currentLap <= 0) return;
    setLoading(prev => ({ ...prev, strategyCompare: true }));
    try {
      const data = await analysisService.getStrategyComparisonPredictive({
        vehicleId: selectedVehicle,
        currentLap: currentLap,
        totalLaps: totalLaps,
        trackName: trackName,
        raceSession: raceSession,
        pitLap: pitLap
      });
      setStrategyComparison(data);
    } catch (error) {
      console.error('Failed to load strategy comparison:', error);
    } finally {
      setLoading(prev => ({ ...prev, strategyCompare: false }));
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-white">Real-Time Analytics</h1>
              {isPlaying ? (
                <span className="px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  LIVE
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-600 text-white text-sm font-semibold rounded-full">
                  PAUSED
                </span>
              )}
            </div>
            <p className="text-gray-400">
              {availableVehicles.length > 0 
                ? `Live race data for ${availableVehicles.length} vehicle(s)` 
                : 'Waiting for race data...'}
            </p>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
              ${autoRefresh 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }
            `}
          >
            <RefreshCw className={`h-5 w-5 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>{autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}</span>
          </button>
        </div>

        {/* Vehicle Selection */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle ID</label>
              {availableVehicles.length > 0 ? (
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  {availableVehicles.map((vid) => (
                    <option key={vid} value={vid}>
                      {vid}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  placeholder="No vehicles available"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Current Lap
                {isPlaying && realCurrentLap > 0 && (
                  <span className="ml-2 text-green-400 text-xs">(Live: {realCurrentLap})</span>
                )}
              </label>
              <input
                type="number"
                value={isPlaying && realCurrentLap > 0 ? realCurrentLap : currentLap}
                onChange={(e) => setCurrentLap(parseInt(e.target.value) || 0)}
                disabled={isPlaying && realCurrentLap > 0}
                className={`w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white ${
                  isPlaying && realCurrentLap > 0 ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Total Laps
                {realTotalLaps > 0 && (
                  <span className="ml-2 text-green-400 text-xs">(Est: {realTotalLaps})</span>
                )}
              </label>
              <input
                type="number"
                value={totalLaps}
                onChange={(e) => setTotalLaps(parseInt(e.target.value) || 27)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Pit Time (s)</label>
              <input
                type="number"
                step="0.1"
                value={pitTime}
                onChange={(e) => setPitTime(parseFloat(e.target.value) || 25.0)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
            </div>
          </div>
        </div>

        {/* AI Insights Banner */}
        {(aiInsights || performancePrediction) && (
          <div className="mb-6 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl p-6 border border-purple-500/50">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="h-6 w-6 text-purple-400" />
              <h3 className="text-xl font-bold text-white">AI-Powered Real-Time Analysis</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {performancePrediction && (
                <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-yellow-400" />
                    <h4 className="text-white font-semibold">Performance Forecast</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Next Lap:</span>
                      <span className="text-white font-bold">
                        {performancePrediction.next_lap_prediction 
                          ? `${Math.floor(performancePrediction.next_lap_prediction / 60)}:${(performancePrediction.next_lap_prediction % 60).toFixed(3).padStart(6, '0')}`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Trend:</span>
                      <span className={`font-semibold ${
                        performancePrediction.trend === 'improving' ? 'text-green-400' :
                        performancePrediction.trend === 'declining' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {performancePrediction.trend || 'Stable'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Confidence:</span>
                      <span className="text-white font-bold">
                        {performancePrediction.confidence 
                          ? `${Math.round(performancePrediction.confidence * 100)}%`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {aiInsights?.summary && (
                <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-green-400" />
                    <h4 className="text-white font-semibold">AI Insights Summary</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Insights:</span>
                      <span className="text-white font-bold">{aiInsights.summary.total_insights || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">High Priority:</span>
                      <span className="text-red-400 font-bold">{aiInsights.summary.priority_insights?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Consistency:</span>
                      <span className="text-white font-bold">
                        {aiInsights.summary.consistency_score !== null && aiInsights.summary.consistency_score !== undefined
                          ? `${Math.round(100 - (aiInsights.summary.consistency_score * 10))}%`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {aiInsights?.insights && aiInsights.insights.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <h4 className="text-white font-semibold text-sm mb-3">Top AI Recommendations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aiInsights.insights.slice(0, 4).map((insight: any, idx: number) => {
                    const IconComponent = insight.severity === 'high' 
                      ? AlertCircle 
                      : insight.severity === 'medium'
                      ? TrendingUp
                      : Target;
                    const iconColor = insight.severity === 'high' 
                      ? 'text-red-400' 
                      : insight.severity === 'medium'
                      ? 'text-yellow-400'
                      : 'text-green-400';
                    
                    return (
                      <div key={idx} className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
                        <div className="flex items-start gap-2">
                          <IconComponent className={`h-4 w-4 ${iconColor} mt-0.5 flex-shrink-0`} />
                          <div className="flex-1">
                            <h5 className="text-white font-semibold text-xs">{insight.title}</h5>
                            <p className="text-gray-400 text-xs mt-1">{insight.description}</p>
                            {insight.action && (
                              <p className="text-blue-400 text-xs mt-1">{insight.action}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Track & Session Selection for Predictive Model */}
        {activeTab === 'predictive' && (
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Track Name</label>
                <select
                  value={trackName}
                  onChange={(e) => setTrackName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  <option value="Barber">Barber</option>
                  <option value="Circuit of the Americas">Circuit of the Americas</option>
                  <option value="Road America">Road America</option>
                  <option value="Sonoma">Sonoma</option>
                  <option value="Virginia International Raceway">Virginia International Raceway</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Race Session</label>
                <select
                  value={raceSession}
                  onChange={(e) => setRaceSession(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  <option value="R1">Race 1</option>
                  <option value="R2">Race 2</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-700 overflow-x-auto">
          {[
            { id: 'gaps', label: 'Real-Time Gaps', icon: Zap },
            { id: 'pit-window', label: 'Pit Window', icon: Clock },
            { id: 'strategy', label: 'Strategy', icon: Target },
            { id: 'tire-degradation', label: 'Tire Degradation', icon: TrendingDown },
            { id: 'predictive', label: 'ML Predictions', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center space-x-2 px-6 py-3 border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-yellow-500 text-yellow-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Gaps Tab */}
        {activeTab === 'gaps' && (
          <div className="space-y-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={loadGaps}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
            {loading.gaps ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
              </div>
            ) : (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">Real-Time Gaps</h2>
                {leaderboard.length > 0 ? (
                  <div className="space-y-3">
                    {leaderboard.map((entry, idx: number) => (
                      <div key={entry.vehicle_id || idx} className="bg-gray-900/50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-blue-400 font-semibold">Vehicle {entry.vehicle_id}</span>
                            <span className="text-gray-400 ml-4">Position: {entry.position}</span>
                            {entry.laps !== undefined && (
                              <span className="text-gray-400 ml-4">Lap: {entry.laps}</span>
                            )}
                          </div>
                          <div className="text-right">
                            {entry.gap_first && (
                              <div className="text-white font-bold">
                                {entry.gap_first}
                              </div>
                            )}
                            {entry.lap_time && (
                              <div className="text-gray-400 text-sm">
                                Lap: {entry.lap_time}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : gaps?.gaps && gaps.gaps.length > 0 ? (
                  <div className="space-y-3">
                    {gaps.gaps.map((gap: any, idx: number) => (
                      <div key={idx} className="bg-gray-900/50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-blue-400 font-semibold">Vehicle {gap.vehicle_id}</span>
                            <span className="text-gray-400 ml-4">Position: {gap.position}</span>
                          </div>
                          <div className="text-white font-bold">
                            {gap.gap_to_leader || 'N/A'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">
                    {isPlaying ? 'Waiting for race data...' : 'No gap data available. Start the race to see live data.'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pit Window Tab */}
        {activeTab === 'pit-window' && (
          <div className="space-y-6">
            {(!selectedVehicle || currentLap <= 0) ? (
              <div className="text-center py-12 text-gray-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p>Please select a vehicle and set current lap</p>
              </div>
            ) : loading.pitWindow ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
              </div>
            ) : pitWindow ? (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">Pit Window Analysis</h2>
                
                {/* Error Display */}
                {pitWindow.error && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle className="h-5 w-5" />
                      <span>{pitWindow.error}</span>
                    </div>
                  </div>
                )}
                
                {/* Optimal Windows */}
                {pitWindow.optimal_windows && pitWindow.optimal_windows.length > 0 ? (
                  <div className="space-y-4">
                    {pitWindow.optimal_windows.map((window: any, idx: number) => (
                      <div key={idx} className={`bg-gray-900/50 rounded-lg p-4 border ${
                        window.net_effect_seconds < 0 ? 'border-green-500/50' : 'border-gray-700'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold">Window {idx + 1}</span>
                          <span className={`text-sm font-semibold ${
                            window.net_effect_seconds < 0 ? 'text-green-400' : 'text-yellow-400'
                          }`}>
{typeof window.recommendation === 'string' 
                              ? window.recommendation 
                              : window.recommendation?.message || window.recommendation?.description || JSON.stringify(window.recommendation) || 'N/A'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-gray-400">Optimal Lap:</span>
                            <span className="text-white ml-2 font-bold">Lap {window.optimal_lap || window.start_lap || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Window:</span>
                            <span className="text-white ml-2">Laps {window.start_lap || 'N/A'} - {window.end_lap || 'N/A'}</span>
                          </div>
                          {window.net_effect_seconds !== undefined && (
                            <div>
                              <span className="text-gray-400">Net Effect:</span>
                              <span className={`ml-2 font-bold ${
                                window.net_effect_seconds < 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {window.net_effect_seconds >= 0 ? '+' : ''}{window.net_effect_seconds.toFixed(2)}s
                              </span>
                            </div>
                          )}
                          {window.estimated_time_gain !== undefined && (
                            <div>
                              <span className="text-gray-400">Time Gain:</span>
                              <span className="text-green-400 ml-2 font-bold">
                                {window.estimated_time_gain >= 0 ? '+' : ''}{window.estimated_time_gain.toFixed(2)}s
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pitWindow.strategies && pitWindow.strategies.length > 0 ? (
                  // Fallback to strategies format
                  <div className="space-y-4">
                    {pitWindow.strategies.map((strategy: any, idx: number) => (
                      <div key={idx} className="bg-gray-900/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold">{strategy.strategy || `Strategy ${idx + 1}`}</span>
                          <span className="text-green-400 text-sm">
                            {typeof strategy.recommendation === 'string' 
                              ? strategy.recommendation 
                              : strategy.recommendation?.message || strategy.recommendation?.description || JSON.stringify(strategy.recommendation) || 'N/A'}
                          </span>
                        </div>
                        <div className="text-gray-300 text-sm">
                          {strategy.pit_lap ? `Pit at Lap ${strategy.pit_lap}` : 'No pit stop'}
                          {strategy.net_effect_seconds !== undefined && (
                            <span className="ml-4">
                              Net Effect: <span className={strategy.net_effect_seconds < 0 ? 'text-green-400' : 'text-red-400'}>
                                {strategy.net_effect_seconds >= 0 ? '+' : ''}{strategy.net_effect_seconds.toFixed(2)}s
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No pit window data available</p>
                    {pitWindow.remaining_laps !== undefined && (
                      <p className="text-sm mt-2">Remaining laps: {pitWindow.remaining_laps}</p>
                    )}
                  </div>
                )}
                
                {/* Additional Info */}
                {pitWindow.tire_degradation_per_lap_seconds !== undefined && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Tire Degradation:</span>
                        <span className="text-white ml-2 font-bold">
                          {pitWindow.tire_degradation_per_lap_seconds.toFixed(3)}s per lap
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Estimated Pit Time:</span>
                        <span className="text-white ml-2 font-bold">
                          {pitWindow.estimated_pit_time_seconds?.toFixed(1) || 'N/A'}s
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p>Failed to load pit window data</p>
                <p className="text-sm mt-2">Make sure vehicle is selected and current lap is set</p>
              </div>
            )}
          </div>
        )}

        {/* Strategy Tab */}
        {activeTab === 'strategy' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Pit Lap</label>
                  <input
                    type="number"
                    value={pitLap}
                    onChange={(e) => setPitLap(parseInt(e.target.value) || 15)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Pit Time (seconds)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={pitTime}
                    onChange={(e) => setPitTime(parseFloat(e.target.value) || 25.0)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>

            {loading.strategy ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
              </div>
            ) : strategy ? (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">Strategy Simulation</h2>
                {strategy.comparison && (
                  <div className="space-y-4">
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-gray-400 text-sm mb-1">Time Difference</div>
                      <div className={`text-2xl font-bold ${strategy.comparison.time_difference_seconds < 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {strategy.comparison.time_difference_seconds > 0 ? '+' : ''}
                        {strategy.comparison.time_difference_seconds?.toFixed(2) || 'N/A'}s
                      </div>
                      <div className="text-gray-300 mt-2">
{typeof strategy.comparison.recommendation === 'string' 
                          ? strategy.comparison.recommendation 
                          : strategy.comparison.recommendation?.message || strategy.comparison.recommendation?.description || JSON.stringify(strategy.comparison.recommendation) || 'No recommendation'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p>Failed to load strategy data</p>
              </div>
            )}
          </div>
        )}

        {/* Tire Degradation Tab */}
        {activeTab === 'tire-degradation' && (
          <div className="space-y-6">
            {loading.tireDegradation ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
              </div>
            ) : tireDegradation ? (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">Tire Degradation Analysis</h2>
                {tireDegradation.degradation_analysis && (
                  <div className="space-y-4">
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-gray-400 text-sm mb-1">Degradation Rate</div>
                      <div className="text-2xl font-bold text-white">
                        {tireDegradation.degradation_analysis.degradation_per_lap || 'N/A'}s per lap
                      </div>
                    </div>
                    {tireDegradation.recommendation && (
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <div className="text-gray-400 text-sm mb-1">Recommendation</div>
                        <div className="text-white">
                          {typeof tireDegradation.recommendation === 'string' 
                            ? tireDegradation.recommendation
                            : tireDegradation.recommendation?.message || JSON.stringify(tireDegradation.recommendation)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p>Failed to load tire degradation data</p>
              </div>
            )}
          </div>
        )}

        {/* Predictive Model Tab */}
        {activeTab === 'predictive' && (
          <div className="space-y-6">
            {(!selectedVehicle || currentLap <= 0) ? (
              <div className="text-center py-12 text-gray-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p>Please select a vehicle and ensure current lap is set</p>
              </div>
            ) : (
              <>
                {/* Next Laps Prediction */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Sparkles className="h-6 w-6 text-yellow-400" />
                      Next Laps Prediction (ML Model)
                    </h2>
                    {loading.nextLaps && <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />}
                  </div>
                  {nextLapsPrediction ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <div className="text-gray-400 text-sm mb-1">Average Predicted</div>
                          <div className="text-2xl font-bold text-white">
                            {nextLapsPrediction.average_predicted_time?.toFixed(2) || 'N/A'}s
                          </div>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <div className="text-gray-400 text-sm mb-1">Best Predicted</div>
                          <div className="text-2xl font-bold text-green-400">
                            {nextLapsPrediction.best_predicted_time?.toFixed(2) || 'N/A'}s
                          </div>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <div className="text-gray-400 text-sm mb-1">Confidence</div>
                          <div className="text-2xl font-bold text-yellow-400">
                            {nextLapsPrediction.confidence?.toFixed(0) || 'N/A'}%
                          </div>
                        </div>
                      </div>
                      {nextLapsPrediction.predicted_next_laps && (
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <h3 className="text-white font-semibold mb-3">Predicted Lap Times</h3>
                          <div className="grid grid-cols-5 gap-2">
                            {nextLapsPrediction.predicted_next_laps.map((time: number, idx: number) => (
                              <div key={idx} className="text-center p-2 bg-gray-800 rounded">
                                <div className="text-gray-400 text-xs">Lap {currentLap + idx + 1}</div>
                                <div className="text-white font-bold">{time.toFixed(2)}s</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {nextLapsPrediction.recommendations && (
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                          <h3 className="text-blue-400 font-semibold mb-2">Recommendations</h3>
                          <ul className="space-y-1 text-sm text-gray-300">
                            {nextLapsPrediction.recommendations.map((rec: any, idx: number) => (
                              <li key={idx}>• {typeof rec === 'string' ? rec : rec?.message || rec?.description || JSON.stringify(rec)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400">Click refresh to load predictions</p>
                  )}
                </div>

                {/* Optimal Pit Timing */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Target className="h-6 w-6 text-green-400" />
                      Optimal Pit Stop Timing (ML Model)
                    </h2>
                    {loading.optimalPit && <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />}
                  </div>
                  {optimalPitTiming ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-lg p-6 border border-green-500/30">
                        <div className="text-gray-400 text-sm mb-2">Recommended Pit Stop</div>
                        <div className="text-3xl font-bold text-green-400 mb-2">
                          Lap {optimalPitTiming.optimal_pit_lap}
                        </div>
                        <div className="text-gray-300">
                          Predicted Total Time: {optimalPitTiming.optimal_total_time?.toFixed(2) || 'N/A'}s
                        </div>
                        {optimalPitTiming.recommendation && (
                          <div className="mt-3 text-sm text-gray-300">
                            {typeof optimalPitTiming.recommendation === 'string' 
                              ? optimalPitTiming.recommendation
                              : optimalPitTiming.recommendation?.message || optimalPitTiming.recommendation?.description || JSON.stringify(optimalPitTiming.recommendation)}
                          </div>
                        )}
                      </div>
                      {optimalPitTiming.all_scenarios && optimalPitTiming.all_scenarios.length > 0 && (
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <h3 className="text-white font-semibold mb-3">All Scenarios</h3>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {optimalPitTiming.all_scenarios.slice(0, 5).map((scenario: any, idx: number) => (
                              <div key={idx} className={`p-3 rounded ${scenario.pit_lap === optimalPitTiming.optimal_pit_lap ? 'bg-green-900/30 border border-green-500/50' : 'bg-gray-800'}`}>
                                <div className="flex justify-between items-center">
                                  <span className="text-white">Lap {scenario.pit_lap}</span>
                                  <span className="text-gray-300">{scenario.total_time?.toFixed(2)}s</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400">Click refresh to load optimal pit timing</p>
                  )}
                </div>

                {/* Strategy Comparison */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <TrendingUp className="h-6 w-6 text-purple-400" />
                      Strategy Comparison (ML Model)
                    </h2>
                    {loading.strategyCompare && <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />}
                  </div>
                  {strategyComparison ? (
                    <div className="space-y-4">
                      {strategyComparison.best_strategy && (
                        <div className={`bg-gradient-to-r rounded-lg p-6 border-2 ${
                          strategyComparison.best_strategy === 'no_pit'
                            ? 'from-blue-900/30 to-cyan-900/30 border-blue-500/50'
                            : 'from-orange-900/30 to-red-900/30 border-orange-500/50'
                        }`}>
                          <div className="text-gray-400 text-sm mb-2">Best Strategy</div>
                          <div className="text-2xl font-bold text-white mb-2">
                            {strategyComparison.best_strategy === 'no_pit' ? 'No Pit Stop' : 'With Pit Stop'}
                          </div>
                          <div className="text-gray-300">
                            Time Difference: {strategyComparison.time_difference?.toFixed(2) || 'N/A'}s
                          </div>
                        </div>
                      )}
                      {strategyComparison.strategies && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {strategyComparison.strategies.no_pit && (
                            <div className="bg-gray-900/50 rounded-lg p-4">
                              <h3 className="text-white font-semibold mb-3">No Pit Stop Strategy</h3>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Total Time:</span>
                                  <span className="text-white font-bold">{strategyComparison.strategies.no_pit.total_time?.toFixed(2)}s</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Average Lap:</span>
                                  <span className="text-white">{strategyComparison.strategies.no_pit.average_lap?.toFixed(2)}s</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Best Lap:</span>
                                  <span className="text-green-400">{strategyComparison.strategies.no_pit.best_lap?.toFixed(2)}s</span>
                                </div>
                              </div>
                            </div>
                          )}
                          {strategyComparison.strategies.with_pit && (
                            <div className="bg-gray-900/50 rounded-lg p-4">
                              <h3 className="text-white font-semibold mb-3">With Pit Stop Strategy</h3>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Total Time:</span>
                                  <span className="text-white font-bold">{strategyComparison.strategies.with_pit.total_time?.toFixed(2)}s</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Pit Lap:</span>
                                  <span className="text-white">Lap {strategyComparison.strategies.with_pit.pit_lap}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Pit Time:</span>
                                  <span className="text-white">{strategyComparison.strategies.with_pit.pit_time?.toFixed(2)}s</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Average Lap:</span>
                                  <span className="text-white">{strategyComparison.strategies.with_pit.average_lap?.toFixed(2)}s</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {strategyComparison.recommendation && (
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                          <p className="text-blue-300">
                            {typeof strategyComparison.recommendation === 'string' 
                              ? strategyComparison.recommendation
                              : strategyComparison.recommendation?.message || strategyComparison.recommendation?.description || JSON.stringify(strategyComparison.recommendation)}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400">Click refresh to load strategy comparison</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

