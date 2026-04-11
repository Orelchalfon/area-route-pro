import { useEffect, useRef, useCallback } from 'react';
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

  useEffect(() => {
    void fetchKey();
  }, [fetchKey]);

  if (!apiKey) {
    return (
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'הקלד כתובת...'}
        className={className}
        disabled
      />
    );
  }

  return (
    <AddressAutocompleteLoaded
      apiKey={apiKey}
      value={value}
      onChange={onChange}
      onPlaceSelect={onPlaceSelect}
      placeholder={placeholder}
      className={className}
    />
  );
}

function AddressAutocompleteLoaded({
  apiKey,
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  className,
}: AddressAutocompleteProps & { apiKey: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);

  // Keep refs up to date without re-triggering the effect
  onChangeRef.current = onChange;
  onPlaceSelectRef.current = onPlaceSelect;

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
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

      onChangeRef.current(address);
      onPlaceSelectRef.current({ address, city, lat, lng, placeId: place.place_id });
    });

    autocompleteRef.current = autocomplete;
  }, [isLoaded]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => onChangeRef.current(e.target.value)}
      placeholder={placeholder || 'הקלד כתובת...'}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      disabled={!isLoaded}
    />
  );
}
