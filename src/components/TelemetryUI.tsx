import { useTelemetryStore } from '../store/telemetryStore';

export function TelemetryUI() {
  const { vehicles, selectedVehicleId } = useTelemetryStore();
  const selectedVehicle = selectedVehicleId ? vehicles[selectedVehicleId] : null;

  if (!selectedVehicle) {
    return (
      <div className="bg-gray-800 bg-opacity-90 rounded-lg p-4 w-80">
        <div className="text-sm text-gray-400">No vehicle selected</div>
      </div>
    );
  }

  const telemetry = selectedVehicle.telemetry;

  return (
    <div className="bg-gray-800 bg-opacity-90 rounded-lg p-4 w-80 space-y-4">
      {/* Lap Distance */}
      {telemetry.lap_distance !== undefined && (
        <div>
          <div className="text-xs text-gray-400 mb-1">Lap Distance</div>
          <div className="text-lg font-semibold">
            {telemetry.lap_distance.toFixed(2)} m
          </div>
        </div>
      )}

      {/* Acceleration Forces */}
      {(telemetry.acceleration_x !== undefined || telemetry.acceleration_y !== undefined) && (
        <div className="pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">Forces</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              X: {telemetry.acceleration_x?.toFixed(2) || '--'} m/s²
            </div>
            <div>
              Y: {telemetry.acceleration_y?.toFixed(2) || '--'} m/s²
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

