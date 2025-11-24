import { useState, useEffect } from 'react';
import { analysisService } from '../services/analysisService';
import { useTelemetryStore } from '../store/telemetryStore';
import { PostEventAnalysisSidebar } from '../components/PostEventAnalysisSidebar';
import { Trophy, Clock, TrendingUp, TrendingDown, AlertCircle, Loader2, BarChart3, Users, Zap, Award, Brain, Sparkles, Target, Menu, CheckCircle, Lightbulb } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export function PostEventAnalysis() {
  const [raceStory, setRaceStory] = useState<any>(null);
  const [sectorComparison, setSectorComparison] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>('13');
  const [driverInsights, setDriverInsights] = useState<any>(null);
  const [aiDriverInsights, setAiDriverInsights] = useState<any>(null);
  const [loading, setLoading] = useState({ raceStory: false, sectors: false, driver: false, aiDriver: false, modelAnalysis: false });
  const [activeTab, setActiveTab] = useState<'story' | 'sectors' | 'driver' | 'model'>('story');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelAnalysis, setModelAnalysis] = useState<any>(null);
  const [selectedTrack, setSelectedTrack] = useState<string>('Barber');
  const [selectedSession, setSelectedSession] = useState<string>('R1');
  const { leaderboard } = useTelemetryStore();

  // Helper function to get vehicle name from leaderboard
  const getVehicleName = (vehicleId: string) => {
    const entry = leaderboard.find(e => e.vehicle_id === vehicleId);
    return entry?.vehicle || `Vehicle ${vehicleId}`;
  };

  useEffect(() => {
    loadRaceStory();
    loadSectorComparison();
  }, []);

  useEffect(() => {
    if (selectedDriver) {
      loadDriverInsights(selectedDriver);
      loadAIDriverInsights(selectedDriver);
    }
  }, [selectedDriver]);

  const loadRaceStory = async () => {
    setLoading(prev => ({ ...prev, raceStory: true }));
    try {
      const data = await analysisService.getRaceStory();
      setRaceStory(data);
    } catch (error) {
      console.error('Failed to load race story:', error);
    } finally {
      setLoading(prev => ({ ...prev, raceStory: false }));
    }
  };

  const loadSectorComparison = async () => {
    setLoading(prev => ({ ...prev, sectors: true }));
    try {
      const data = await analysisService.getSectorComparison();
      setSectorComparison(data);
    } catch (error) {
      console.error('Failed to load sector comparison:', error);
    } finally {
      setLoading(prev => ({ ...prev, sectors: false }));
    }
  };

  const loadDriverInsights = async (vehicleId: string) => {
    setLoading(prev => ({ ...prev, driver: true }));
    try {
      const data = await analysisService.getDriverInsights(vehicleId);
      setDriverInsights(data);
    } catch (error) {
      console.error('Failed to load driver insights:', error);
    } finally {
      setLoading(prev => ({ ...prev, driver: false }));
    }
  };

  const loadAIDriverInsights = async (vehicleId: string) => {
    setLoading(prev => ({ ...prev, aiDriver: true }));
    try {
      const data = await analysisService.getAIDriverInsights(vehicleId);
      setAiDriverInsights(data);
    } catch (error) {
      console.error('Failed to load AI driver insights:', error);
    } finally {
      setLoading(prev => ({ ...prev, aiDriver: false }));
    }
  };

  const loadModelAnalysis = async () => {
    setLoading(prev => ({ ...prev, modelAnalysis: true }));
    try {
      const data = await analysisService.getPostEventAnalysis(selectedTrack, selectedSession);
      setModelAnalysis(data);
    } catch (error) {
      console.error('Failed to load model-based analysis:', error);
    } finally {
      setLoading(prev => ({ ...prev, modelAnalysis: false }));
    }
  };

  // Prepare position changes chart data
  const getPositionChartData = () => {
    if (!raceStory?.position_changes) return [];
    
    const vehiclePositions: Record<string, Array<{ lap: number; position: number }>> = {};
    
    // Iterate through each vehicle's position history
    raceStory.position_changes.forEach((vehicleChange: any) => {
      const vehicleId = vehicleChange.vehicle_id;
      const positionHistory = vehicleChange.position_history || [];
      
      if (!vehiclePositions[vehicleId]) {
        vehiclePositions[vehicleId] = [];
      }
      
      // Add each position point from the history
      positionHistory.forEach((pos: any) => {
        if (pos.lap && pos.position) {
          vehiclePositions[vehicleId].push({
            lap: pos.lap,
            position: pos.position,
          });
        }
      });
    });

    return Object.entries(vehiclePositions)
      .map(([vehicleId, positions]) => ({
        vehicleId,
        vehicleName: getVehicleName(vehicleId),
        data: positions.sort((a, b) => a.lap - b.lap),
      }))
      .filter(vehicle => vehicle.data.length > 0); // Only include vehicles with data
  };

  // Prepare sector comparison chart data
  const getSectorChartData = (sector: string) => {
    if (!sectorComparison?.[sector]?.drivers) return [];
    
    return sectorComparison[sector].drivers.slice(0, 10).map((driver: any) => ({
      vehicle: getVehicleName(driver.vehicle_id),
      vehicleId: driver.vehicle_id,
      best: driver.best,
      average: driver.average,
      worst: driver.worst,
    }));
  };

  // Prepare position changes table data (flattened from all vehicles)
  const getPositionChangesTableData = () => {
    if (!raceStory?.position_changes) return [];
    
    const allChanges: Array<{
      vehicle_id: string;
      lap: number;
      position: number;
      lap_time: string | null;
      positionChange?: number;
      previousPosition?: number;
    }> = [];
    
    // Flatten all position changes from all vehicles
    raceStory.position_changes.forEach((vehicleChange: any) => {
      const vehicleId = vehicleChange.vehicle_id;
      const positionHistory = vehicleChange.position_history || [];
      
      positionHistory.forEach((pos: any, idx: number) => {
        if (pos.lap && pos.position !== undefined) {
          const previousPos = idx > 0 ? positionHistory[idx - 1].position : null;
          const positionChange = previousPos !== null ? previousPos - pos.position : null; // Positive = gained positions
          
          allChanges.push({
            vehicle_id: vehicleId,
            lap: pos.lap,
            position: pos.position,
            lap_time: pos.lap_time || null,
            positionChange: positionChange !== null ? positionChange : undefined,
            previousPosition: previousPos !== null ? previousPos : undefined,
          });
        }
      });
    });
    
    // Sort by lap number, then by position
    return allChanges.sort((a, b) => {
      if (a.lap !== b.lap) {
        return a.lap - b.lap;
      }
      return a.position - b.position;
    });
  };

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative">
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 right-4 z-40 p-3 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-xl border border-purple-500/30 shadow-lg hover:shadow-xl transition-all hover:scale-105"
        title="Toggle AI Analysis Sidebar"
      >
        <Brain className={`h-6 w-6 ${sidebarOpen ? 'text-purple-400' : 'text-gray-400'}`} />
      </button>

      {/* Sidebar */}
      <PostEventAnalysisSidebar
        raceStory={raceStory}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className={`w-full px-4 sm:px-6 lg:px-8 py-6 transition-all ${sidebarOpen ? 'pr-[500px]' : ''}`}>
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
              <BarChart3 className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-1">Post-Event Analysis</h1>
              <p className="text-gray-400">Comprehensive race analysis with visual insights</p>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-700/50">
          {[
            { id: 'story', label: 'Race Story', icon: Trophy },
            { id: 'sectors', label: 'Sector Comparison', icon: Clock },
            { id: 'driver', label: 'Driver Insights', icon: TrendingUp },
            { id: 'model', label: 'Model Analysis', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  group flex items-center space-x-2 px-6 py-3 border-b-2 transition-all duration-300
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                  }
                `}
              >
                <Icon className={`h-5 w-5 transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`} />
                <span className="font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Race Story Tab */}
        {activeTab === 'story' && (
          <div className="space-y-6">
            {loading.raceStory ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              </div>
            ) : raceStory ? (
              <>
                {/* Enhanced Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/10 rounded-xl p-6 border border-blue-500/30 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-400 text-sm font-medium">Total Laps</div>
                      <Users className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{raceStory.statistics?.total_laps || 'N/A'}</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-500/10 rounded-xl p-6 border border-yellow-500/30 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-400 text-sm font-medium">Fastest Lap</div>
                      <Trophy className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{raceStory.statistics?.fastest_lap || 'N/A'}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 rounded-xl p-6 border border-green-500/30 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-400 text-sm font-medium">Position Changes</div>
                      <TrendingUp className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{raceStory.position_changes?.length || 0}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-600/20 to-purple-500/10 rounded-xl p-6 border border-purple-500/30 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-400 text-sm font-medium">Key Moments</div>
                      <Zap className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{raceStory.key_moments?.length || 0}</div>
                  </div>
                </div>

                {/* Position Changes Chart */}
                {raceStory.position_changes && raceStory.position_changes.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-blue-400" />
                        <h2 className="text-2xl font-bold text-white">Position Changes Over Time</h2>
                      </div>
                      <div className="text-sm text-gray-400">
                        Showing top {Math.min(getPositionChartData().length, 10)} vehicles
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={500}>
                      <LineChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis 
                          dataKey="lap" 
                          stroke="#9ca3af"
                          tick={{ fill: '#9ca3af' }}
                          label={{ value: 'Lap Number', position: 'insideBottom', offset: -5, fill: '#9ca3af', style: { fontSize: '14px' } }}
                          type="number"
                          domain={['dataMin', 'dataMax']}
                        />
                        <YAxis 
                          stroke="#9ca3af"
                          tick={{ fill: '#9ca3af' }}
                          reversed
                          label={{ value: 'Position', angle: -90, position: 'insideLeft', fill: '#9ca3af', style: { fontSize: '14px' } }}
                          domain={[1, 'auto']}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff',
                          }}
                          labelStyle={{ color: '#9ca3af', marginBottom: '8px', fontWeight: 'bold' }}
                          formatter={(value: any, name: string) => [`Position ${value}`, name]}
                          labelFormatter={(label) => `Lap ${label}`}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                          iconType="line"
                        />
                        {getPositionChartData().slice(0, 10).map((vehicle, idx) => (
                          <Line
                            key={vehicle.vehicleId}
                            type="monotone"
                            dataKey="position"
                            data={vehicle.data}
                            name={vehicle.vehicleName}
                            stroke={COLORS[idx % COLORS.length]}
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: COLORS[idx % COLORS.length] }}
                            activeDot={{ r: 6, stroke: COLORS[idx % COLORS.length], strokeWidth: 2 }}
                            connectNulls={false}
                            animationDuration={750}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                    
                    {/* Vehicle Legend */}
                    <div className="mt-4 pt-4 border-t border-gray-700/50">
                      <div className="flex flex-wrap gap-3">
                        {getPositionChartData().slice(0, 10).map((vehicle, idx) => (
                          <div key={vehicle.vehicleId} className="flex items-center gap-2">
                            <div 
                              className="w-4 h-0.5 rounded" 
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span className="text-sm text-gray-300">{vehicle.vehicleName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Position Changes Table */}
                {raceStory.position_changes && raceStory.position_changes.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Award className="h-5 w-5 text-blue-400" />
                        Recent Position Changes
                      </h2>
                      <div className="text-sm text-gray-400">
                        Showing {Math.min(getPositionChangesTableData().length, 20)} of {getPositionChangesTableData().length} changes
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="text-left py-3 px-4 text-gray-400 font-semibold">Lap</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-semibold">Vehicle</th>
                            <th className="text-center py-3 px-4 text-gray-400 font-semibold">Position</th>
                            <th className="text-center py-3 px-4 text-gray-400 font-semibold">Change</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-semibold">Lap Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getPositionChangesTableData().slice(-20).reverse().map((change: any, idx: number) => {
                            const positionChange = change.positionChange;
                            const isGain = positionChange !== undefined && positionChange > 0;
                            const isLoss = positionChange !== undefined && positionChange < 0;
                            
                            return (
                              <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                                <td className="py-3 px-4">
                                  <span className="text-gray-300 font-medium">Lap {change.lap}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-col">
                                    <span className="text-blue-400 font-semibold">{getVehicleName(change.vehicle_id)}</span>
                                    <span className="text-xs text-gray-500">ID: {change.vehicle_id}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 font-bold text-lg">
                                    {change.position}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {positionChange !== undefined ? (
                                    <div className="flex items-center justify-center gap-1">
                                      {isGain ? (
                                        <>
                                          <TrendingUp className="h-4 w-4 text-green-400" />
                                          <span className="text-green-400 font-semibold">+{positionChange}</span>
                                        </>
                                      ) : isLoss ? (
                                        <>
                                          <TrendingDown className="h-4 w-4 text-red-400" />
                                          <span className="text-red-400 font-semibold">{positionChange}</span>
                                        </>
                                      ) : (
                                        <span className="text-gray-400 text-sm">—</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 text-sm">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-gray-300 font-mono text-sm">{change.lap_time || 'N/A'}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Key Moments */}
                {raceStory.key_moments && raceStory.key_moments.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-400" />
                      Key Race Moments
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {raceStory.key_moments.slice(0, 12).map((moment: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-lg border border-gray-700/50 hover:border-blue-500/50 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`
                              flex-shrink-0 w-3 h-3 rounded-full mt-1.5
                              ${moment.type === 'fastest_lap' ? 'bg-yellow-500 animate-pulse' : 'bg-blue-500'}
                            `} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-white font-semibold capitalize text-sm">
                                  {moment.type?.replace('_', ' ') || 'Event'}
                                </span>
                                <span className="text-gray-400 text-xs">Lap {moment.lap}</span>
                                <span className="text-blue-400 text-xs">{getVehicleName(moment.vehicle_id)}</span>
                              </div>
                              {moment.lap_time && (
                                <div className="text-gray-300 text-sm font-medium">{moment.lap_time}</div>
                              )}
                              {moment.pit_time && (
                                <div className="text-gray-400 text-xs mt-1">Pit Time: {moment.pit_time}s</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                <p className="text-lg">Failed to load race story data</p>
              </div>
            )}
          </div>
        )}

        {/* Sector Comparison Tab */}
        {activeTab === 'sectors' && (
          <div className="space-y-6">
            {loading.sectors ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              </div>
            ) : sectorComparison ? (
              <>
                {/* Sector Comparison Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {['sector_1', 'sector_2', 'sector_3'].map((sector, sectorIdx) => {
                    const sectorData = sectorComparison[sector];
                    const chartData = getSectorChartData(sector);
                    
                    return (
                      <div key={sector} className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 shadow-xl">
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-white mb-2 capitalize flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-400" />
                            {sector.replace('_', ' ')}
                          </h3>
                          {sectorData.best_overall && (
                            <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 rounded-lg p-3 border border-yellow-500/30">
                              <div className="text-xs text-gray-400 mb-1">Best Overall</div>
                              <div className="flex items-center justify-between">
                                <span className="text-yellow-400 font-bold">
                                  {getVehicleName(sectorData.best_overall.vehicle_id)}
                                </span>
                                <span className="text-white font-semibold">
                                  {sectorData.best_overall.time?.toFixed(3)}s
                                </span>
                              </div>
                              <div className="text-xs text-gray-400 mt-1">Lap {sectorData.best_overall.lap}</div>
                            </div>
                          )}
                        </div>

                        {/* Bar Chart */}
                        {chartData.length > 0 && (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis dataKey="vehicle" stroke="#9ca3af" />
                              <YAxis stroke="#9ca3af" />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#1f2937',
                                  border: '1px solid #374151',
                                  borderRadius: '8px',
                                }}
                                labelStyle={{ color: '#9ca3af' }}
                              />
                              <Legend />
                              <Bar dataKey="best" fill="#3b82f6" name="Best" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="average" fill="#8b5cf6" name="Average" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="worst" fill="#ef4444" name="Worst" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}

                        {/* Top Drivers List */}
                        <div className="mt-4 space-y-2">
                          <div className="text-sm font-semibold text-gray-400 mb-2">Top Performers</div>
                          {sectorData.drivers?.slice(0, 5).map((driver: any, idx: number) => (
                            <div 
                              key={idx}
                              className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg hover:bg-gray-900/70 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 w-4">#{idx + 1}</span>
                                <div className="flex flex-col">
                                  <span className="text-blue-400 font-medium text-sm">
                                    {getVehicleName(driver.vehicle_id)}
                                  </span>
                                  {leaderboard.find(e => e.vehicle_id === driver.vehicle_id)?.vehicle && (
                                    <span className="text-xs text-gray-500">ID: {driver.vehicle_id}</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-white font-semibold text-sm">{driver.best?.toFixed(3)}s</div>
                                <div className="text-xs text-gray-400">Avg: {driver.average?.toFixed(3)}s</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                <p className="text-lg">Failed to load sector comparison data</p>
              </div>
            )}
          </div>
        )}

        {/* Driver Insights Tab */}
        {activeTab === 'driver' && (
          <div className="space-y-6">
            {/* Driver Selector */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 shadow-xl">
              <label className="block text-sm font-semibold text-gray-300 mb-3">
                Select Driver (Vehicle ID)
              </label>
              <input
                type="text"
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full max-w-xs px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter vehicle ID (e.g., 13)"
              />
            </div>

            {loading.driver ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              </div>
            ) : driverInsights ? (
              <div className="space-y-6">
                {/* AI-Powered Driver Analysis */}
                {aiDriverInsights && (
                  <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl p-6 border border-purple-500/50 shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <Brain className="h-6 w-6 text-purple-400" />
                      <h3 className="text-xl font-bold text-white">AI-Powered Driver Analysis</h3>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                        {aiDriverInsights.summary?.total_insights || 0} insights
                      </span>
                    </div>
                    
                    {aiDriverInsights.summary && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
                          <p className="text-gray-400 text-xs mb-1">Total Laps</p>
                          <p className="text-white text-lg font-bold">{aiDriverInsights.summary.total_laps || 0}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
                          <p className="text-gray-400 text-xs mb-1">Consistency</p>
                          <p className="text-white text-lg font-bold">
                            {aiDriverInsights.summary.consistency_score !== null && aiDriverInsights.summary.consistency_score !== undefined
                              ? `${Math.round(100 - (aiDriverInsights.summary.consistency_score * 10))}%`
                              : 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
                          <p className="text-gray-400 text-xs mb-1">High Priority</p>
                          <p className="text-red-400 text-lg font-bold">{aiDriverInsights.summary.priority_insights?.length || 0}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
                          <p className="text-gray-400 text-xs mb-1">Best Lap</p>
                          <p className="text-green-400 text-lg font-bold">
                            {aiDriverInsights.summary.best_lap_time 
                              ? `${Math.floor(aiDriverInsights.summary.best_lap_time / 60)}:${(aiDriverInsights.summary.best_lap_time % 60).toFixed(3).padStart(6, '0')}`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}

                    {aiDriverInsights.insights && aiDriverInsights.insights.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-white font-semibold text-sm">Key AI Insights</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {aiDriverInsights.insights.slice(0, 6).map((insight: any, idx: number) => {
                            const IconComponent = insight.severity === 'high' 
                              ? AlertCircle 
                              : insight.severity === 'medium'
                              ? TrendingUp
                              : CheckCircle;
                            const iconColor = insight.severity === 'high' 
                              ? 'text-red-400' 
                              : insight.severity === 'medium'
                              ? 'text-yellow-400'
                              : 'text-green-400';
                            
                            return (
                              <div key={idx} className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
                                <div className="flex items-start gap-2 mb-2">
                                  <IconComponent className={`h-4 w-4 ${iconColor} mt-0.5 flex-shrink-0`} />
                                  <div className="flex-1">
                                    <h5 className="text-white font-semibold text-xs">{insight.title}</h5>
                                    <p className="text-gray-400 text-xs mt-1">{insight.description}</p>
                                    {insight.action && (
                                      <p className="text-blue-400 text-xs mt-1 italic">{insight.action}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {aiDriverInsights.recommendations && aiDriverInsights.recommendations.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-700/50">
                        <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-400" />
                          AI Recommendations
                        </h4>
                        <div className="space-y-2">
                          {aiDriverInsights.recommendations.slice(0, 3).map((rec: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-lg bg-gray-900/50 border border-green-500/30">
                              <h5 className="text-white font-semibold text-xs mb-1">{rec.title}</h5>
                              <p className="text-gray-400 text-xs mb-2">{rec.description}</p>
                              {rec.action_items && rec.action_items.length > 0 && (
                                <ul className="space-y-1">
                                  {rec.action_items.slice(0, 3).map((item: string, itemIdx: number) => (
                                    <li key={itemIdx} className="text-gray-400 text-xs flex items-start gap-2">
                                      <span className="text-green-400 mt-0.5">▸</span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {rec.expected_improvement && (
                                <p className="text-green-400 text-xs font-semibold mt-2">
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
                  </div>
                )}

                {/* Driver Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 rounded-xl p-6 border border-green-500/30 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-400 text-sm font-medium">Best Lap</div>
                      <Trophy className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {driverInsights.best_lap?.lap_time || driverInsights.best_lap || 'N/A'}
                    </div>
                    {driverInsights.best_lap?.lap_number && (
                      <div className="text-xs text-gray-400 mt-1">Lap {driverInsights.best_lap.lap_number}</div>
                    )}
                  </div>
                  <div className="bg-gradient-to-br from-red-600/20 to-red-500/10 rounded-xl p-6 border border-red-500/30 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-400 text-sm font-medium">Worst Lap</div>
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {driverInsights.worst_lap?.lap_time || driverInsights.worst_lap || 'N/A'}
                    </div>
                    {driverInsights.worst_lap?.lap_number && (
                      <div className="text-xs text-gray-400 mt-1">Lap {driverInsights.worst_lap.lap_number}</div>
                    )}
                  </div>
                  <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/10 rounded-xl p-6 border border-blue-500/30 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-400 text-sm font-medium">Total Laps</div>
                      <Users className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{driverInsights.total_laps || 'N/A'}</div>
                  </div>
                </div>

                {/* Sector Statistics with Charts */}
                {driverInsights.sector_statistics && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <BarChart3 className="h-6 w-6 text-blue-400" />
                      Sector Statistics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {['sector_1', 'sector_2', 'sector_3'].map((sector) => {
                        const stats = driverInsights.sector_statistics[sector];
                        if (!stats) return null;

                        const chartData = [
                          { name: 'Best', value: stats.best, color: '#10b981' },
                          { name: 'Average', value: stats.average, color: '#3b82f6' },
                          { name: 'Worst', value: stats.worst, color: '#ef4444' },
                        ];

                        return (
                          <div key={sector} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                            <h4 className="text-sm font-semibold text-gray-300 mb-4 capitalize">
                              {sector.replace('_', ' ')}
                            </h4>
                            
                            {/* Mini Bar Chart */}
                            <div className="mb-4">
                              <ResponsiveContainer width="100%" height={120}>
                                <BarChart data={chartData}>
                                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Bar>
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: '#1f2937',
                                      border: '1px solid #374151',
                                      borderRadius: '8px',
                                    }}
                                    formatter={(value: number) => `${value?.toFixed(3)}s`}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Stats */}
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Best:</span>
                                <span className="text-green-400 font-semibold">{stats.best || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Average:</span>
                                <span className="text-blue-400 font-semibold">{stats.average || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Worst:</span>
                                <span className="text-red-400 font-semibold">{stats.worst || 'N/A'}</span>
                              </div>
                              {stats.consistency !== undefined && (
                                <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                                  <span className="text-gray-400">Consistency:</span>
                                  <span className="text-purple-400 font-semibold">
                                    {(stats.consistency * 100).toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Improvement Opportunities */}
                {driverInsights.improvement_opportunities && driverInsights.improvement_opportunities.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <TrendingUp className="h-6 w-6 text-green-400" />
                      Improvement Opportunities
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {driverInsights.improvement_opportunities.map((opp: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-lg border border-gray-700/50 hover:border-green-500/50 transition-all"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-white font-semibold">{opp.sector || opp.area || 'General'}</span>
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-semibold rounded-lg border border-green-500/30">
                              +{opp.improvement_potential?.toFixed(3) || opp.improvement_potential}s potential
                            </span>
                          </div>
                          {opp.best_time && opp.worst_time && (
                            <div className="text-xs text-gray-400 mb-2">
                              Best: {opp.best_time}s | Worst: {opp.worst_time}s
                            </div>
                          )}
                          {opp.description && (
                            <p className="text-gray-400 text-sm">{opp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                <p className="text-lg">Failed to load driver insights</p>
                <p className="text-sm mt-2">Make sure the vehicle ID is correct</p>
              </div>
            )}
          </div>
        )}

        {/* Model-Based Analysis Tab */}
        {activeTab === 'model' && (
          <div className="space-y-6">
            {/* Track and Session Selector */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-400" />
                Predictive Model Analysis
              </h2>
              <p className="text-gray-400 mb-4">
                Compare predicted vs actual performance to reveal key strategic moments and decisions
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Track</label>
                  <select
                    value={selectedTrack}
                    onChange={(e) => setSelectedTrack(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Barber">Barber</option>
                    <option value="Sonoma">Sonoma</option>
                    <option value="Road America">Road America</option>
                    <option value="Circuit of the Americas">Circuit of the Americas</option>
                    <option value="Virginia International Raceway">Virginia International Raceway</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Race Session</label>
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="R1">Race 1</option>
                    <option value="R2">Race 2</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={loadModelAnalysis}
                    disabled={loading.modelAnalysis}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading.modelAnalysis ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Generate Analysis
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {loading.modelAnalysis ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
              </div>
            ) : modelAnalysis ? (
              <>
                {/* Race Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/10 rounded-xl p-6 border border-blue-500/30 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-400 text-sm font-medium">Total Vehicles</div>
                      <Users className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{modelAnalysis.race_statistics?.total_vehicles || 0}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 rounded-xl p-6 border border-green-500/30 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-400 text-sm font-medium">Finished</div>
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{modelAnalysis.race_statistics?.vehicles_finished || 0}</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-500/10 rounded-xl p-6 border border-yellow-500/30 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-400 text-sm font-medium">Pit Stops</div>
                      <Zap className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{modelAnalysis.race_statistics?.total_pit_stops || 0}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-600/20 to-purple-500/10 rounded-xl p-6 border border-purple-500/30 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-400 text-sm font-medium">Deviations</div>
                      <TrendingUp className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{modelAnalysis.race_statistics?.significant_deviations || 0}</div>
                  </div>
                </div>

                {/* Race Narrative */}
                {modelAnalysis.narrative && (
                  <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl p-6 border border-purple-500/50 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Brain className="h-6 w-6 text-purple-400" />
                      Race Story
                    </h3>
                    <div className="space-y-4">
                      {modelAnalysis.narrative.sections?.map((section: any, idx: number) => (
                        <div key={idx} className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
                          <h4 className="text-lg font-semibold text-white mb-2">{section.title}</h4>
                          <p className="text-gray-300 leading-relaxed">{section.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Insights */}
                {modelAnalysis.key_insights && modelAnalysis.key_insights.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Lightbulb className="h-6 w-6 text-yellow-400" />
                      Key Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {modelAnalysis.key_insights.map((insight: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-lg border border-gray-700/50 hover:border-blue-500/50 transition-all"
                        >
                          <h4 className="text-white font-semibold mb-2">{insight.title}</h4>
                          <p className="text-gray-400 text-sm">{insight.description}</p>
                          {insight.vehicle_id && (
                            <div className="mt-2 text-xs text-blue-400">Vehicle: {insight.vehicle_id}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance Deviations */}
                {modelAnalysis.performance_deviations && modelAnalysis.performance_deviations.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <BarChart3 className="h-6 w-6 text-blue-400" />
                      Performance Deviations
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="text-left py-3 px-4 text-gray-400 font-semibold">Vehicle</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-semibold">Performance</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-semibold">Avg Deviation</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-semibold">Total Impact</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-semibold">Consistency</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modelAnalysis.performance_deviations.map((dev: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                              <td className="py-3 px-4 text-blue-400 font-semibold">{dev.vehicle_id}</td>
                              <td className="py-3 px-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  dev.performance_class === 'over_performed'
                                    ? 'bg-green-500/20 text-green-400'
                                    : dev.performance_class === 'under_performed'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {dev.performance_class?.replace('_', ' ').toUpperCase()}
                                </span>
                              </td>
                              <td className={`py-3 px-4 font-semibold ${
                                dev.deviation_seconds < 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {dev.deviation_seconds?.toFixed(2)}s
                              </td>
                              <td className={`py-3 px-4 font-semibold ${
                                dev.total_time_impact < 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {dev.total_time_impact?.toFixed(2)}s
                              </td>
                              <td className="py-3 px-4 text-gray-300">
                                {(dev.consistency_score * 100)?.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Strategic Moments */}
                {modelAnalysis.strategic_moments && modelAnalysis.strategic_moments.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Zap className="h-6 w-6 text-yellow-400" />
                      Strategic Moments
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {modelAnalysis.strategic_moments.slice(0, 20).map((moment: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-lg border border-gray-700/50 hover:border-yellow-500/50 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1.5 ${
                              moment.type === 'pit_stop' ? 'bg-blue-500' : 'bg-yellow-500'
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-white font-semibold capitalize text-sm">
                                  {moment.type?.replace('_', ' ')}
                                </span>
                                <span className="text-gray-400 text-xs">Lap {moment.lap}</span>
                                <span className="text-blue-400 text-xs">{moment.vehicle_id}</span>
                              </div>
                              {moment.lap_time && (
                                <div className="text-gray-300 text-sm">Lap Time: {moment.lap_time.toFixed(2)}s</div>
                              )}
                              {moment.deviation_seconds && (
                                <div className={`text-sm font-semibold ${
                                  moment.deviation_seconds < 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  Deviation: {moment.deviation_seconds.toFixed(2)}s
                                </div>
                              )}
                              {moment.reason && (
                                <div className="text-gray-400 text-xs mt-1">Reason: {moment.reason}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vehicle Analyses */}
                {modelAnalysis.vehicle_analyses && modelAnalysis.vehicle_analyses.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Users className="h-6 w-6 text-blue-400" />
                      Vehicle Performance Analysis
                    </h3>
                    <div className="space-y-4">
                      {modelAnalysis.vehicle_analyses.slice(0, 10).map((vehicle: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-lg border border-gray-700/50"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-lg font-semibold text-white">{vehicle.vehicle_id}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              vehicle.performance_class === 'over_performed'
                                ? 'bg-green-500/20 text-green-400'
                                : vehicle.performance_class === 'under_performed'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {vehicle.performance_class?.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-gray-400">Total Laps</div>
                              <div className="text-white font-semibold">{vehicle.total_laps}</div>
                            </div>
                            <div>
                              <div className="text-gray-400">Avg Deviation</div>
                              <div className={`font-semibold ${
                                vehicle.average_deviation < 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {vehicle.average_deviation?.toFixed(2)}s
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-400">Total Impact</div>
                              <div className={`font-semibold ${
                                vehicle.total_time_deviation < 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {vehicle.total_time_deviation?.toFixed(2)}s
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-400">Consistency</div>
                              <div className="text-white font-semibold">
                                {(vehicle.consistency_score * 100)?.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <Sparkles className="h-16 w-16 mx-auto mb-4 text-purple-400" />
                <p className="text-lg">Select track and session, then click "Generate Analysis" to view model-based insights</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
