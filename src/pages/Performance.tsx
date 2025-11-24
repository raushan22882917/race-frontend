import { useState, useEffect, useMemo } from 'react';
import { analysisService } from '../services/analysisService';
import { useTelemetryStore } from '../store/telemetryStore';
import { DriverSidebar } from '../components/DriverSidebar';
import { 
  ArrowUp, ArrowDown, Loader2, AlertCircle,
  CheckCircle, AlertTriangle, Timer, Calendar, TrendingUp, ChevronDown,
  Brain, Sparkles, Zap, Activity, Target, BarChart3
} from 'lucide-react';

interface Vehicle {
  id: string;
  name: string;
  file?: string;
  vehicle_number?: number;
  car_number?: number;
  driver_number?: number;
  has_endurance_data?: boolean;
}

type TabId = 'ai-insights' | 'racing-line' | 'braking' | 'cornering' | 'best-worst' | 'improvements' | 'comparison';

export function Performance() {
  const { vehicles: telemetryVehicles, leaderboard, selectedVehicleId: storeSelectedVehicle, setSelectedVehicle: setStoreSelectedVehicle } = useTelemetryStore();
  
  // State declarations
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedLap, setSelectedLap] = useState<string>('best');
  const [timeRange, setTimeRange] = useState<string>('last-session');
  const [activeTab, setActiveTab] = useState<TabId>('ai-insights');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Data states
  const [vehicleInfoMap, setVehicleInfoMap] = useState<Record<string, Vehicle>>({});
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [bestWorst, setBestWorst] = useState<any>(null);
  const [improvements, setImprovements] = useState<any>(null);
  const [performancePrediction, setPerformancePrediction] = useState<any>(null);
  const [sectorAI, setSectorAI] = useState<Record<string, any>>({});
  
  const [loading, setLoading] = useState({
    aiInsights: false,
    bestWorst: false,
    improvements: false,
    prediction: false,
    sectors: false,
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

  // Load data when vehicle changes
  useEffect(() => {
    if (selectedVehicle) {
      loadAIInsights();
      loadBestWorst();
      loadImprovements();
      loadPerformancePrediction();
      loadSectorAI();
    }
  }, [selectedVehicle]);

  const loadAIInsights = async () => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, aiInsights: true }));
    try {
      const data = await analysisService.getAIDriverInsights(selectedVehicle);
      setAiInsights(data);
    } catch (error: any) {
      console.error('Failed to load AI insights:', error);
      setAiInsights({ error: error.message || 'No AI insights available' });
    } finally {
      setLoading(prev => ({ ...prev, aiInsights: false }));
    }
  };

  const loadBestWorst = async () => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, bestWorst: true }));
    try {
      const data = await analysisService.getBestWorstLapAnalysis(selectedVehicle);
      setBestWorst(data);
    } catch (error: any) {
      console.error('Failed to load best/worst analysis:', error);
      setBestWorst({ error: error.message || 'No best/worst data available' });
    } finally {
      setLoading(prev => ({ ...prev, bestWorst: false }));
    }
  };

  const loadImprovements = async () => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, improvements: true }));
    try {
      const data = await analysisService.getImprovementOpportunities(selectedVehicle);
      setImprovements(data);
    } catch (error: any) {
      console.error('Failed to load improvements:', error);
      setImprovements({ error: error.message || 'No improvement data available' });
    } finally {
      setLoading(prev => ({ ...prev, improvements: false }));
    }
  };

  const loadPerformancePrediction = async () => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, prediction: true }));
    try {
      const data = await analysisService.getPerformancePrediction(selectedVehicle, 5);
      setPerformancePrediction(data);
    } catch (error: any) {
      console.error('Failed to load performance prediction:', error);
    } finally {
      setLoading(prev => ({ ...prev, prediction: false }));
    }
  };

  const loadSectorAI = async () => {
    if (!selectedVehicle) return;
    setLoading(prev => ({ ...prev, sectors: true }));
    try {
      const sectors = ['S1', 'S2', 'S3'];
      const sectorData: Record<string, any> = {};
      
      for (const sector of sectors) {
        try {
          const data = await analysisService.getSectorAIAnalysis(selectedVehicle, sector);
          sectorData[sector] = data;
        } catch (error) {
          console.error(`Failed to load sector ${sector} AI:`, error);
        }
      }
      
      setSectorAI(sectorData);
    } catch (error: any) {
      console.error('Failed to load sector AI:', error);
    } finally {
      setLoading(prev => ({ ...prev, sectors: false }));
    }
  };

  // Get selected vehicle info
  const selectedVehicleInfo = useMemo(() => {
    return vehicles.find(v => v.id === selectedVehicle);
  }, [vehicles, selectedVehicle]);

  // Calculate metrics from real data
  const metrics = useMemo(() => {
    const bestLapTime = aiInsights?.summary?.best_lap_time;
    const avgLapTime = aiInsights?.summary?.average_lap_time;
    const consistencyScore = aiInsights?.summary?.consistency_score;
    const potentialGain = bestWorst?.total_difference_seconds || 
      (bestLapTime && avgLapTime ? avgLapTime - bestLapTime : null);

    return {
      bestLap: bestLapTime ? formatLapTime(bestLapTime) : 'N/A',
      averageLap: avgLapTime ? formatLapTime(avgLapTime) : 'N/A',
      consistency: consistencyScore !== null && consistencyScore !== undefined
        ? Math.max(0, Math.min(100, Math.round(100 - (consistencyScore * 10))))
        : null,
      potentialGain: potentialGain !== null ? potentialGain.toFixed(3) : null,
      bestLapDiff: bestLapTime && avgLapTime ? (avgLapTime - bestLapTime).toFixed(3) : null,
    };
  }, [aiInsights, bestWorst]);

  function formatLapTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${minutes}:${secs.padStart(6, '0')}`;
  }

  // Get actionable recommendations with AI-powered prioritization
  const recommendations = useMemo(() => {
    const recs: any[] = [];
    
    // Add AI insights as recommendations (prioritized)
    if (aiInsights?.insights) {
      aiInsights.insights.forEach((insight: any) => {
        recs.push({
          type: insight.severity === 'high' ? 'error' : insight.severity === 'medium' ? 'warning' : 'success',
          title: insight.title,
          description: insight.description,
          action: insight.action,
          potentialGain: insight.potential_gain || null,
          category: insight.category || 'General',
          priority: insight.severity === 'high' ? 1 : insight.severity === 'medium' ? 2 : 3,
        });
      });
    }
    
    // Add AI recommendations from insights
    if (aiInsights?.recommendations) {
      aiInsights.recommendations.forEach((rec: any) => {
        const expectedImprovement = typeof rec.expected_improvement === 'object' 
          ? (rec.expected_improvement?.expected_improvement || rec.expected_improvement?.rate_per_lap || null)
          : rec.expected_improvement;
        recs.push({
          type: rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'success',
          title: rec.title,
          description: rec.description,
          action: rec.action_items?.join('; ') || (typeof expectedImprovement === 'string' || typeof expectedImprovement === 'number' ? expectedImprovement : null),
          potentialGain: expectedImprovement || null,
          category: rec.category || 'Training',
          priority: rec.priority === 'high' ? 1 : rec.priority === 'medium' ? 2 : 3,
          actionItems: rec.action_items || [],
        });
      });
    }
    
    // Add improvement opportunities
    if (improvements?.opportunities) {
      improvements.opportunities.forEach((opp: any) => {
        const expectedImprovement = typeof opp.expected_improvement === 'object' 
          ? (opp.expected_improvement?.expected_improvement || opp.expected_improvement?.rate_per_lap || null)
          : opp.expected_improvement;
        recs.push({
          type: opp.priority === 'high' ? 'error' : 'warning',
          title: opp.title || opp.description,
          description: opp.description || opp.recommendation,
          action: opp.recommendation || opp.action_items?.join('; '),
          potentialGain: opp.potential_gain || expectedImprovement || null,
          category: opp.category || 'Improvement',
          priority: opp.priority === 'high' ? 1 : opp.priority === 'medium' ? 2 : 3,
          actionItems: opp.action_items || [],
        });
      });
    }
    
    // Add AI patterns as insights
    if (aiInsights?.patterns) {
      aiInsights.patterns.forEach((pattern: any) => {
        recs.push({
          type: 'success',
          title: `Pattern: ${pattern.type || 'Driver Pattern'}`,
          description: pattern.description || pattern.implication,
          action: pattern.recommendation || pattern.action,
          category: 'Pattern Analysis',
          priority: 3,
        });
      });
    }
    
    // Sort by priority (high priority first)
    recs.sort((a, b) => (a.priority || 3) - (b.priority || 3));
    
    return recs.slice(0, 15); // Show top 15 recommendations
  }, [aiInsights, improvements]);

  // Get AI patterns
  const aiPatterns = useMemo(() => {
    return aiInsights?.patterns || [];
  }, [aiInsights]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'ai-insights', label: 'AI Insights' },
    { id: 'racing-line', label: 'Racing Line' },
    { id: 'braking', label: 'Braking' },
    { id: 'cornering', label: 'Cornering' },
    { id: 'best-worst', label: 'Best/Worst' },
    { id: 'improvements', label: 'Improvements' },
    { id: 'comparison', label: 'Comparison' },
  ];

  return (
    <div className="w-full bg-[#101c22] min-h-screen flex">
      {/* Sidebar */}
      <DriverSidebar
        collapsed={sidebarCollapsed}
        onCollapseChange={setSidebarCollapsed}
        activePage="performance"
        onPageChange={(page) => {
          // Handle navigation to other driver pages
          if (page !== 'performance') {
            // Could navigate back to Driver Training Insights or other pages
            console.log('Navigate to:', page);
          }
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">
                  Performance Overview
                </h1>
                <p className="text-[#9db0b9] text-base font-normal leading-normal">
                  Real-time driver performance metrics and insights
                </p>
              </div>
              
              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-3">
                {/* Lap Selector */}
                <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#111618] px-4 py-2 border border-[#3b4b54] hover:border-blue-500 hover:text-blue-400 transition-colors">
                  <Timer className="h-5 w-5 text-white" />
                  <p className="text-white text-sm font-medium leading-normal">
                    Lap: {selectedLap === 'best' ? 'Best Lap' : selectedLap === 'worst' ? 'Worst Lap' : `Lap ${selectedLap}`}
                  </p>
                  <ChevronDown className="h-5 w-5 text-white" />
                </button>

                {/* Time Range Selector */}
                <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#111618] px-4 py-2 border border-[#3b4b54] hover:border-blue-500 hover:text-blue-400 transition-colors">
                  <Calendar className="h-5 w-5 text-white" />
                  <p className="text-white text-sm font-medium leading-normal">
                    Time Range: {timeRange === 'last-session' ? 'Last Session' : 'All Sessions'}
                  </p>
                  <ChevronDown className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Best Lap */}
              <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 bg-[#111618] border border-[#3b4b54]">
                <p className="text-gray-400 text-base font-medium leading-normal">Best Lap</p>
                <p className="text-white tracking-light text-2xl font-bold leading-tight">
                {loading.aiInsights ? (
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                ) : (
                  metrics.bestLap
                )}
              </p>
              <div className="flex items-center gap-1">
                <ArrowUp className="h-4 w-4 text-[#0bda57]" />
                <p className="text-[#0bda57] text-base font-medium leading-normal">
                  {metrics.bestLapDiff ? `-${metrics.bestLapDiff}s` : 'Personal best'}
                </p>
              </div>
            </div>

              {/* Average Lap */}
              <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 bg-[#111618] border border-[#3b4b54]">
                <p className="text-gray-400 text-base font-medium leading-normal">Average Lap</p>
                <p className="text-white tracking-light text-2xl font-bold leading-tight">
                {loading.aiInsights ? (
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                ) : (
                  metrics.averageLap
                )}
              </p>
              <div className="flex items-center gap-1">
                <ArrowDown className="h-4 w-4 text-[#fa5f38]" />
                <p className="text-[#fa5f38] text-base font-medium leading-normal">
                  {metrics.bestLapDiff ? `+${metrics.bestLapDiff}s` : 'vs best'}
                </p>
              </div>
            </div>

              {/* Consistency Score */}
              <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 bg-[#111618] border border-[#3b4b54]">
                <p className="text-gray-400 text-base font-medium leading-normal">Consistency Score</p>
                <p className="text-white tracking-light text-2xl font-bold leading-tight">
                {loading.aiInsights ? (
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                ) : metrics.consistency !== null ? (
                  `${metrics.consistency}%`
                ) : (
                  'N/A'
                )}
              </p>
              <div className="flex items-center gap-1">
                <ArrowUp className="h-4 w-4 text-[#0bda57]" />
                <p className="text-[#0bda57] text-base font-medium leading-normal">
                  {metrics.consistency !== null
                    ? metrics.consistency >= 90 ? '+2%' : metrics.consistency >= 80 ? '+1%' : 'Needs work'
                    : 'N/A'}
                </p>
              </div>
            </div>

              {/* Potential Gain */}
              <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 bg-[#111618] border border-[#3b4b54]">
                <p className="text-gray-400 text-base font-medium leading-normal">Potential Gain</p>
                <p className="text-white tracking-light text-2xl font-bold leading-tight">
                {loading.bestWorst ? (
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                ) : metrics.potentialGain ? (
                  `-${metrics.potentialGain}s`
                ) : (
                  'N/A'
                )}
              </p>
              <div className="flex items-center gap-1">
                <p className="text-gray-400 text-base font-medium leading-normal">vs Optimal</p>
              </div>
            </div>
          </div>

            {/* Tabs */}
            <div className="w-full">
              <div className="flex border-b border-[#3b4b54] gap-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center justify-center border-b-[3px] px-4 pb-[13px] pt-4 transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-blue-500 text-blue-500'
                      : 'border-b-transparent text-[#9db0b9] hover:border-b-blue-500/50 hover:text-blue-400'
                  }`}
                >
                  <p className="text-sm font-bold leading-normal tracking-[0.015em]">{tab.label}</p>
                </button>
              ))}
            </div>
          </div>

            {/* Content Area */}
            <div className="flex flex-col rounded-xl bg-[#111618] border border-[#3b4b54] p-6">
            {activeTab === 'ai-insights' && (
              <div className="space-y-6">
                {/* AI Summary Card */}
                {aiInsights?.summary && (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/50">
                    <div className="flex items-center gap-3 mb-3">
                      <Brain className="h-6 w-6 text-blue-400" />
                      <h2 className="text-xl font-bold text-white">AI Performance Summary</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[#9db0b9] text-xs">Total Laps Analyzed</p>
                        <p className="text-white text-lg font-bold">{aiInsights.summary.total_laps || 0}</p>
                      </div>
                      <div>
                        <p className="text-[#9db0b9] text-xs">Total Insights</p>
                        <p className="text-white text-lg font-bold">{aiInsights.summary.total_insights || 0}</p>
                      </div>
                      <div>
                        <p className="text-[#9db0b9] text-xs">High Priority</p>
                        <p className="text-[#fa5f38] text-lg font-bold">{aiInsights.summary.priority_insights?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-[#9db0b9] text-xs">Consistency</p>
                        <p className="text-white text-lg font-bold">
                          {aiInsights.summary.consistency_score !== null && aiInsights.summary.consistency_score !== undefined
                            ? `${Math.round(100 - (aiInsights.summary.consistency_score * 10))}%`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Patterns */}
                {aiPatterns.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-purple-400" />
                      <h3 className="text-lg font-bold text-white">AI-Detected Patterns</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aiPatterns.map((pattern: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-lg bg-[#1a242a] border border-purple-500/30">
                          <div className="flex items-start gap-2 mb-2">
                            <Activity className="h-5 w-5 text-purple-400 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="text-white font-semibold text-sm">{pattern.type || 'Driver Pattern'}</h4>
                              <p className="text-[#9db0b9] text-xs mt-1">{pattern.description}</p>
                              {pattern.implication && (
                                <p className="text-[#9db0b9] text-xs mt-1 italic">Implication: {pattern.implication}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance Prediction */}
                {performancePrediction && (
                  <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="h-5 w-5 text-yellow-400" />
                      <h3 className="text-lg font-bold text-white">AI Performance Prediction</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-[#9db0b9] text-xs mb-1">Next Lap Forecast</p>
                        <p className="text-white text-xl font-bold">
                          {performancePrediction.next_lap_prediction 
                            ? formatLapTime(performancePrediction.next_lap_prediction)
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#9db0b9] text-xs mb-1">Trend</p>
                        <div className="flex items-center gap-2">
                          {performancePrediction.trend === 'improving' ? (
                            <>
                              <ArrowDown className="h-4 w-4 text-[#0bda57]" />
                              <p className="text-[#0bda57] font-semibold">Improving</p>
                            </>
                          ) : performancePrediction.trend === 'declining' ? (
                            <>
                              <ArrowUp className="h-4 w-4 text-[#fa5f38]" />
                              <p className="text-[#fa5f38] font-semibold">Declining</p>
                            </>
                          ) : (
                            <>
                              <Activity className="h-4 w-4 text-[#9db0b9]" />
                              <p className="text-[#9db0b9] font-semibold">Stable</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[#9db0b9] text-xs mb-1">Confidence</p>
                        <p className="text-white text-xl font-bold">
                          {performancePrediction.confidence 
                            ? `${Math.round(performancePrediction.confidence * 100)}%`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sector AI Analysis */}
                {Object.keys(sectorAI).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="h-5 w-5 text-cyan-400" />
                      <h3 className="text-lg font-bold text-white">AI Sector Analysis</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['S1', 'S2', 'S3'].map((sector) => {
                        const analysis = sectorAI[sector];
                        if (!analysis) return null;
                        return (
                          <div key={sector} className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                            <h4 className="text-white font-semibold mb-2">{sector}</h4>
                            {analysis.recommendations && (
                              <p className="text-[#9db0b9] text-xs">{analysis.recommendations}</p>
                            )}
                            {analysis.insights && analysis.insights.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {analysis.insights.slice(0, 2).map((insight: any, idx: number) => (
                                  <p key={idx} className="text-[#9db0b9] text-xs">• {insight.action || insight.description}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Actionable Recommendations */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-5 w-5 text-green-400" />
                    <h3 className="text-lg font-bold text-white">AI-Powered Recommendations</h3>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                      {recommendations.length} recommendations
                    </span>
                  </div>
                  {loading.improvements || loading.aiInsights ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : recommendations.length > 0 ? (
                    <ul className="space-y-4">
                      {recommendations.map((rec, idx) => {
                        const IconComponent = rec.type === 'error' 
                          ? AlertTriangle 
                          : rec.type === 'success' 
                          ? CheckCircle 
                          : AlertCircle;
                        const iconColor = rec.type === 'error' 
                          ? 'text-[#fa5f38]' 
                          : rec.type === 'success' 
                          ? 'text-[#0bda57]' 
                          : 'text-[#FFC107]';
                        
                        return (
                          <li key={idx} className="flex items-start gap-4 p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54] hover:border-blue-500/50 transition-colors">
                            <IconComponent className={`text-xl ${iconColor} mt-1 flex-shrink-0`} />
                            <div className="flex flex-col flex-1">
                              <div className="flex items-start justify-between mb-1">
                                <h3 className="font-bold text-white">{rec.title}</h3>
                                {rec.category && (
                                  <span className="px-2 py-0.5 bg-[#3b4b54] text-[#9db0b9] text-xs rounded">
                                    {rec.category}
                                  </span>
                                )}
                              </div>
                              <p className="text-[#9db0b9] text-sm mt-1">{rec.description}</p>
                              {rec.action && (
                                <p className="text-[#9db0b9] text-sm mt-2">
                                  <span className="font-semibold text-white">Action:</span> {rec.action}
                                </p>
                              )}
                              {rec.actionItems && rec.actionItems.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                  {rec.actionItems.map((item: string, itemIdx: number) => (
                                    <li key={itemIdx} className="text-[#9db0b9] text-xs flex items-start gap-2">
                                      <span className="text-blue-400 mt-1">▸</span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {rec.potentialGain && (
                                <p className="text-[#0bda57] text-sm font-semibold mt-2">
                                  Potential gain: {rec.potentialGain}
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No recommendations available</p>
                      <p className="text-sm mt-2">Select a vehicle with race data to see AI-powered recommendations</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'best-worst' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-white mb-4">Best vs Worst Lap Analysis</h2>
                {loading.bestWorst ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : bestWorst ? (
                  <div className="space-y-4">
                    {bestWorst.best_lap_number && bestWorst.worst_lap_number && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-5 w-5 text-[#0bda57]" />
                            <h3 className="text-white font-semibold">Best Lap #{bestWorst.best_lap_number}</h3>
                          </div>
                          <p className="text-white text-xl font-bold mb-2">
                            {bestWorst.best_lap_time ? formatLapTime(bestWorst.best_lap_time) : 'N/A'}
                          </p>
                          {bestWorst.best_sector1_time && (
                            <div className="text-sm text-[#9db0b9] space-y-1">
                              <p>S1: {formatLapTime(bestWorst.best_sector1_time)}</p>
                              <p>S2: {formatLapTime(bestWorst.best_sector2_time)}</p>
                              <p>S3: {formatLapTime(bestWorst.best_sector3_time)}</p>
                            </div>
                          )}
                        </div>
                        <div className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54]">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-5 w-5 text-[#fa5f38]" />
                            <h3 className="text-white font-semibold">Worst Lap #{bestWorst.worst_lap_number}</h3>
                          </div>
                          <p className="text-white text-xl font-bold mb-2">
                            {bestWorst.worst_lap_time ? formatLapTime(bestWorst.worst_lap_time) : 'N/A'}
                          </p>
                          {bestWorst.worst_sector1_time && (
                            <div className="text-sm text-[#9db0b9] space-y-1">
                              <p>S1: {formatLapTime(bestWorst.worst_sector1_time)}</p>
                              <p>S2: {formatLapTime(bestWorst.worst_sector2_time)}</p>
                              <p>S3: {formatLapTime(bestWorst.worst_sector3_time)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {bestWorst.total_difference_seconds && (
                      <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-5 w-5 text-yellow-400" />
                          <h3 className="text-white font-semibold">Improvement Potential</h3>
                        </div>
                        <p className="text-white text-lg">
                          Total difference: <span className="font-bold text-yellow-400">{bestWorst.total_difference_seconds.toFixed(3)}s</span>
                        </p>
                        <p className="text-[#9db0b9] text-sm mt-2">
                          By matching your best lap performance consistently, you could improve by {bestWorst.total_difference_seconds.toFixed(3)} seconds per lap.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No best/worst data available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'improvements' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-white mb-4">AI-Powered Improvement Opportunities</h2>
                {loading.improvements ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : improvements?.opportunities && improvements.opportunities.length > 0 ? (
                  <div className="space-y-4">
                    {improvements.opportunities.map((opp: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-lg bg-[#1a242a] border border-[#3b4b54] hover:border-green-500/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-white">{opp.title || opp.description}</h3>
                            {opp.category && (
                              <span className="text-[#9db0b9] text-xs mt-1 block">{opp.category}</span>
                            )}
                          </div>
                          {opp.potential_gain && (
                            <span className="text-[#0bda57] text-sm font-semibold ml-2">
                              -{opp.potential_gain}s
                            </span>
                          )}
                        </div>
                        <p className="text-[#9db0b9] text-sm mb-2">{opp.description || opp.recommendation}</p>
                        {opp.action_items && opp.action_items.length > 0 && (
                          <div className="mt-3">
                            <p className="text-white text-xs font-semibold mb-2">Action Items:</p>
                            <ul className="space-y-1">
                              {opp.action_items.map((item: string, itemIdx: number) => (
                                <li key={itemIdx} className="text-[#9db0b9] text-xs flex items-start gap-2">
                                  <span className="text-green-400 mt-0.5">▸</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {opp.expected_improvement && (
                          <p className="text-[#0bda57] text-sm font-semibold mt-3">
                            Expected improvement: {typeof opp.expected_improvement === 'object' 
                              ? (opp.expected_improvement.expected_improvement || 
                                 (opp.expected_improvement.rate_per_lap 
                                   ? `${opp.expected_improvement.direction || 'Improvement'}: ${opp.expected_improvement.rate_per_lap}`
                                   : null) ||
                                 String(opp.expected_improvement))
                              : String(opp.expected_improvement)}
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
            )}

            {activeTab !== 'ai-insights' && activeTab !== 'best-worst' && activeTab !== 'improvements' && (
              <div className="text-center py-12 text-[#9db0b9]">
                <p>This tab is coming soon</p>
                <p className="text-sm mt-2">Content for {tabs.find(t => t.id === activeTab)?.label} will be displayed here</p>
              </div>
            )}
          </div>
          </div>
        </main>
      </div>
    </div>
  );
}

