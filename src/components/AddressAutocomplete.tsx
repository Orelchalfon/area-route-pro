import { useEffect, useRef } from 'react';
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
  // The input text captured at the moment Enter is pressed — before the widget can
  // overwrite it with a street-level prediction that lacks the house number.
  const lastTypedRef = useRef('');

  // Keep refs up to date without re-triggering the effect
  onChangeRef.current = onChange;
  onPlaceSelectRef.current = onPlaceSelect;

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;
    const input = inputRef.current;

    const autocomplete = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: 'il' },
      fields: ['place_id', 'geometry', 'formatted_address', 'address_components'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location || !place.place_id) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const formatted = place.formatted_address || '';

      // Enter often selects a street-level prediction that drops the house number the
      // user typed. If so, keep the typed text (it has the number); otherwise use
      // Google's formatted address. City/coords always come from Google.
      const typed = lastTypedRef.current;
      const houseNum = typed.match(/\d+/)?.[0];
      const address = houseNum && !formatted.includes(houseNum) ? typed : formatted;
      lastTypedRef.current = '';

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

    // Enter: stash the current (pre-overwrite) input value so place_changed can keep the
    // house number, and stop the event bubbling to the surrounding Radix dialog (which
    // would otherwise treat Enter as a submit/close). Capture phase so we run first.
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        lastTypedRef.current = input.value;
        e.stopPropagation();
      }
    };
    input.addEventListener('keydown', handleEnter, true);

    // Clicking a suggestion in the portalled `.pac-container` (rendered on <body>) is
    // seen by Radix's bubble-phase document pointerdown listener as an "outside" click,
    // closing the dialog before the selection resolves. A capture-phase listener that
    // stops propagation for pac-container targets runs first and prevents the dismiss.
    const stopPacDismiss = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('.pac-container')) e.stopPropagation();
    };
    document.addEventListener('pointerdown', stopPacDismiss, true);

    return () => {
      input.removeEventListener('keydown', handleEnter, true);
      document.removeEventListener('pointerdown', stopPacDismiss, true);
    };
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
