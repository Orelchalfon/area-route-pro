import { useMemo } from 'react';
import { Job, JOB_TYPE_CONFIG, Customer } from '@/types';
import { customers as allCustomersData } from '@/data/mockData';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';

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

function createNumberedIcon(num: number, color: string = '#3b82f6'): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      color: white;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useMemo(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
}

const typeColorMap: Record<string, string> = {
  filter_replacement: '#3b82f6',
  malfunction: '#ef4444',
  installation: '#a855f7',
};

interface DayRouteMapProps {
  jobs: Job[];
  height?: string;
}

export function DayRouteMap({ jobs, height = '350px' }: DayRouteMapProps) {
  const jobsWithCoords = useMemo(() =>
    jobs.map(job => {
      const customer = allCustomersData.find(c => c.id === job.customerId);
      const coords = customer ? getCustomerCoords(customer) : { lat: 32.07, lng: 34.77 };
      return { job, customer, coords };
    }),
    [jobs]
  );

  const positions: [number, number][] = useMemo(() =>
    jobsWithCoords.map(jc => [jc.coords.lat, jc.coords.lng]),
    [jobsWithCoords]
  );

  if (jobs.length === 0) return null;

  return (
    <div className="rounded-lg overflow-hidden border border-border" style={{ height }}>
      <MapContainer
        center={[positions[0]?.[0] || 32.07, positions[0]?.[1] || 34.77]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={positions} />

        {positions.length > 1 && (
          <Polyline
            positions={positions}
            pathOptions={{ color: 'hsl(221, 83%, 53%)', weight: 3, opacity: 0.7, dashArray: '8, 8' }}
          />
        )}

        {jobsWithCoords.map((jc, idx) => {
          const color = typeColorMap[jc.job.type] || '#3b82f6';
          return (
            <Marker
              key={jc.job.id}
              position={[jc.coords.lat, jc.coords.lng]}
              icon={createNumberedIcon(idx + 1, color)}
            >
              <Popup>
                <div dir="rtl" className="min-w-[180px] text-sm">
                  <p className="font-bold mb-1">{jc.customer?.name}</p>
                  <p className="text-xs text-gray-500 mb-1">{JOB_TYPE_CONFIG[jc.job.type].label}</p>
                  <p className="text-xs text-gray-600 mb-2">{jc.customer?.address}</p>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((jc.customer?.address || '') + ', ' + (jc.customer?.city || ''))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
                  >
                    🧭 נווט
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
