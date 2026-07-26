// Shared libraries array – must be a stable reference to avoid useJsApiLoader re-init
export const GOOGLE_MAPS_LIBRARIES: ('maps' | 'places')[] = ['maps', 'places'];

// Shared loader options for EVERY useJsApiLoader caller. The Maps JS API applies
// `language`/`region` once per page load, so all callers must pass identical options
// or @react-google-maps/api warns and ignores the mismatch. We load in Hebrew so
// address_components (the `locality` we store as a customer's city) come back in
// Hebrew — otherwise Google returns English names ("Modi'in Makabim-Re'ut") that no
// Hebrew-keyed area map recognises, dropping the customer into "לא משויך".
// Spread after `googleMapsApiKey` (which varies per caller):
//   useJsApiLoader({ googleMapsApiKey: apiKey, ...GOOGLE_MAPS_LOADER_OPTIONS })
export const GOOGLE_MAPS_LOADER_OPTIONS = {
  libraries: GOOGLE_MAPS_LIBRARIES,
  language: 'he',
  region: 'IL',
} as const;
