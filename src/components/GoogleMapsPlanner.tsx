import { useMemo, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMapsConfig';
import { useState } from 'react';
import { JOB_TYPE_CONFIG, JobType } from '@/types';
import { useDirectionsRoute } from '@/hooks/useDirectionsRoute';

interface Stop {
  id: string;
  position: { lat: number; lng: number };
  label: string;
  title: string;
  type: JobType;
  isDone: boolean;
}

interface GoogleMapsPlannerProps {
  apiKey: string;
  stops: Stop[];
}

const typeColorMap: Record<string, string> = {
  filter_replacement: '#3b82f6',
  malfunction: '#ef4444',
  installation: '#a855f7',
};

const mapContainerStyle = { width: '100%', height: '100%' };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
};

export function GoogleMapsPlanner({ apiKey, stops }: GoogleMapsPlannerProps) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries: GOOGLE_MAPS_LIBRARIES });
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const center = useMemo(() => {
    if (stops.length === 0) return { lat: 32.07, lng: 34.77 };
    const avgLat = stops.reduce((s, st) => s + st.position.lat, 0) / stops.length;
    const avgLng = stops.reduce((s, st) => s + st.position.lng, 0) / stops.length;
    return { lat: avgLat, lng: avgLng };
  }, [stops]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Snap-to-roads polyline + auto-fit bounds
  const routeWaypoints = useMemo(
    () => stops.map(s => ({ lat: s.position.lat, lng: s.position.lng })),
    [stops]
  );

  useDirectionsRoute({
    map: mapRef.current,
    waypoints: routeWaypoints,
    isLoaded,
  });

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <p className="text-sm text-destructive">שגיאה בטעינת Google Maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={12}
      onLoad={onLoad}
      options={mapOptions}
    >
      {/* Stop markers */}
      {stops.map((stop) => {
        const color = stop.isDone ? '#22c55e' : typeColorMap[stop.type] || '#3b82f6';
        return (
          <Marker
            key={`${stop.id}-pos-${stop.label}`}
            position={stop.position}
            label={{
              text: stop.isDone ? '✓' : stop.label,
              color: 'white',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 2,
              scale: 14,
            }}
            onClick={() => setActiveMarkerId(stop.id === activeMarkerId ? null : stop.id)}
          >
            {activeMarkerId === stop.id && (
              <InfoWindow onCloseClick={() => setActiveMarkerId(null)}>
                <div dir="rtl" style={{ minWidth: 180 }}>
                  <p style={{ fontWeight: 'bold', marginBottom: 4 }}>#{stop.label} {stop.title}</p>
                  <p style={{ fontSize: 12, color: '#666' }}>{JOB_TYPE_CONFIG[stop.type].label}</p>
                  {stop.isDone && (
                    <p style={{ fontSize: 12, color: '#22c55e', fontWeight: 500 }}>✓ הושלם</p>
                  )}
                </div>
              </InfoWindow>
            )}
          </Marker>
        );
      })}
    </GoogleMap>
  );
}
