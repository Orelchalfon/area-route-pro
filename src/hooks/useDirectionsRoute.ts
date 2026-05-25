import { useEffect, useRef, useMemo } from 'react';

interface UseDirectionsRouteOptions {
  map: google.maps.Map | null;
  waypoints: { lat: number; lng: number }[];
  isLoaded: boolean;
  strokeColor?: string;
}

const MAX_WAYPOINTS_PER_REQUEST = 8; // Google free-tier limit for intermediate waypoints

/**
 * Uses DirectionsService to snap a polyline to actual roads.
 * Automatically chunks large routes into multiple requests to
 * stay within Google's waypoint limits, then stitches the paths.
 */
export function useDirectionsRoute({
  map,
  waypoints,
  isLoaded,
  strokeColor = '#3b82f6',
}: UseDirectionsRouteOptions) {
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const requestId = useRef(0);

  const stableWaypoints = useMemo(
    () =>
      waypoints
        .map(wp => ({ lat: wp.lat, lng: wp.lng }))
        .filter(
          wp =>
            typeof wp.lat === 'number' &&
            typeof wp.lng === 'number' &&
            Number.isFinite(wp.lat) &&
            Number.isFinite(wp.lng)
        ),
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
      return cleanup;
    }

    const currentRequestId = ++requestId.current;

    // Split waypoints into chunks that respect the per-request limit.
    // Each chunk shares its first/last point with adjacent chunks so
    // the stitched path is continuous.
    const chunks: { lat: number; lng: number }[][] = [];
    const chunkSize = MAX_WAYPOINTS_PER_REQUEST + 2; // origin + destination + intermediates
    for (let i = 0; i < stableWaypoints.length; i += chunkSize - 1) {
      chunks.push(stableWaypoints.slice(i, i + chunkSize));
      if (i + chunkSize >= stableWaypoints.length) break;
    }

    const directionsService = new google.maps.DirectionsService();

    const fetchChunk = (
      chunk: { lat: number; lng: number }[],
      attempt = 0
    ): Promise<google.maps.LatLng[] | null> =>
      new Promise(resolve => {
        const origin = chunk[0];
        const destination = chunk[chunk.length - 1];
        const intermediateWaypoints = chunk.slice(1, -1).map(wp => ({
          location: new google.maps.LatLng(wp.lat, wp.lng),
          stopover: true,
        }));

        directionsService.route(
          {
            origin: new google.maps.LatLng(origin.lat, origin.lng),
            destination: new google.maps.LatLng(destination.lat, destination.lng),
            waypoints: intermediateWaypoints,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: false, // preserve user-defined order
          },
          (result, status) => {
            if (currentRequestId !== requestId.current) {
              resolve(null);
              return;
            }

            if (status === google.maps.DirectionsStatus.OVER_QUERY_LIMIT && attempt < 3) {
              const delay = (attempt + 1) * 1500;
              setTimeout(() => {
                if (currentRequestId === requestId.current) {
                  fetchChunk(chunk, attempt + 1).then(resolve);
                } else {
                  resolve(null);
                }
              }, delay);
              return;
            }

            if (status === google.maps.DirectionsStatus.OK && result) {
              const path = result.routes[0]?.overview_path;
              resolve(path && path.length > 0 ? path : null);
            } else {
              console.warn(`DirectionsService chunk failed: ${status}`);
              resolve(null);
            }
          }
        );
      });

    // Execute all chunks sequentially to avoid rate-limiting
    (async () => {
      const allPaths: google.maps.LatLng[][] = [];
      let failed = false;

      for (const chunk of chunks) {
        if (currentRequestId !== requestId.current) return;
        const path = await fetchChunk(chunk);
        if (!path) {
          failed = true;
          break;
        }
        allPaths.push(path);
      }

      if (currentRequestId !== requestId.current) return;
      cleanup();

      if (!failed && allPaths.length > 0) {
        // Stitch paths, skipping overlapping start points of subsequent chunks
        const stitched: google.maps.LatLng[] = [];
        allPaths.forEach((path, idx) => {
          stitched.push(...(idx === 0 ? path : path.slice(1)));
        });

        polylineRef.current = new google.maps.Polyline({
          path: stitched,
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

        // No auto-zoom — preserve user's current view
      } else {
        // Fallback: straight-line polyline
        console.warn('DirectionsService failed for one or more chunks. Using straight-line fallback.');
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

        // No auto-zoom — preserve user's current view
      }
    })();

    return cleanup;
  }, [map, stableWaypoints, isLoaded, strokeColor]);
}
