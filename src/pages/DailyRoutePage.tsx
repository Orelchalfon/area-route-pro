import { useMemo, useState } from 'react';
import { useJobsContext } from '@/contexts/JobsContext';
import { customers as allCustomersData, technicians } from '@/data/mockData';
import { Job, JOB_TYPE_CONFIG, Customer } from '@/types';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Navigation, Clock, MapPin, Filter, AlertTriangle, Wrench, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

// Approximate coordinates for each region (center points)
const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  'דרום רחוק': { lat: 31.25, lng: 34.79 },
  'דרום קרוב': { lat: 31.80, lng: 34.65 },
  'דרום ת״א והסביבה': { lat: 32.05, lng: 34.77 },
  'ירושלים והסביבה': { lat: 31.77, lng: 35.21 },
  'מרכז - פתח תקווה': { lat: 32.09, lng: 34.88 },
  'הרצליה, רעננה והסביבה': { lat: 32.17, lng: 34.80 },
  'שומרון': { lat: 32.30, lng: 35.08 },
  'נתניה, עמק חפר': { lat: 32.33, lng: 34.86 },
  'צפון קרוב': { lat: 32.80, lng: 35.00 },
  'צפון רחוק': { lat: 32.96, lng: 35.50 },
};

// Generate pseudo-random but deterministic coords for a customer based on their region
function getCustomerCoords(customer: Customer): { lat: number; lng: number } {
  if (customer.lat && customer.lng) return { lat: customer.lat, lng: customer.lng };
  const base = REGION_COORDS[customer.city];
  if (!base) return { lat: 32.07, lng: 34.77 }; // Tel Aviv fallback
  // Use customer ID to create a deterministic offset
  const idNum = parseInt(customer.id.replace('c', '')) || 0;
  const latOffset = ((idNum * 137) % 100 - 50) * 0.002;
  const lngOffset = ((idNum * 251) % 100 - 50) * 0.002;
  return { lat: base.lat + latOffset, lng: base.lng + lngOffset };
}

// Create numbered marker icon
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

// Grey icon for nearby opportunities
function createOpportunityIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: rgba(156,163,175,0.6);
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      border: 2px solid rgba(255,255,255,0.6);
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    ">✦</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

// Auto-fit map to markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useMemo(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
}

// Haversine distance in km
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const typeIcons: Record<string, React.ReactNode> = {
  filter_replacement: <Filter className="w-3.5 h-3.5" />,
  malfunction: <AlertTriangle className="w-3.5 h-3.5" />,
  installation: <Wrench className="w-3.5 h-3.5" />,
};

export default function DailyRoutePage() {
  const { jobs, customersList } = useJobsContext();
  const [selectedTechId, setSelectedTechId] = useState(technicians[0].id);
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Today's scheduled jobs for selected tech
  const todayJobs = useMemo(() =>
    jobs.filter(j =>
      j.scheduledDate === todayStr &&
      j.technicianId === selectedTechId &&
      (j.status === 'confirmed' || j.status === 'completed' || j.status === 'in_progress')
    ).sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || '')),
    [jobs, todayStr, selectedTechId]
  );

  // Resolve customer for each job
  const jobsWithCustomers = useMemo(() =>
    todayJobs.map(job => {
      const customer = customersList.find(c => c.id === job.customerId) || allCustomersData.find(c => c.id === job.customerId);
      const coords = customer ? getCustomerCoords(customer) : { lat: 32.07, lng: 34.77 };
      return { job, customer, coords };
    }),
    [todayJobs, customersList]
  );

  // Route polyline positions
  const routePositions: [number, number][] = useMemo(() =>
    jobsWithCustomers.map(jc => [jc.coords.lat, jc.coords.lng]),
    [jobsWithCustomers]
  );

  // Nearby opportunities: future filter_replacement jobs within 5km of any today's stop
  const nearbyOpportunities = useMemo(() => {
    if (jobsWithCustomers.length === 0) return [];
    const todayCustomerIds = new Set(todayJobs.map(j => j.customerId));
    const futureFilterJobs = jobs.filter(j =>
      j.type === 'filter_replacement' &&
      j.status === 'draft' &&
      !j.technicianId &&
      j.createdAt > todayStr &&
      !todayCustomerIds.has(j.customerId)
    );

    const results: { job: Job; customer: Customer | undefined; coords: { lat: number; lng: number }; distance: number }[] = [];
    const seen = new Set<string>();

    for (const fJob of futureFilterJobs) {
      if (seen.has(fJob.customerId)) continue;
      const customer = customersList.find(c => c.id === fJob.customerId) || allCustomersData.find(c => c.id === fJob.customerId);
      if (!customer) continue;
      const coords = getCustomerCoords(customer);

      let minDist = Infinity;
      for (const jc of jobsWithCustomers) {
        const d = distanceKm(coords.lat, coords.lng, jc.coords.lat, jc.coords.lng);
        if (d < minDist) minDist = d;
      }

      if (minDist <= 5) {
        seen.add(fJob.customerId);
        results.push({ job: fJob, customer, coords, distance: minDist });
      }
    }

    return results.sort((a, b) => a.distance - b.distance).slice(0, 10);
  }, [jobs, jobsWithCustomers, todayJobs, customersList, todayStr]);

  const completedCount = todayJobs.filter(j => j.completionStatus === 'done').length;

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">מפת מסלול יומי</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, d בMMMM yyyy', { locale: he })} · {todayJobs.length} עצירות · {completedCount} הושלמו
          </p>
        </div>
        <Select value={selectedTechId} onValueChange={setSelectedTechId}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {technicians.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {todayJobs.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-lg font-medium text-muted-foreground">אין משימות משובצות להיום</p>
          <p className="text-sm text-muted-foreground/60 mt-1">שבץ משימות בלוח הבקרה ואשר את היום כדי לראות מסלול</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map */}
          <div className="lg:col-span-2 rounded-xl overflow-hidden border border-border shadow-card" style={{ height: '600px' }}>
            <MapContainer
              center={[routePositions[0]?.[0] || 32.07, routePositions[0]?.[1] || 34.77]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitBounds positions={routePositions} />

              {/* Route polyline */}
              {routePositions.length > 1 && (
                <Polyline
                  positions={routePositions}
                  pathOptions={{ color: 'hsl(221, 83%, 53%)', weight: 3, opacity: 0.7, dashArray: '8, 8' }}
                />
              )}

              {/* Job markers */}
              {jobsWithCustomers.map((jc, idx) => {
                const isDone = jc.job.completionStatus === 'done';
                const markerColor = isDone ? '#22c55e' : jc.job.type === 'malfunction' ? '#ef4444' : jc.job.type === 'installation' ? '#a855f7' : '#3b82f6';
                return (
                  <Marker
                    key={jc.job.id}
                    position={[jc.coords.lat, jc.coords.lng]}
                    icon={createNumberedIcon(idx + 1, markerColor)}
                  >
                    <Popup>
                      <div dir="rtl" className="min-w-[200px] text-sm">
                        <p className="font-bold text-base mb-1">{jc.customer?.name}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          {typeIcons[jc.job.type]}
                          <span>{JOB_TYPE_CONFIG[jc.job.type].label}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{jc.customer?.address}</p>
                        {jc.job.scheduledTime && (
                          <p className="text-xs text-gray-500 mb-2">🕐 {jc.job.scheduledTime}</p>
                        )}
                        {isDone && (
                          <p className="text-xs text-green-600 font-medium mb-2">✓ הושלם</p>
                        )}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(jc.customer?.address + ', ' + jc.customer?.city)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
                        >
                          <span>🧭</span> התחל ניווט
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Nearby opportunities (grey markers) */}
              {nearbyOpportunities.map(opp => (
                <Marker
                  key={`opp-${opp.job.id}`}
                  position={[opp.coords.lat, opp.coords.lng]}
                  icon={createOpportunityIcon()}
                >
                  <Popup>
                    <div dir="rtl" className="min-w-[180px] text-sm">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs">✦</span>
                        <span className="font-semibold text-gray-700">הזדמנות קרובה</span>
                      </div>
                      <p className="font-medium">{opp.customer?.name}</p>
                      <p className="text-xs text-gray-500">{opp.customer?.address}</p>
                      <p className="text-xs text-gray-400 mb-2">{opp.distance.toFixed(1)} ק״מ מהמסלול</p>
                      <button
                        onClick={() => toast.info(`${opp.customer?.name} — פיצ'ר זה דורש אישור יום פתוח`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white rounded text-xs font-medium hover:bg-gray-600 transition-colors"
                      >
                        <span>📌</span> משוך להיום
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Sidebar - Stop list */}
          <div className="space-y-3">
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                רשימת עצירות ({todayJobs.length})
              </h3>
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {jobsWithCustomers.map((jc, idx) => {
                  const isDone = jc.job.completionStatus === 'done';
                  return (
                    <div
                      key={jc.job.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        isDone ? 'bg-success/5 border-success/30' : 'bg-card border-border hover:bg-muted/30'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                          isDone ? 'bg-success' : 'bg-primary'
                        }`}
                      >
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {jc.customer?.name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          {typeIcons[jc.job.type]}
                          <span>{JOB_TYPE_CONFIG[jc.job.type].label}</span>
                          {jc.job.scheduledTime && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <Clock className="w-3 h-3" />
                              <span>{jc.job.scheduledTime}</span>
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{jc.customer?.address}</p>
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(jc.customer?.address + ', ' + jc.customer?.city)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors shrink-0"
                        title="נווט"
                      >
                        <Navigation className="w-4 h-4 text-primary" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nearby Opportunities */}
            {nearbyOpportunities.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-warning" />
                  הזדמנויות קרובות ({nearbyOpportunities.length})
                </h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {nearbyOpportunities.map(opp => (
                    <div key={opp.job.id} className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{opp.customer?.name}</p>
                        <p className="text-[10px] text-muted-foreground">{opp.distance.toFixed(1)} ק״מ · {JOB_TYPE_CONFIG[opp.job.type].label}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 border-warning/30 text-warning">
                        {opp.distance.toFixed(1)} ק״מ
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
