import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Clean up previous polyline
    const cleanup = () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };

    if (waypoints.length < 2) {
      cleanup();
      // Still fit bounds for a single point
      if (waypoints.length === 1) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(waypoints[0]);
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        map.setZoom(15);
      }
      return cleanup;
    }

    const requestId = ++directionsRequestId.current;

    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const intermediateWaypoints = waypoints.slice(1, -1).map(wp => ({
      location: new google.maps.LatLng(wp.lat, wp.lng),
      stopover: true,
    }));

    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        waypoints: intermediateWaypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      },
      (result, status) => {
        // Ignore stale responses
        if (requestId !== directionsRequestId.current) return;

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

            // Fit bounds to the route
            const bounds = new google.maps.LatLngBounds();
            overviewPath.forEach(p => bounds.extend(p));
            map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
          }
        } else {
          // Fallback: straight-line polyline + fitBounds
          const path = waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng }));
          polylineRef.current = new google.maps.Polyline({
            path,
            strokeColor,
            strokeWeight: 3,
            strokeOpacity: 0.7,
            strokeDashArray: [4, 4],
            icons: [{
              icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3 },
              offset: '50%',
              repeat: '100px',
            }],
            map,
          } as google.maps.PolylineOptions);

          const bounds = new google.maps.LatLngBounds();
          waypoints.forEach(wp => bounds.extend(wp));
          map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        }
      }
    );

    return cleanup;
  }, [map, waypoints, isLoaded, strokeColor]);
}
