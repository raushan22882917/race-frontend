import { useState, useMemo } from 'react';
import { MapPin, X, ChevronDown, ChevronUp } from 'lucide-react';
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api';
import { TrackMap } from './TrackMap';
import { useModal } from '../contexts/ModalContext';
import trackData from '../data/track.json';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Google Maps API key
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export function TrackInfo() {
  const { showFullscreenMap, setShowFullscreenMap, sidebarCollapsed } = useModal();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Extract track path coordinates from JSON
  const trackPath = useMemo(() => {
    return trackData.trackPath.map((point) => ({
      lat: point.latitude,
      lng: point.longitude,
    }));
  }, []);

  // Calculate center from track path
  const center = useMemo(() => {
    if (trackPath.length === 0) {
      return { lat: 33.532687202828264, lng: -86.61964077924488 };
    }
    const lats = trackPath.map((p) => p.lat);
    const lngs = trackPath.map((p) => p.lng);
    return {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    };
  }, [trackPath]);

  // Start/Finish point
  const startFinishPoint = trackPath[0];

  // Create icon config only when Google Maps is loaded
  const startMarkerIcon = useMemo(() => {
    if (!mapLoaded || !window.google?.maps?.SymbolPath) {
      return undefined; // Use default marker
    }
    try {
      const googleMaps = window.google?.maps;
      if (!googleMaps || !googleMaps.SymbolPath) {
        return undefined;
      }
      return {
        path: googleMaps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: '#00FF00',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      };
    } catch (error) {
      console.warn('Error creating marker icon:', error);
      return undefined;
    }
  }, [mapLoaded]);

  // Polyline options for track path
  const trackPathOptions = {
    strokeColor: '#FFFF00',
    strokeOpacity: 0.9,
    strokeWeight: 3,
    clickable: false,
    draggable: false,
    editable: false,
    visible: true,
    zIndex: 1,
  };

  const mapOptions = {
    zoom: 15,
    center: center,
    mapTypeId: 'satellite' as const,
    disableDefaultUI: true,
    zoomControl: true,
  };

  return (
    <>
      {/* Track Info Card - Matching VehicleInfoCards Style */}
      <div className="bg-gray-800 bg-opacity-95 rounded-lg w-80 lg:w-96 shadow-xl border border-gray-700 backdrop-blur-sm overflow-hidden transition-all duration-300 ease-in-out">
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded 
              ? 'max-h-[500px] opacity-100 translate-x-0' 
              : 'max-h-0 opacity-0 translate-x-full'
          }`}
        >
          <div className="p-4">
            <div className="mb-3">
              <h4 className="text-base font-semibold text-white mb-1">Barber Motorsports Park</h4>
              <div className="text-xs text-gray-400 space-y-0.5">
                <div>Track Length: 2.38 miles (3.83 km)</div>
                <div>Location: Birmingham, Alabama</div>
              </div>
            </div>
            
            <div 
              className="relative w-full h-32 rounded overflow-hidden bg-gray-700 cursor-pointer hover:opacity-90 transition-opacity border border-gray-600"
              onClick={() => setShowFullscreenMap(true)}
              title="Click to view fullscreen map"
            >
              {GOOGLE_MAPS_API_KEY ? (
                <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    options={mapOptions}
                    onLoad={(map) => {
                      setMapLoaded(true);
                      // Fit bounds to track
                      try {
                        if (trackPath.length > 0 && window.google?.maps) {
                          const googleMaps = window.google.maps;
                          if (googleMaps && googleMaps.LatLngBounds && googleMaps.LatLng) {
                            const googleBounds = new googleMaps.LatLngBounds();
                            trackPath.forEach((point) => {
                              googleBounds.extend(new googleMaps.LatLng(point.lat, point.lng));
                            });
                            map.fitBounds(googleBounds, 20);
                          }
                        }
                      } catch (error) {
                        console.warn('Error fitting map bounds:', error);
                      }
                    }}
                  >
                    {/* Draw track path */}
                    {trackPath.length > 0 && (
                      <Polyline path={trackPath} options={trackPathOptions} />
                    )}
                    {/* Start/Finish Marker */}
                    {startFinishPoint && (
                      <Marker
                        position={startFinishPoint}
                        icon={startMarkerIcon}
                        label={{
                          text: 'START',
                          color: '#FFFFFF',
                          fontSize: '10px',
                          fontWeight: 'bold',
                        }}
                      />
                    )}
                  </GoogleMap>
                </LoadScript>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  <div className="text-center">
                    <MapPin size={24} className="mx-auto mb-1" />
                    <div>Google Maps API key required</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Map Modal - Slides from Left */}
      {showFullscreenMap && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md">
            <div className={`fixed top-0 bottom-0 bg-gray-900 shadow-2xl border-r border-gray-700/50 overflow-hidden animate-slide-in-from-left transition-all duration-300 ${
              sidebarCollapsed
                ? 'right-[61px] w-[calc(100vw-61px)]' // Collapsed: 16px + 40px + 5px = 61px from right
                : 'right-[213px] w-[calc(100vw-213px)]' // Expanded: 16px + 192px + 5px = 213px from right
            }`}>
            <div className="absolute top-4 left-4 z-10">
              <button
                onClick={() => setShowFullscreenMap(false)}
                className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full transition-colors z-10"
                title="Close map"
              >
                <X size={24} />
              </button>
            </div>
            <div className="w-full h-full">
              <TrackMap 
                showStartFinish={true}
                showCheckpoints={true}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

