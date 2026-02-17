import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { Job, JOB_TYPE_CONFIG } from '@/types';
import { customers as allCustomersData } from '@/data/mockData';
import { getCustomerCoords } from '@/lib/customerCoords';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
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

  const jobsWithCoords = useMemo(() =>
    jobs.map(job => {
      const customer = allCustomersData.find(c => c.id === job.customerId);
      const coords = customer ? getCustomerCoords(customer) : { lat: 32.07, lng: 34.77 };
      return { job, customer, coords };
    }),
    [jobs]
  );

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!mapRef.current || jobsWithCoords.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    jobsWithCoords.forEach(jc => bounds.extend(jc.coords));
    mapRef.current.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });
  }, [jobsWithCoords]);

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
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey });

  const center = useMemo(() => {
    if (jobsWithCoords.length === 0) return { lat: 32.07, lng: 34.77 };
    const avgLat = jobsWithCoords.reduce((s, jc) => s + jc.coords.lat, 0) / jobsWithCoords.length;
    const avgLng = jobsWithCoords.reduce((s, jc) => s + jc.coords.lng, 0) / jobsWithCoords.length;
    return { lat: avgLat, lng: avgLng };
  }, [jobsWithCoords]);

  const polylinePath = useMemo(() => jobsWithCoords.map(jc => jc.coords), [jobsWithCoords]);

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
        onLoad={onLoad}
        options={mapOptions}
      >
        {jobsWithCoords.length > 1 && (
          <Polyline
            key={jobsWithCoords.map(jc => jc.job.id).join(',')}
            path={polylinePath}
            options={{ strokeColor: '#3b82f6', strokeWeight: 3, strokeOpacity: 0.7, icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3 }, offset: '50%', repeat: '100px' }] }}
          />
        )}

        {jobsWithCoords.map((jc, idx) => {
          const color = jc.job.completionStatus === 'done' ? '#22c55e' : typeColorMap[jc.job.type] || '#3b82f6';
          return (
            <Marker
              key={jc.job.id}
              position={jc.coords}
              label={{ text: jc.job.completionStatus === 'done' ? '✓' : String(idx + 1), color: 'white', fontWeight: 'bold', fontSize: '12px' }}
              icon={{ path: google.maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: 1, strokeColor: 'white', strokeWeight: 2, scale: 14 }}
              onClick={() => setActiveMarkerId(jc.job.id === activeMarkerId ? null : jc.job.id)}
            >
              {activeMarkerId === jc.job.id && (
                <InfoWindow onCloseClick={() => setActiveMarkerId(null)}>
                  <div dir="rtl" style={{ minWidth: 180 }}>
                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>{jc.customer?.name}</p>
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
