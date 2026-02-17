import { useMemo, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { useState } from 'react';
import { JOB_TYPE_CONFIG, JobType } from '@/types';

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
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey });
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const center = useMemo(() => {
    if (stops.length === 0) return { lat: 32.07, lng: 34.77 };
    const avgLat = stops.reduce((s, st) => s + st.position.lat, 0) / stops.length;
    const avgLng = stops.reduce((s, st) => s + st.position.lng, 0) / stops.length;
    return { lat: avgLat, lng: avgLng };
  }, [stops]);

  const polylinePath = useMemo(() =>
    stops.map(s => s.position),
    [stops]
  );

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Fit bounds when stops change
  useEffect(() => {
    if (!mapRef.current || stops.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    stops.forEach(s => bounds.extend(s.position));
    mapRef.current.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
  }, [stops]);

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
      {/* Route line */}
      {stops.length > 1 && polylinePath.length > 1 && polylinePath.every(p => p && typeof p.lat === 'number' && typeof p.lng === 'number') && (
        <Polyline
          key={`poly-${stops.map(s => s.id).join(',')}`}
          path={polylinePath}
          options={{
            strokeColor: '#3b82f6',
            strokeWeight: 3,
            strokeOpacity: 0.7,
            icons: [{
              icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3 },
              offset: '50%',
              repeat: '100px',
            }],
          }}
        />
      )}

      {/* Stop markers */}
      {stops.map((stop) => {
        const color = stop.isDone ? '#22c55e' : typeColorMap[stop.type] || '#3b82f6';
        return (
          <Marker
            key={stop.id}
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
