import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMapsConfig';

interface AddressAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onPlaceSelect: (place: { address: string; city: string; lat: number; lng: number; placeId: string }) => void;
  placeholder?: string;
  className?: string;
}

export function AddressAutocomplete({ value, onChange, onPlaceSelect, placeholder, className }: AddressAutocompleteProps) {
  const { apiKey, fetchKey } = useGoogleMapsKey();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { fetchKey(); }, [fetchKey]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'il' },
      fields: ['place_id', 'geometry', 'formatted_address', 'address_components'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location || !place.place_id) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const address = place.formatted_address || '';

      // Extract city from address_components
      let city = '';
      for (const comp of place.address_components || []) {
        if (comp.types.includes('locality')) {
          city = comp.long_name;
          break;
        }
      }

      onChange(address);
      onPlaceSelect({ address, city, lat, lng, placeId: place.place_id });
    });

    autocompleteRef.current = autocomplete;
    setReady(true);
  }, [isLoaded, onChange, onPlaceSelect]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || 'הקלד כתובת...'}
      className={className}
      disabled={!apiKey}
    />
  );
}
