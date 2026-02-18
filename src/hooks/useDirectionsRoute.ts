import { useEffect, useRef, useMemo } from 'react';

interface UseDirectionsRouteOptions {
  map: google.maps.Map | null;
  waypoints: { lat: number; lng: number }[];
  isLoaded: boolean;
  strokeColor?: string;
}

/**
 * Uses DirectionsService to snap a polyline to actual roads,
 * then fits the map bounds to the route.
 */
export function useDirectionsRoute({
  map,
  waypoints,
  isLoaded,
  strokeColor = '#3b82f6',
}: UseDirectionsRouteOptions) {
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const directionsRequestId = useRef(0);

  // Stabilise waypoints reference so the effect only re-runs when coords change
  const stableWaypoints = useMemo(
    () => waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(waypoints)]
  );

  useEffect(() => {
    if (!map || !isLoaded) return;

    const cleanup = () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };

    if (stableWaypoints.length < 2) {
      cleanup();
      if (stableWaypoints.length === 1) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(stableWaypoints[0]);
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        map.setZoom(15);
      }
      return cleanup;
    }

    const requestId = ++directionsRequestId.current;

    const origin = stableWaypoints[0];
    const destination = stableWaypoints[stableWaypoints.length - 1];
    const intermediateWaypoints = stableWaypoints.slice(1, -1).map(wp => ({
      location: new google.maps.LatLng(wp.lat, wp.lng),
      stopover: true,
    }));

    const directionsService = new google.maps.DirectionsService();

    const makeRequest = (attempt = 0) => {
      directionsService.route(
        {
          origin: new google.maps.LatLng(origin.lat, origin.lng),
          destination: new google.maps.LatLng(destination.lat, destination.lng),
          waypoints: intermediateWaypoints,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
        },
        (result, status) => {
          // Ignore stale responses
          if (requestId !== directionsRequestId.current) return;

          // Retry on rate-limit with exponential backoff (max 3 attempts)
          if (status === google.maps.DirectionsStatus.OVER_QUERY_LIMIT && attempt < 3) {
            const delay = (attempt + 1) * 1500; // 1.5s, 3s, 4.5s
            setTimeout(() => {
              if (requestId === directionsRequestId.current) {
                makeRequest(attempt + 1);
              }
            }, delay);
            return;
          }

          cleanup();

          if (status === google.maps.DirectionsStatus.OK && result) {
            const overviewPath = result.routes[0]?.overview_path;
            if (overviewPath && overviewPath.length > 0) {
              polylineRef.current = new google.maps.Polyline({
                path: overviewPath,
                strokeColor,
                strokeWeight: 4,
                strokeOpacity: 0.8,
                icons: [{
                  icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3 },
                  offset: '50%',
                  repeat: '100px',
                }],
                map,
              });

              const bounds = new google.maps.LatLngBounds();
              overviewPath.forEach(p => bounds.extend(p));
              map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
              return;
            }
          }

          // Fallback: straight-line polyline when directions fail
          console.warn(`DirectionsService failed: ${status}. Using straight-line fallback.`);
          const path = stableWaypoints.map(wp => ({ lat: wp.lat, lng: wp.lng }));
          polylineRef.current = new google.maps.Polyline({
            path,
            strokeColor,
            strokeWeight: 3,
            strokeOpacity: 0.7,
            icons: [{
              icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3 },
              offset: '50%',
              repeat: '100px',
            }],
            map,
          } as google.maps.PolylineOptions);

          const bounds = new google.maps.LatLngBounds();
          stableWaypoints.forEach(wp => bounds.extend(wp));
          map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        }
      );
    };

    makeRequest();

    return cleanup;
  }, [map, stableWaypoints, isLoaded, strokeColor]);
}
