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
  const processingRef = useRef(false);

  useEffect(() => {
    if (!isGoogleLoaded || processingRef.current) return;

    const validCustomers = customers.filter(Boolean) as Customer[];
    if (validCustomers.length === 0) return;

    // Check if all customers already have coords (from cache or lat/lng fields)
    const needsGeocoding = validCustomers.filter(c => {
      if (c.lat && c.lng) return false;
      const key = buildAddressKey(c);
      return !geocodeCache.has(key);
    });

    // Build initial map from cache + existing coords
    const initialMap = new Map<string, { lat: number; lng: number }>();
    validCustomers.forEach(c => {
      if (c.lat && c.lng) {
        initialMap.set(c.id, { lat: c.lat, lng: c.lng });
      } else {
        const key = buildAddressKey(c);
        const cached = geocodeCache.get(key);
        if (cached) {
          initialMap.set(c.id, cached);
        }
      }
    });

    setCoordsMap(new Map(initialMap));

    if (needsGeocoding.length === 0) return;

    processingRef.current = true;

    if (!geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }

    const geocoder = geocoderRef.current;

    // Geocode in batches to avoid rate limiting
    let idx = 0;
    const batchSize = 5;
    const delay = 300; // ms between batches

    function processBatch() {
      const batch = needsGeocoding.slice(idx, idx + batchSize);
      if (batch.length === 0) {
        processingRef.current = false;
        return;
      }

      const promises = batch.map(customer => {
        const fullAddress = [customer.address, customer.city].filter(Boolean).join(', ') + ', ישראל';
        return geocoder.geocode({ address: fullAddress }).then(result => {
          if (result.results?.[0]?.geometry?.location) {
            const loc = result.results[0].geometry.location;
            const coords = { lat: loc.lat(), lng: loc.lng() };
            const key = buildAddressKey(customer);
            geocodeCache.set(key, coords);
            return { id: customer.id, coords };
          }
          return null;
        }).catch(() => null);
      });

      Promise.all(promises).then(results => {
        setCoordsMap(prev => {
          const next = new Map(prev);
          results.forEach(r => {
            if (r) next.set(r.id, r.coords);
          });
          return next;
        });

        idx += batchSize;
        if (idx < needsGeocoding.length) {
          setTimeout(processBatch, delay);
        } else {
          processingRef.current = false;
        }
      });
    }

    processBatch();
  }, [customers.map(c => c?.id).join(','), isGoogleLoaded]);

  return coordsMap;
}

function buildAddressKey(c: Customer): string {
  return `${c.address || ''}|${c.city || ''}`.trim();
}
