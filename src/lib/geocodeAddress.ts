export interface GeocodeAddressResult {
  lat: number;
  lng: number;
  placeId?: string;
}

interface GeocodeApiResponse {
  status: string;
  results?: Array<{
    place_id?: string;
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
  }>;
}

export async function geocodeAddress(query: string, apiKey?: string | null): Promise<GeocodeAddressResult | null> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return null;
  }

  const browserResult = await geocodeWithBrowserApi(normalizedQuery);
  if (browserResult) {
    return browserResult;
  }

  if (!apiKey) {
    return null;
  }

  return geocodeWithHttpApi(normalizedQuery, apiKey);
}

async function geocodeWithBrowserApi(query: string): Promise<GeocodeAddressResult | null> {
  if (typeof google === 'undefined' || !google.maps?.Geocoder) {
    return null;
  }

  return new Promise(resolve => {
    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address: buildGeocodeQuery(query) }, (results, status) => {
      if (status !== 'OK' || !results?.[0]?.geometry?.location) {
        resolve(null);
        return;
      }

      const location = results[0].geometry.location;
      resolve({
        lat: location.lat(),
        lng: location.lng(),
        placeId: results[0].place_id,
      });
    });
  });
}

async function geocodeWithHttpApi(query: string, apiKey: string): Promise<GeocodeAddressResult | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(buildGeocodeQuery(query))}&key=${encodeURIComponent(apiKey)}&language=he&region=IL`
    );

    if (!response.ok) {
      return null;
    }

    const data: GeocodeApiResponse = await response.json();
    const location = data.results?.[0]?.geometry?.location;

    if (data.status !== 'OK' || !location) {
      return null;
    }

    return {
      lat: location.lat,
      lng: location.lng,
      placeId: data.results?.[0]?.place_id,
    };
  } catch {
    return null;
  }
}

function buildGeocodeQuery(query: string) {
  return query.includes('ישראל') ? query : `${query}, ישראל`;
}