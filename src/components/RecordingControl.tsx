import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Circle, Square, Loader2, AlertCircle } from 'lucide-react';

interface RecordingStatus {
  recording: boolean;
  event_name: string | null;
  output_dir: string | null;
  start_time: string | null;
  vehicles_recorded: string[];
}

export function RecordingControl() {
  const [status, setStatus] = useState<RecordingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventName, setEventName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    // Poll status every 2 seconds
    const interval = setInterval(loadStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const data = await apiService.getRecordingStatus() as RecordingStatus;
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load recording status:', err);
    }
  };

  const handleStart = async () => {
    if (!eventName.trim()) {
      setError('Please enter an event name');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiService.startRecording(eventName.trim());
      await loadStatus();
      setEventName('');
    } catch (err: any) {
      setError(err.message || 'Failed to start recording');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiService.stopRecording();
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to stop recording');
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <div className="flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300">Data Recording</h3>
        <div className="flex items-center space-x-2">
          {status.recording ? (
            <>
              <Circle className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
              <span className="text-xs text-red-400 font-medium">Recording</span>
            </>
          ) : (
            <>
              <Circle className="h-3 w-3 text-gray-500 fill-gray-500" />
              <span className="text-xs text-gray-400">Stopped</span>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}

      {status.recording ? (
        <div className="space-y-2">
          <div className="text-xs text-gray-400">
            <div>Event: <span className="text-white font-medium">{status.event_name}</span></div>
            {status.start_time && (
              <div className="mt-1">Started: {new Date(status.start_time).toLocaleTimeString()}</div>
            )}
            {status.vehicles_recorded.length > 0 && (
              <div className="mt-1">Vehicles: {status.vehicles_recorded.length}</div>
            )}
          </div>
          <button
            onClick={handleStop}
            disabled={loading}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Stopping...</span>
              </>
            ) : (
              <>
                <Square className="h-4 w-4" />
                <span>Stop Recording</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Event name (e.g., R1, Practice_1)"
            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleStart()}
          />
          <button
            onClick={handleStart}
            disabled={loading || !eventName.trim()}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Starting...</span>
              </>
            ) : (
              <>
                <Circle className="h-4 w-4 fill-white" />
                <span>Start Recording</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

