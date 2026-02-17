import { Customer } from '@/types';

// Approximate coordinates for each region (center points)
const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  'דרום רחוק': { lat: 31.25, lng: 34.79 },
  'דרום קרוב': { lat: 31.80, lng: 34.65 },
  'דרום ת״א והסביבה': { lat: 32.05, lng: 34.77 },
  'דרום תל אביב והסביבה': { lat: 32.05, lng: 34.77 },
  'ירושלים והסביבה': { lat: 31.77, lng: 35.21 },
  'מרכז - פתח תקווה': { lat: 32.09, lng: 34.88 },
  'מרכז פתח תקווה': { lat: 32.09, lng: 34.88 },
  'הרצליה, רעננה והסביבה': { lat: 32.17, lng: 34.80 },
  'הרצליה ורעננה': { lat: 32.17, lng: 34.80 },
  'שומרון': { lat: 32.30, lng: 35.08 },
  'נתניה, עמק חפר': { lat: 32.33, lng: 34.86 },
  'נתניה ועמק חפר': { lat: 32.33, lng: 34.86 },
  'צפון קרוב': { lat: 32.80, lng: 35.00 },
  'צפון רחוק': { lat: 32.96, lng: 35.50 },
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
