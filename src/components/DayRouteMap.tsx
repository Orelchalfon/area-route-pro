import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { Job, JOB_TYPE_CONFIG, Customer } from '@/types';
import { useJobsContext } from '@/contexts/JobsContext';
import { getCustomerCoords } from '@/lib/customerCoords';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { useDirectionsRoute } from '@/hooks/useDirectionsRoute';
import { useGeocodeCustomers } from '@/hooks/useGeocodeCustomers';
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

type JobWithOptionalCoords = Job & { lat?: number; lng?: number };

const DEFAULT_MAP_CENTER = { lat: 32.07, lng: 34.77 };

function hasJobCoords(job: Job): job is JobWithOptionalCoords & { lat: number; lng: number } {
  const candidate = job as JobWithOptionalCoords;
  return typeof candidate.lat === 'number' && typeof candidate.lng === 'number';
}

function getPreferredCoords(job: Job, fallback: { lat: number; lng: number }) {
  if (hasJobCoords(job)) {
    return { lat: job.lat, lng: job.lng };
  }

  return fallback;
}

export function DayRouteMap({ jobs, height = '80vh' }: DayRouteMapProps) {
  const { customersList: allCustomersData } = useJobsContext();
  const { apiKey, loading, error, fetchKey } = useGoogleMapsKey();
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => { fetchKey(); }, [fetchKey]);

  const jobCustomers = useMemo(() =>
    jobs.map(job => {
      const customer = allCustomersData.find(c => c.id === job.customerId);
      return { job, customer };
    }),
    [jobs, allCustomersData]
  );

  const jobsWithCoords = useMemo(() =>
    jobCustomers.map(({ job, customer }) => ({
      job,
      customer,
      coords: getPreferredCoords(job, customer ? getCustomerCoords(customer) : DEFAULT_MAP_CENTER),
    })),
    [jobCustomers]
  );

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
  jobsWithCoords: { job: Job; customer: Customer | undefined; coords: { lat: number; lng: number } }[];
  height: string;
  activeMarkerId: string | null;
  setActiveMarkerId: (id: string | null) => void;
  onLoad: (map: google.maps.Map) => void;
}) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries: GOOGLE_MAPS_LIBRARIES });
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  const customers = useMemo(() => jobsWithCoords.map(jc => jc.customer), [jobsWithCoords]);
  const geocodedMap = useGeocodeCustomers(customers, isLoaded);

  const resolvedJobs = useMemo(() => {
    const usedPositions = new Map<string, number>();

    return jobsWithCoords.map(jc => {
      const hasExactCustomerCoords = typeof jc.customer?.lat === 'number' && typeof jc.customer?.lng === 'number';
      const fallbackCoords = hasExactCustomerCoords
        ? { lat: jc.customer.lat, lng: jc.customer.lng }
        : (jc.customer && geocodedMap.get(jc.customer.id)) || jc.coords;

      let coords = getPreferredCoords(jc.job, fallbackCoords);
      const key = `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
      const count = usedPositions.get(key) || 0;

      if (count > 0) {
        const angle = (count * 60) * (Math.PI / 180);
        coords = {
          lat: coords.lat + 0.0008 * Math.cos(angle),
          lng: coords.lng + 0.0008 * Math.sin(angle),
        };
      }

      usedPositions.set(key, count + 1);
      return { ...jc, coords };
    });
  }, [jobsWithCoords, geocodedMap]);

  const center = useMemo(() => {
    if (resolvedJobs.length === 0) return DEFAULT_MAP_CENTER;
    const avgLat = resolvedJobs.reduce((s, jc) => s + jc.coords.lat, 0) / resolvedJobs.length;
    const avgLng = resolvedJobs.reduce((s, jc) => s + jc.coords.lng, 0) / resolvedJobs.length;
    return { lat: avgLat, lng: avgLng };
  }, [resolvedJobs]);

  const mapRenderKey = useMemo(
    () => resolvedJobs.map(jc => `${jc.job.id}:${jc.coords.lat.toFixed(6)}:${jc.coords.lng.toFixed(6)}`).join('|'),
    [resolvedJobs]
  );

  const hasFittedRef = useRef(false);
  const prevCoordsKeyRef = useRef('');

  useEffect(() => {
    const coordsKey = resolvedJobs.map(jc => `${jc.coords.lat.toFixed(4)},${jc.coords.lng.toFixed(4)}`).join('|');
    if (coordsKey !== prevCoordsKeyRef.current && mapInstanceRef.current && resolvedJobs.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      resolvedJobs.forEach(jc => bounds.extend(jc.coords));
      mapInstanceRef.current.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      prevCoordsKeyRef.current = coordsKey;
    }
  }, [resolvedJobs]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapInstanceRef.current = map;
    onLoad(map);
    if (!hasFittedRef.current && resolvedJobs.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      resolvedJobs.forEach(jc => bounds.extend(jc.coords));
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      hasFittedRef.current = true;
      prevCoordsKeyRef.current = resolvedJobs.map(jc => `${jc.coords.lat.toFixed(4)},${jc.coords.lng.toFixed(4)}`).join('|');
    }
  }, [onLoad, resolvedJobs]);

  const routeWaypoints = useMemo(
    () =>
      resolvedJobs
        .map(jc => ({ lat: jc.coords.lat, lng: jc.coords.lng }))
        .filter(
          wp =>
            typeof wp.lat === 'number' &&
            typeof wp.lng === 'number' &&
            Number.isFinite(wp.lat) &&
            Number.isFinite(wp.lng)
        ),
    [resolvedJobs]
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
        key={mapRenderKey}
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
        onLoad={handleMapLoad}
        options={mapOptions}
      >
        {resolvedJobs.map((jc, idx) => {
          const color = jc.job.completionStatus === 'done' ? '#22c55e' : typeColorMap[jc.job.type] || '#3b82f6';
          const markerKey = `${jc.job.id}-${jc.coords.lat.toFixed(6)}-${jc.coords.lng.toFixed(6)}`;

          return (
            <Marker
              key={markerKey}
              position={jc.coords}
              zIndex={1000 + idx}
              label={{ text: jc.job.completionStatus === 'done' ? '✓' : String(idx + 1), color: 'white', fontWeight: 'bold', fontSize: '12px' }}
              icon={{ path: google.maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: 1, strokeColor: 'white', strokeWeight: 2, scale: 14 }}
              onClick={() => setActiveMarkerId(jc.job.id === activeMarkerId ? null : jc.job.id)}
            >
              {activeMarkerId === jc.job.id && (
                <InfoWindow position={jc.coords} onCloseClick={() => setActiveMarkerId(null)}>
                  <div dir="rtl" style={{ minWidth: 180 }}>
                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>#{idx + 1} {jc.customer?.name}</p>
                    <p style={{ fontSize: 12, color: '#666' }}>{JOB_TYPE_CONFIG[jc.job.type].label}</p>
                    <p style={{ fontSize: 12, color: '#999' }}>{[jc.customer?.address, jc.customer?.city].filter(Boolean).join(', ')}</p>
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
