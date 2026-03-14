import { Customer } from '@/types';

// Approximate coordinates for each region (center points)
const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  'דרום רחוק': { lat: 31.25, lng: 34.79 },
  'מרכז דרום': { lat: 31.95, lng: 34.77 },
  'תל אביב': { lat: 32.07, lng: 34.78 },
  'ירושלים': { lat: 31.77, lng: 35.21 },
  'גוש דן': { lat: 32.08, lng: 34.87 },
  'השרון': { lat: 32.16, lng: 34.84 },
  'נתניה': { lat: 32.33, lng: 34.86 },
  'צפון קרוב': { lat: 32.47, lng: 34.96 },
  'צפון רחוק': { lat: 32.82, lng: 35.10 },
};

export function getCustomerCoords(customer: Customer): { lat: number; lng: number } {
  if (customer.lat && customer.lng) return { lat: customer.lat, lng: customer.lng };
  const base = REGION_COORDS[customer.city];
  if (!base) return { lat: 32.07, lng: 34.77 };
  const idNum = parseInt(customer.id.replace('c', '')) || 0;
  const latOffset = ((idNum * 137) % 100 - 50) * 0.002;
  const lngOffset = ((idNum * 251) % 100 - 50) * 0.002;
  return { lat: base.lat + latOffset, lng: base.lng + lngOffset };
}
