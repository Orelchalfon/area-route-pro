import { useMemo, useState, useCallback } from 'react';
import { useJobsContext } from '@/contexts/JobsContext';
import { technicians } from '@/data/mockData';
import { Job, JOB_TYPE_CONFIG, Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Navigation, Clock, MapPin, Filter, AlertTriangle, Wrench, Sparkles, Map as MapIcon, Save, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { EditableRouteStop } from '@/components/EditableRouteStop';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GoogleMapsPlanner } from '@/components/GoogleMapsPlanner';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { getCustomerCoords } from '@/lib/customerCoords';

const typeIcons: Record<string, React.ReactNode> = {
  filter_replacement: <Filter className="w-3.5 h-3.5" />,
  malfunction: <AlertTriangle className="w-3.5 h-3.5" />,
  installation: <Wrench className="w-3.5 h-3.5" />,
};

interface JobWithCustomer {
  job: Job;
  customer: Customer | undefined;
  coords: { lat: number; lng: number };
}

export default function DailyRoutePage() {
  const { jobs, customersList, approveDaySchedule } = useJobsContext();
  const [selectedTechId, setSelectedTechId] = useState(technicians[0].id);
  const [plannerMode, setPlannerMode] = useState(false);
  const [orderedJobIds, setOrderedJobIds] = useState<string[] | null>(null);
  const [routeSaved, setRouteSaved] = useState(false);
  const { apiKey, loading: keyLoading, error: keyError, fetchKey } = useGoogleMapsKey();
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
  const jobsWithCustomers: JobWithCustomer[] = useMemo(() =>
    todayJobs.map(job => {
      const customer = customersList.find(c => c.id === job.customerId);
      const coords = customer ? getCustomerCoords(customer) : { lat: 32.07, lng: 34.77 };
      return { job, customer, coords };
    }),
    [todayJobs, customersList]
  );

  // Apply custom order if set
  const orderedJobs: JobWithCustomer[] = useMemo(() => {
    if (!orderedJobIds) return jobsWithCustomers;
    const map = new Map(jobsWithCustomers.map(jc => [jc.job.id, jc]));
    return orderedJobIds.map(id => map.get(id)).filter(Boolean) as JobWithCustomer[];
  }, [orderedJobIds, jobsWithCustomers]);

  // Initialize order when entering planner mode
  const handleEnterPlanner = useCallback(() => {
    fetchKey();
    setOrderedJobIds(jobsWithCustomers.map(jc => jc.job.id));
    setPlannerMode(true);
    setRouteSaved(false);
  }, [fetchKey, jobsWithCustomers]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || !orderedJobIds) return;
    const newOrder = [...orderedJobIds];
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setOrderedJobIds(newOrder);
    setRouteSaved(false);
  }, [orderedJobIds]);

  const handleSaveRoute = useCallback(() => {
    if (!orderedJobIds) return;
    const startHour = 10;
    const assignments = orderedJobs.map((jc, idx) => {
      let totalMinutes = 0;
      for (let i = 0; i < idx; i++) {
        totalMinutes += orderedJobs[i].job.estimatedDuration;
      }
      const hour = startHour + Math.floor(totalMinutes / 60);
      const min = totalMinutes % 60;
      const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      return {
        jobId: jc.job.id,
        technicianId: selectedTechId,
        scheduledDate: todayStr,
        scheduledTime: time,
      };
    });
    approveDaySchedule(assignments);
    setRouteSaved(true);
    toast.success(`מסלול נשמר! ${assignments.length} עצירות סודרו מחדש`);
  }, [orderedJobIds, orderedJobs, selectedTechId, todayStr, approveDaySchedule]);

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
        <div className="flex items-center gap-2">
          {todayJobs.length > 0 && !plannerMode && (
            <Button onClick={handleEnterPlanner} variant="outline" className="gap-2">
              <MapIcon className="w-4 h-4" />
              מצב תכנון
            </Button>
          )}
          {plannerMode && (
            <Button onClick={() => setPlannerMode(false)} variant="ghost" size="sm">
              סגור תכנון
            </Button>
          )}
          <Select value={selectedTechId} onValueChange={(v) => { setSelectedTechId(v); setOrderedJobIds(null); setPlannerMode(false); }}>
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
      </div>

      {todayJobs.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-lg font-medium text-muted-foreground">אין משימות משובצות להיום</p>
          <p className="text-sm text-muted-foreground/60 mt-1">שבץ משימות בלוח הבקרה ואשר את היום כדי לראות מסלול</p>
        </div>
      ) : plannerMode ? (
        /* ============ PLANNER MODE ============ */
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4" style={{ direction: 'ltr' }}>
          {/* Sidebar - RIGHT side */}
          <div className="space-y-3 order-last" dir="rtl">
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  סדר עצירות ({orderedJobs.length})
                </h3>
                <Button
                  size="sm"
                  onClick={handleSaveRoute}
                  disabled={routeSaved}
                  className="gap-1.5"
                >
                  {routeSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {routeSaved ? 'נשמר!' : 'שמור מסלול'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">גרור כדי לשנות את סדר ההגעה</p>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="route-stops">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 max-h-[460px] overflow-y-auto"
                    >
                      {orderedJobs.map((jc, idx) => {
                        const isDone = jc.job.completionStatus === 'done';
                        return (
                          <Draggable key={jc.job.id} draggableId={jc.job.id} index={idx}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-start gap-2 p-3 rounded-lg border transition-colors ${
                                  snapshot.isDragging
                                    ? 'bg-primary/5 border-primary/40 shadow-lg'
                                    : isDone
                                    ? 'bg-success/5 border-success/30'
                                    : 'bg-card border-border hover:bg-muted/30'
                                }`}
                              >
                                <div {...provided.dragHandleProps} className="pt-1 cursor-grab active:cursor-grabbing">
                                  <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                                </div>
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
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>

          {/* Map - LEFT side */}
          <div className="rounded-xl overflow-hidden border border-border shadow-card order-first" style={{ height: '80vh' }}>
            {keyLoading ? (
              <div className="flex items-center justify-center h-full bg-muted/30">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">טוען מפה...</p>
                </div>
              </div>
            ) : keyError ? (
              <div className="flex items-center justify-center h-full bg-muted/30">
                <div className="text-center">
                  <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-destructive">שגיאה בטעינת המפה</p>
                  <p className="text-xs text-muted-foreground mt-1">{keyError}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={fetchKey}>נסה שוב</Button>
                </div>
              </div>
            ) : apiKey ? (
              <GoogleMapsPlanner
                apiKey={apiKey}
                stops={orderedJobs.map((jc, idx) => ({
                  id: jc.job.id,
                  position: { lat: jc.coords.lat, lng: jc.coords.lng },
                  label: String(idx + 1),
                  title: jc.customer?.name || '',
                  type: jc.job.type,
                  isDone: jc.job.completionStatus === 'done',
                  customer: jc.customer,
                  fullAddress: [jc.customer?.address, jc.customer?.city].filter(Boolean).join(', '),
                }))}
              />
            ) : null}
          </div>

        </div>
      ) : (
        /* ============ NORMAL VIEW (no map loaded) ============ */
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            רשימת עצירות ({todayJobs.length})
          </h3>
          <div className="space-y-2">
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
          <div className="pt-2">
            <Button onClick={handleEnterPlanner} className="w-full gap-2">
              <MapIcon className="w-4 h-4" />
              פתח מצב תכנון מסלול
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
