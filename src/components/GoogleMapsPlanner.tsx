import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMapsConfig';
import { JOB_TYPE_CONFIG, JobType, Customer } from '@/types';
import { useDirectionsRoute } from '@/hooks/useDirectionsRoute';
import { useGeocodeCustomers } from '@/hooks/useGeocodeCustomers';

interface Stop {
  id: string;
  position: { lat: number; lng: number };
  label: string;
  title: string;
  type: JobType;
  isDone: boolean;
  customer?: Customer;
  fullAddress?: string;
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
  const lastPositionSignatureRef = useRef('');

  // Geocode customer addresses for accurate positions
  const customers = useMemo(() => stops.map(s => s.customer).filter(Boolean) as Customer[], [stops]);
  const geocodedMap = useGeocodeCustomers(customers, isLoaded);

  // Resolve positions: prefer exact customer coords, then geocoded positions, then fallback to passed position
  const resolvedStops = useMemo(() => {
    const usedPositions = new Map<string, number>();

    return stops.map(stop => {
      const hasExactCustomerCoords = typeof stop.customer?.lat === 'number' && typeof stop.customer?.lng === 'number';
      let position = hasExactCustomerCoords
        ? { lat: stop.customer!.lat, lng: stop.customer!.lng }
        : (stop.customer && geocodedMap.get(stop.customer.id)) || stop.position;

      const key = `${position.lat.toFixed(5)},${position.lng.toFixed(5)}`;
      const count = usedPositions.get(key) || 0;
      if (count > 0) {
        const angle = (count * 60) * (Math.PI / 180);
        position = { lat: position.lat + 0.0008 * Math.cos(angle), lng: position.lng + 0.0008 * Math.sin(angle) };
      }

      usedPositions.set(key, count + 1);
      return { ...stop, position };
    });
  }, [stops, geocodedMap]);

  const center = useMemo(() => {
    if (resolvedStops.length === 0) return { lat: 32.07, lng: 34.77 };
    const avgLat = resolvedStops.reduce((sum, stop) => sum + stop.position.lat, 0) / resolvedStops.length;
    const avgLng = resolvedStops.reduce((sum, stop) => sum + stop.position.lng, 0) / resolvedStops.length;
    return { lat: avgLat, lng: avgLng };
  }, [resolvedStops]);

  const fitMapToStops = useCallback((map: google.maps.Map, stopsToFit: Stop[]) => {
    if (stopsToFit.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    stopsToFit.forEach(stop => bounds.extend(stop.position));
    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    fitMapToStops(map, resolvedStops);
    lastPositionSignatureRef.current = createStopPositionSignature(resolvedStops);
  }, [fitMapToStops, resolvedStops]);

  useEffect(() => {
    if (!mapRef.current || resolvedStops.length === 0) return;

    const nextSignature = createStopPositionSignature(resolvedStops);
    if (!lastPositionSignatureRef.current) {
      lastPositionSignatureRef.current = nextSignature;
      return;
    }

    if (lastPositionSignatureRef.current === nextSignature) return;

    lastPositionSignatureRef.current = nextSignature;
    fitMapToStops(mapRef.current, resolvedStops);
  }, [fitMapToStops, resolvedStops]);

  // Snap-to-roads polyline
  const routeWaypoints = useMemo(
    () => resolvedStops.map(stop => ({ lat: stop.position.lat, lng: stop.position.lng })),
    [resolvedStops]
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
      {resolvedStops.map((stop) => {
        const color = stop.isDone ? '#22c55e' : typeColorMap[stop.type] || '#3b82f6';
        return (
          <Marker
            key={`${stop.id}-${stop.position.lat.toFixed(6)}-${stop.position.lng.toFixed(6)}-${stop.label}`}
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
              <InfoWindow position={stop.position} onCloseClick={() => setActiveMarkerId(null)}>
                <div dir="rtl" style={{ minWidth: 180 }}>
                  <p style={{ fontWeight: 'bold', marginBottom: 4 }}>#{stop.label} {stop.title}</p>
                  <p style={{ fontSize: 12, color: '#666' }}>{JOB_TYPE_CONFIG[stop.type].label}</p>
                  {stop.fullAddress && (
                    <p style={{ fontSize: 12, color: '#999' }}>{stop.fullAddress}</p>
                  )}
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

function createStopPositionSignature(stops: Stop[]) {
  return stops
    .map(stop => `${stop.id}:${stop.position.lat.toFixed(6)},${stop.position.lng.toFixed(6)}`)
    .join('|');
}
