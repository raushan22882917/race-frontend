import { useTelemetryStore } from '../store/telemetryStore';
import { useModal } from '../contexts/ModalContext';
import { Trophy, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export function Leaderboard() {
  const { leaderboard } = useTelemetryStore();
  const { showLeaderboard, setShowLeaderboard } = useModal();

  const getPositionColor = (position: number) => {
    if (position === 1) return 'bg-yellow-600';
    if (position === 2) return 'bg-gray-400';
    if (position === 3) return 'bg-orange-600';
    return 'bg-gray-700';
  };

  return (
    <div className="bg-transparent rounded-r-lg w-80 lg:w-96 shadow-xl border-r border-t border-b border-gray-700 backdrop-blur-sm relative z-10">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-transparent">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2 text-white">
            <Trophy size={20} className="text-yellow-500" />
            Leaderboard
          </h3>
          <button 
            onClick={() => setShowLeaderboard(false)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Close"
          >
            <ChevronUp className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[calc(100vh-180px)] overflow-y-auto">
        {leaderboard.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-8">No leaderboard data yet</div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <div
                key={entry.vehicle_id}
                className={`p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                  entry.position <= 3 ? getPositionColor(entry.position) : 'bg-transparent hover:bg-gray-700/30'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className={`font-bold text-xl flex-shrink-0 ${
                      entry.position === 1 ? 'text-yellow-900' :
                      entry.position === 2 ? 'text-gray-900' :
                      entry.position === 3 ? 'text-orange-900' :
                      'text-white'
                    }`}>
                      #{entry.position}
                    </span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-bold text-sm text-white truncate">
                        {entry.vehicle || `Vehicle ${entry.vehicle_id}`}
                      </span>
                      {entry.vehicle && entry.vehicle_id && entry.vehicle !== entry.vehicle_id && (
                        <span className="text-xs text-gray-300/80 mt-0.5 truncate">
                          ID: {entry.vehicle_id}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs font-semibold flex-shrink-0 ml-2 text-gray-200 bg-transparent px-2 py-1 rounded">
                    {entry.laps} laps
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t border-gray-600/50">
                  <div>
                    <span className="text-gray-300">Gap to Leader:</span>{' '}
                    <span className="font-semibold text-white">{entry.gap_first || '--'}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Gap to Previous:</span>{' '}
                    <span className="font-semibold text-white">{entry.gap_previous || '--'}</span>
                  </div>
                </div>

                {entry.best_lap_time && (
                  <div className="flex items-center gap-1 text-xs mt-2 pt-2 border-t border-gray-600/50">
                    <Clock size={12} className="text-gray-400" />
                    <span className="text-gray-300">Best Lap:</span>
                    <span className="font-semibold text-white">{entry.best_lap_time}</span>
                    <span className="text-gray-400 ml-1">
                      ({entry.best_lap_kph.toFixed(1)} km/h)
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

