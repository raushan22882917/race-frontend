import { useState, useEffect, useMemo } from 'react';
import { Brain, Sparkles, AlertCircle, Target, TrendingUp, Clock, Zap, ChevronRight, Loader2, X, Trophy, Award, BarChart3, TrendingDown, Users, Activity, Gauge } from 'lucide-react';
import { analysisService } from '../services/analysisService';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
  Cell,
} from 'recharts';

interface PostEventAnalysisSidebarProps {
  raceStory: any;
  isOpen: boolean;
  onClose: () => void;
}

export function PostEventAnalysisSidebar({ raceStory, isOpen, onClose }: PostEventAnalysisSidebarProps) {
  const [geminiInsights, setGeminiInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && raceStory && raceStory.gemini_insights) {
      setGeminiInsights(raceStory.gemini_insights);
    } else if (isOpen && raceStory && !raceStory.gemini_insights) {
      loadGeminiInsights();
    }
  }, [isOpen, raceStory]);

  const loadGeminiInsights = async () => {
    if (!raceStory) return;
    setLoading(true);
    try {
      const data = await analysisService.getRaceStory();
      if (data.gemini_insights) {
        setGeminiInsights(data.gemini_insights);
      }
    } catch (error) {
      console.error('Failed to load Gemini insights:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare position change chart data (like F1/TV graphics)
  const positionChartData = useMemo(() => {
    if (!raceStory?.position_changes) return [];
    
    const allLaps = new Set<number>();
    raceStory.position_changes.forEach((change: any) => {
      change.position_history?.forEach((pos: any) => {
        allLaps.add(pos.lap);
      });
    });
    
    const sortedLaps = Array.from(allLaps).sort((a, b) => a - b);
    const vehicles = raceStory.position_changes.slice(0, 8); // Top 8 for clarity
    
    return sortedLaps.map(lap => {
      const dataPoint: any = { lap };
      vehicles.forEach((vehicle: any) => {
        const posAtLap = vehicle.position_history?.find((p: any) => p.lap === lap);
        if (posAtLap) {
          dataPoint[`V${vehicle.vehicle_id}`] = posAtLap.position;
        }
      });
      return dataPoint;
    });
  }, [raceStory]);

  // Prepare lap time comparison data
  const lapTimeChartData = useMemo(() => {
    if (!raceStory?.position_changes) return [];
    
    const vehicles = raceStory.position_changes.slice(0, 5);
    const allLaps = new Set<number>();
    
    vehicles.forEach((vehicle: any) => {
      vehicle.position_history?.forEach((pos: any) => {
        if (pos.lap_time) {
          allLaps.add(pos.lap);
        }
      });
    });
    
    const sortedLaps = Array.from(allLaps).sort((a, b) => a - b);
    
    return sortedLaps.map(lap => {
      const dataPoint: any = { lap, name: `L${lap}` };
      vehicles.forEach((vehicle: any) => {
        const posAtLap = vehicle.position_history?.find((p: any) => p.lap === lap);
        if (posAtLap?.lap_time) {
          // Convert lap time string to seconds for comparison
          const timeStr = posAtLap.lap_time;
          let seconds = 0;
          if (timeStr.includes(':')) {
            const parts = timeStr.split(':');
            seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
          } else {
            seconds = parseFloat(timeStr);
          }
          dataPoint[`V${vehicle.vehicle_id}`] = seconds;
        }
      });
      return dataPoint;
    });
  }, [raceStory]);

  // Prepare fastest lap comparison
  const fastestLapData = useMemo(() => {
    if (!raceStory?.key_moments) return [];
    
    const fastestLaps = raceStory.key_moments
      .filter((m: any) => m.type === 'fastest_lap')
      .slice(0, 10)
      .map((m: any) => ({
        vehicle: `V${m.vehicle_id}`,
        lap: m.lap,
        time: m.lap_time_seconds || 0,
        lapTime: m.lap_time,
      }))
      .sort((a: any, b: any) => a.time - b.time);
    
    return fastestLaps;
  }, [raceStory]);

  // Prepare critical moments timeline data
  const criticalMomentsData = useMemo(() => {
    if (!raceStory?.key_moments) return [];
    
    return raceStory.key_moments
      .slice(0, 15)
      .map((moment: any) => ({
        lap: moment.lap,
        type: moment.type,
        vehicle: moment.vehicle_id,
      }));
  }, [raceStory]);

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  if (!isOpen) return null;

  const insights = geminiInsights;

  return (
    <div className="fixed right-0 top-0 h-full w-[480px] bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 border-l border-gray-700 shadow-2xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-sm border-b border-purple-500/30 p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-600/30 to-blue-600/30 rounded-xl border border-purple-500/40 shadow-lg">
            <Brain className="h-6 w-6 text-purple-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Race Dashboard</h2>
            <p className="text-xs text-purple-300">AI-Powered Analysis</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      {/* Dashboard Content */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
          </div>
        ) : (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-500/10 rounded-xl p-4 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-purple-400" />
                  <span className="text-xs text-gray-400 font-medium">Key Moments</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {raceStory?.key_moments?.length || 0}
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/10 rounded-xl p-4 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-gray-400 font-medium">Drivers</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {raceStory?.position_changes?.length || 0}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 rounded-xl p-4 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-gray-400 font-medium">Fastest Laps</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {raceStory?.key_moments?.filter((m: any) => m.type === 'fastest_lap').length || 0}
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-600/20 to-orange-500/10 rounded-xl p-4 border border-orange-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-400" />
                  <span className="text-xs text-gray-400 font-medium">Pit Stops</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {raceStory?.key_moments?.filter((m: any) => m.type === 'pit_stop').length || 0}
                </div>
              </div>
            </div>

            {/* Position Change Graph - F1 Style */}
            {positionChartData.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Position Changes</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={positionChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="lap" 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      label={{ value: 'Lap', position: 'insideBottom', offset: -5, fill: '#9ca3af', fontSize: 11 }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      reversed
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      label={{ value: 'Position', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
                      domain={[1, 'dataMax']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                      iconType="line"
                    />
                    {raceStory?.position_changes?.slice(0, 6).map((vehicle: any, idx: number) => (
                      <Line
                        key={vehicle.vehicle_id}
                        type="monotone"
                        dataKey={`V${vehicle.vehicle_id}`}
                        stroke={COLORS[idx % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        name={`V${vehicle.vehicle_id}`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Lap Time Comparison - Race Style */}
            {lapTimeChartData.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  <h3 className="text-lg font-bold text-white">Lap Time Comparison</h3>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={lapTimeChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="lap" 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      label={{ value: 'Lap', position: 'insideBottom', offset: -5, fill: '#9ca3af', fontSize: 11 }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      label={{ value: 'Time (s)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
                      domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => `${value?.toFixed(2)}s`}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                      iconType="line"
                    />
                    {raceStory?.position_changes?.slice(0, 5).map((vehicle: any, idx: number) => (
                      <Line
                        key={vehicle.vehicle_id}
                        type="monotone"
                        dataKey={`V${vehicle.vehicle_id}`}
                        stroke={COLORS[idx % COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        name={`V${vehicle.vehicle_id}`}
                      />
                    ))}
                    <ReferenceLine y={lapTimeChartData.reduce((min: number, d: any) => {
                      const values = Object.values(d).filter(v => typeof v === 'number') as number[];
                      return Math.min(min, ...values);
                    }, Infinity)} stroke="#10b981" strokeDasharray="3 3" label="Fastest" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Fastest Lap Comparison - Bar Chart */}
            {fastestLapData.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  <h3 className="text-lg font-bold text-white">Fastest Laps</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={fastestLapData.slice(0, 8)} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="vehicle" 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      label={{ value: 'Time (s)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value?.toFixed(2)}s (Lap ${props.payload.lap})`,
                        'Fastest Lap'
                      ]}
                    />
                    <Bar 
                      dataKey="time" 
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    >
                      {fastestLapData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Critical Moments Timeline */}
            {criticalMomentsData.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <h3 className="text-lg font-bold text-white">Race Timeline</h3>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={criticalMomentsData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="lap" 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      label={{ value: 'Lap', position: 'insideBottom', offset: -5, fill: '#9ca3af', fontSize: 11 }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      hide
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: any, name: string, props: any) => [
                        `${props.payload.type || 'Event'} - V${props.payload.vehicle}`,
                        'Lap ' + props.payload.lap
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="lap" 
                      stroke="#f59e0b" 
                      fill="#f59e0b" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* AI Race Narrative */}
            {insights?.narrative && (
              <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-xl p-4 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  <h3 className="text-lg font-bold text-white">AI Race Story</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {insights.narrative}
                </p>
              </div>
            )}

            {/* Strategic Decisions */}
            {insights?.strategic_decisions && insights.strategic_decisions.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Key Strategies</h3>
                </div>
                <div className="space-y-2">
                  {insights.strategic_decisions.slice(0, 3).map((decision: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-lg p-3 border border-blue-500/20"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-400">{decision.lap || idx + 1}</span>
                        </div>
                        <h4 className="text-white font-semibold text-sm">{decision.moment}</h4>
                      </div>
                      <p className="text-gray-300 text-xs">{decision.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Race Statistics */}
            {raceStory?.statistics && (
              <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-xl p-4 border border-indigo-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-white">Race Summary</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {raceStory.statistics.total_drivers && (
                    <div>
                      <span className="text-xs text-gray-400">Drivers</span>
                      <div className="text-xl font-bold text-white">{raceStory.statistics.total_drivers}</div>
                    </div>
                  )}
                  {raceStory.statistics.total_laps && (
                    <div>
                      <span className="text-xs text-gray-400">Total Laps</span>
                      <div className="text-xl font-bold text-white">{raceStory.statistics.total_laps}</div>
                    </div>
                  )}
                  {raceStory.statistics.fastest_lap && (
                    <div className="col-span-2">
                      <span className="text-xs text-gray-400">Fastest Lap</span>
                      <div className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        {raceStory.statistics.fastest_lap}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
