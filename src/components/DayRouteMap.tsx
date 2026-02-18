import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { Job, JOB_TYPE_CONFIG } from '@/types';
import { customers as allCustomersData } from '@/data/mockData';
import { getCustomerCoords } from '@/lib/customerCoords';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { useDirectionsRoute } from '@/hooks/useDirectionsRoute';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMapsConfig';
import { AlertTriangle } from 'lucide-react';

// Re-export for backward compatibility
export { getCustomerCoords } from '@/lib/customerCoords';

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
  fullscreenControl: false,
};

interface DayRouteMapProps {
  jobs: Job[];
  height?: string;
}

export function DayRouteMap({ jobs, height = '350px' }: DayRouteMapProps) {
  const { apiKey, loading, error, fetchKey } = useGoogleMapsKey();
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Fetch key on mount
  useEffect(() => { fetchKey(); }, [fetchKey]);

  const jobsWithCoords = useMemo(() => {
    const result = jobs.map(job => {
      const customer = allCustomersData.find(c => c.id === job.customerId);
      const coords = customer ? getCustomerCoords(customer) : { lat: 32.07, lng: 34.77 };
      return { job, customer, coords };
    });
    console.log(`[DayRouteMap] Rendering ${result.length} markers for ${jobs.length} jobs`);
    return result;
  }, [jobs]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);


  if (jobs.length === 0) return null;

  if (loading || !apiKey) {
    return (
      <div className="rounded-lg overflow-hidden border border-border flex items-center justify-center bg-muted/20" style={{ height }}>
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg overflow-hidden border border-border flex items-center justify-center bg-muted/20" style={{ height }}>
        <div className="text-center">
          <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-1" />
          <p className="text-xs text-destructive">שגיאה בטעינת מפה</p>
        </div>
      </div>
    );
  }

  return (
    <DayRouteMapInner
      apiKey={apiKey}
      jobsWithCoords={jobsWithCoords}
      height={height}
      activeMarkerId={activeMarkerId}
      setActiveMarkerId={setActiveMarkerId}
      onLoad={onLoad}
    />
  );
}

function DayRouteMapInner({
  apiKey,
  jobsWithCoords,
  height,
  activeMarkerId,
  setActiveMarkerId,
  onLoad,
}: {
  apiKey: string;
  jobsWithCoords: { job: Job; customer: any; coords: { lat: number; lng: number } }[];
  height: string;
  activeMarkerId: string | null;
  setActiveMarkerId: (id: string | null) => void;
  onLoad: (map: google.maps.Map) => void;
}) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries: GOOGLE_MAPS_LIBRARIES });
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  const center = useMemo(() => {
    if (jobsWithCoords.length === 0) return { lat: 32.07, lng: 34.77 };
    const avgLat = jobsWithCoords.reduce((s, jc) => s + jc.coords.lat, 0) / jobsWithCoords.length;
    const avgLng = jobsWithCoords.reduce((s, jc) => s + jc.coords.lng, 0) / jobsWithCoords.length;
    return { lat: avgLat, lng: avgLng };
  }, [jobsWithCoords]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapInstanceRef.current = map;
    onLoad(map);
    // Immediately fit bounds to all markers so they're all visible
    if (jobsWithCoords.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      jobsWithCoords.forEach(jc => bounds.extend(jc.coords));
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [onLoad, jobsWithCoords]);

  // Snap-to-roads polyline + auto-fit bounds
  const routeWaypoints = useMemo(
    () => jobsWithCoords.map(jc => ({ lat: jc.coords.lat, lng: jc.coords.lng })),
    [jobsWithCoords]
  );

  useDirectionsRoute({
    map: mapInstanceRef.current,
    waypoints: routeWaypoints,
    isLoaded,
  });

  if (!isLoaded) {
    return (
      <div className="rounded-lg overflow-hidden border border-border flex items-center justify-center bg-muted/20" style={{ height }}>
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-border" style={{ height }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
        onLoad={handleMapLoad}
        options={mapOptions}
      >
        {/* Markers are rendered independently of the route polyline */}
        {jobsWithCoords.map((jc, idx) => {
          const color = jc.job.completionStatus === 'done' ? '#22c55e' : typeColorMap[jc.job.type] || '#3b82f6';
          return (
            <Marker
              key={jc.job.id}
              position={jc.coords}
              zIndex={1000 + idx}
              label={{ text: jc.job.completionStatus === 'done' ? '✓' : String(idx + 1), color: 'white', fontWeight: 'bold', fontSize: '12px' }}
              icon={{ path: google.maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: 1, strokeColor: 'white', strokeWeight: 2, scale: 14 }}
              onClick={() => setActiveMarkerId(jc.job.id === activeMarkerId ? null : jc.job.id)}
            >
              {activeMarkerId === jc.job.id && (
                <InfoWindow onCloseClick={() => setActiveMarkerId(null)}>
                  <div dir="rtl" style={{ minWidth: 180 }}>
                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>#{idx + 1} {jc.customer?.name}</p>
                    <p style={{ fontSize: 12, color: '#666' }}>{JOB_TYPE_CONFIG[jc.job.type].label}</p>
                    <p style={{ fontSize: 12, color: '#999' }}>{jc.customer?.address}</p>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          );
        })}
      </GoogleMap>
    </div>
  );
}
