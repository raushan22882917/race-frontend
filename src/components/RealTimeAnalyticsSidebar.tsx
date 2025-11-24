import { useState, useEffect } from 'react';
import { Brain, AlertCircle, Target, TrendingUp, Clock, Zap, ChevronRight, Loader2, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { analysisService } from '../services/analysisService';

interface RealTimeAnalyticsSidebarProps {
  vehicleId: string;
  currentLap: number;
  totalLaps: number;
  pitLap: number;
  pitTime: number;
  isOpen: boolean;
  onClose: () => void;
}

export function RealTimeAnalyticsSidebar({
  vehicleId,
  currentLap,
  totalLaps,
  pitLap,
  pitTime,
  isOpen,
  onClose,
}: RealTimeAnalyticsSidebarProps) {
  const [strategyInsights, setStrategyInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'actions' | 'pit' | 'risks' | 'alternatives' | 'monitoring'>('actions');

  useEffect(() => {
    if (isOpen && vehicleId) {
      loadStrategyInsights();
    }
  }, [isOpen, vehicleId, currentLap, totalLaps, pitLap, pitTime]);

  const loadStrategyInsights = async () => {
    if (!vehicleId) {
      console.warn('No vehicle ID provided for strategy insights');
      return;
    }
    
    setLoading(true);
    try {
      const data = await analysisService.getStrategyInsights(vehicleId, currentLap, totalLaps, pitLap, pitTime);
      console.log('Strategy insights loaded:', data);
      setStrategyInsights(data);
    } catch (error: any) {
      console.error('Failed to load strategy insights:', error);
      // Set error state so UI can show helpful message
      setStrategyInsights({
        error: error.message || 'Failed to load strategy insights',
        gemini_insights: {
          enhanced: false,
          message: error.message || 'Failed to load strategy insights. Check vehicle ID and ensure backend is running.'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const insights = strategyInsights?.gemini_insights;
  
  // Debug logging
  if (strategyInsights) {
    console.log('Strategy Insights Data:', {
      hasGeminiInsights: !!strategyInsights.gemini_insights,
      enhanced: insights?.enhanced,
      hasError: !!strategyInsights.error,
      message: insights?.message,
      error: strategyInsights.error
    });
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-700 shadow-2xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-yellow-600/20 to-orange-600/20 rounded-lg border border-yellow-500/30">
            <Brain className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Race Engineer AI</h2>
            <p className="text-xs text-gray-400">Real-Time Strategy</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
          </div>
        ) : insights && (insights.enhanced || insights.immediate_actions || insights.pit_stop_analysis) ? (
          <>
            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { id: 'actions', label: 'Actions', icon: Zap },
                { id: 'pit', label: 'Pit Stop', icon: Clock },
                { id: 'risks', label: 'Risks', icon: AlertCircle },
                { id: 'alternatives', label: 'Alternatives', icon: Target },
                { id: 'monitoring', label: 'Monitor', icon: TrendingUp },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSection(tab.id as any)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeSection === tab.id
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Immediate Actions */}
            {activeSection === 'actions' && insights.immediate_actions && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  Immediate Actions
                </h3>
                {insights.immediate_actions.map((action: any, idx: number) => {
                  const priority = (action.priority || 'medium') as 'high' | 'medium' | 'low';
                  const priorityColor = {
                    high: 'text-red-400 border-red-500/30 bg-red-500/10',
                    medium: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
                    low: 'text-green-400 border-green-500/30 bg-green-500/10',
                  }[priority] || 'text-gray-400 border-gray-500/30 bg-gray-500/10';

                  return (
                    <div
                      key={idx}
                      className={`rounded-lg p-4 border ${priorityColor} transition-all`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-xs font-semibold capitalize ${priorityColor.split(' ')[0]}`}>
                          {action.priority || 'medium'} Priority
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      </div>
                      <h4 className="text-white font-semibold text-sm mb-2">{action.action}</h4>
                      <p className="text-gray-300 text-xs mb-2">{action.reasoning}</p>
                      {action.expected_impact && (
                        <p className="text-gray-400 text-xs italic">Impact: {action.expected_impact}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pit Stop Analysis */}
            {activeSection === 'pit' && insights.pit_stop_analysis && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                  Pit Stop Analysis
                </h3>
                <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-xl p-4 border border-blue-500/30">
                  <div className="mb-3">
                    <span className="text-xs text-blue-400 font-semibold">Optimal Window</span>
                    <h4 className="text-white font-bold text-lg mt-1">{insights.pit_stop_analysis.optimal_window || 'N/A'}</h4>
                  </div>
                  <p className="text-gray-300 text-sm mb-4">{insights.pit_stop_analysis.reasoning}</p>
                  
                  {insights.pit_stop_analysis.benefits && insights.pit_stop_analysis.benefits.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs text-green-400 font-semibold mb-2 block">Benefits:</span>
                      <ul className="space-y-1">
                        {insights.pit_stop_analysis.benefits.map((benefit: string, idx: number) => (
                          <li key={idx} className="text-gray-300 text-xs flex items-start gap-2">
                            <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {insights.pit_stop_analysis.risks && insights.pit_stop_analysis.risks.length > 0 && (
                    <div>
                      <span className="text-xs text-red-400 font-semibold mb-2 block">Risks:</span>
                      <ul className="space-y-1">
                        {insights.pit_stop_analysis.risks.map((risk: string, idx: number) => (
                          <li key={idx} className="text-gray-300 text-xs flex items-start gap-2">
                            <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Risk Assessment */}
            {activeSection === 'risks' && insights.risk_assessment && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  Risk Assessment
                </h3>
                {insights.risk_assessment.map((risk: any, idx: number) => {
                  const probability = (risk.probability || 'medium') as 'high' | 'medium' | 'low';
                  const impact = (risk.impact || 'medium') as 'high' | 'medium' | 'low';
                  const probColor = {
                    high: 'bg-red-500/20 text-red-400',
                    medium: 'bg-yellow-500/20 text-yellow-400',
                    low: 'bg-green-500/20 text-green-400',
                  }[probability] || 'bg-gray-500/20 text-gray-400';

                  const impactColor = {
                    high: 'bg-red-500/20 text-red-400',
                    medium: 'bg-yellow-500/20 text-yellow-400',
                    low: 'bg-green-500/20 text-green-400',
                  }[impact] || 'bg-gray-500/20 text-gray-400';

                  return (
                    <div
                      key={idx}
                      className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-red-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-white font-semibold text-sm flex-1">{risk.risk}</h4>
                        <div className="flex gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${probColor}`}>
                            {risk.probability || 'medium'} prob
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${impactColor}`}>
                            {risk.impact || 'medium'} impact
                          </span>
                        </div>
                      </div>
                      {risk.mitigation && (
                        <p className="text-gray-400 text-xs mt-2">
                          <span className="text-gray-500">Mitigation: </span>
                          {risk.mitigation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Alternative Strategies */}
            {activeSection === 'alternatives' && insights.alternative_strategies && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-400" />
                  Alternative Strategies
                </h3>
                {insights.alternative_strategies.map((strategy: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-purple-500/50 transition-all"
                  >
                    <h4 className="text-white font-semibold text-sm mb-2">{strategy.strategy}</h4>
                    <p className="text-gray-400 text-xs mb-3">{strategy.scenario}</p>
                    
                    {strategy.pros && strategy.pros.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs text-green-400 font-semibold mb-1 block">Pros:</span>
                        <ul className="space-y-1">
                          {strategy.pros.map((pro: string, proIdx: number) => (
                            <li key={proIdx} className="text-gray-300 text-xs flex items-start gap-2">
                              <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {strategy.cons && strategy.cons.length > 0 && (
                      <div>
                        <span className="text-xs text-red-400 font-semibold mb-1 block">Cons:</span>
                        <ul className="space-y-1">
                          {strategy.cons.map((con: string, conIdx: number) => (
                            <li key={conIdx} className="text-gray-300 text-xs flex items-start gap-2">
                              <AlertCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Monitoring Points */}
            {activeSection === 'monitoring' && insights.monitoring_points && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  Key Monitoring Points
                </h3>
                {insights.monitoring_points.map((point: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-blue-500/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-semibold text-sm">{point.metric}</h4>
                      <span className="text-xs text-blue-400 font-semibold">{point.threshold}</span>
                    </div>
                    <p className="text-gray-400 text-xs">{point.action}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : strategyInsights?.error ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-400 text-sm font-semibold mb-2">Error Loading Insights</p>
            <p className="text-gray-400 text-xs">{strategyInsights.error}</p>
            <button
              onClick={loadStrategyInsights}
              className="mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <Brain className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">
              {insights && !insights.enhanced
                ? insights.message || insights.error || 'Gemini AI insights not available. Check API key configuration.'
                : strategyInsights?.error
                ? `Error: ${strategyInsights.error}`
                : 'Loading AI strategy insights...'}
            </p>
            {insights?.help && (
              <p className="text-blue-400 text-xs mt-2">{insights.help}</p>
            )}
            {!vehicleId && (
              <p className="text-yellow-400 text-xs mt-2">Please select a vehicle first</p>
            )}
            {strategyInsights && !insights && (
              <div className="mt-4">
                <p className="text-gray-500 text-xs mb-2">Debug Info:</p>
                <pre className="text-xs text-gray-600 bg-gray-900 p-2 rounded overflow-auto">
                  {JSON.stringify(strategyInsights, null, 2).substring(0, 500)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

