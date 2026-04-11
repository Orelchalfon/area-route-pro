import { useEffect, useRef, useState } from 'react';
import { Customer } from '@/types';

// Persistent cache across renders/mounts
const geocodeCache = new Map<string, { lat: number; lng: number }>();

/**
 * Given an array of customers and a loaded Google Maps API,
 * geocodes each customer's full address (address + city) and
 * returns a map of customerId → { lat, lng }.
 */
export function useGeocodeCustomers(
  customers: (Customer | undefined)[],
  isGoogleLoaded: boolean
) {
  const [coordsMap, setCoordsMap] = useState<Map<string, { lat: number; lng: number }>>(new Map());
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    if (!isGoogleLoaded) return;

    const validCustomers = customers.filter(Boolean) as Customer[];
    if (validCustomers.length === 0) {
      setCoordsMap(new Map());
      return;
    }

    const initialMap = new Map<string, { lat: number; lng: number }>();
    validCustomers.forEach(customer => {
      if (hasExactCoords(customer)) {
        initialMap.set(customer.id, { lat: customer.lat, lng: customer.lng });
        return;
      }

      const cached = geocodeCache.get(buildAddressKey(customer));
      if (cached) {
        initialMap.set(customer.id, cached);
      }
    });

    setCoordsMap(new Map(initialMap));

    const needsGeocoding = validCustomers.filter(customer => {
      if (hasExactCoords(customer)) return false;
      return !geocodeCache.has(buildAddressKey(customer));
    });

    if (needsGeocoding.length === 0) return;

    if (!geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }

    const geocoder = geocoderRef.current;
    const currentRunId = ++runIdRef.current;
    const batchSize = 5;
    const delay = 300;
    let index = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const processBatch = () => {
      if (currentRunId !== runIdRef.current) return;

      const batch = needsGeocoding.slice(index, index + batchSize);
      if (batch.length === 0) return;

      const promises = batch.map(customer => {
        const fullAddress = [customer.address, customer.city].filter(Boolean).join(', ') + ', ישראל';

        return geocoder.geocode({ address: fullAddress })
          .then(result => {
            if (currentRunId !== runIdRef.current) return null;

            if (result.results?.[0]?.geometry?.location) {
              const loc = result.results[0].geometry.location;
              const coords = { lat: loc.lat(), lng: loc.lng() };
              geocodeCache.set(buildAddressKey(customer), coords);
              return { id: customer.id, coords };
            }

            return null;
          })
          .catch(() => null);
      });

      Promise.all(promises).then(results => {
        if (currentRunId !== runIdRef.current) return;

        setCoordsMap(prev => {
          const next = new Map(prev);
          results.forEach(result => {
            if (result) {
              next.set(result.id, result.coords);
            }
          });
          return next;
        });

        index += batchSize;
        if (index < needsGeocoding.length) {
          timeoutId = setTimeout(processBatch, delay);
        }
      });
    };

    processBatch();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (runIdRef.current === currentRunId) {
        runIdRef.current += 1;
      }
    };
  }, [customers.map(c => c ? `${c.id}:${c.lat}:${c.lng}:${c.address}:${c.city}` : '').join(','), isGoogleLoaded]);

  return coordsMap;
}

function buildAddressKey(customer: Customer): string {
  return `${customer.address || ''}|${customer.city || ''}`.trim();
}

function hasExactCoords(customer: Customer): customer is Customer & { lat: number; lng: number } {
  return typeof customer.lat === 'number' && typeof customer.lng === 'number';
}
