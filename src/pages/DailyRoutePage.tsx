import { useMemo, useState, useCallback } from 'react';
import { useJobsContext } from '@/contexts/JobsContext';
import { useAuth } from '@/contexts/AuthContext';
import { approvedDayKey } from '@/hooks/useApprovedDays';
import { technicians } from '@/data/mockData';
import { Job, Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Map as MapIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { EditableRouteStop } from '@/components/EditableRouteStop';
import { format, addDays, subDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { DropResult } from '@hello-pangea/dnd';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { getCustomerCoords } from '@/lib/customerCoords';
import { RoutePlannerView } from './daily-route/RoutePlannerView';
import { JobWithCustomer } from './daily-route/types';

export default function DailyRoutePage() {
  const { jobs, customersList, approvedDayKeys, approveDaySchedule, updateJob, updateCustomer } = useJobsContext();
  const { isAdmin, technicianId } = useAuth();
  const [selectedTechId, setSelectedTechId] = useState(technicians[0].id);
  // Admins may browse any technician; employees are locked to their own route.
  const activeTechId = isAdmin ? selectedTechId : (technicianId ?? '');
  const [plannerMode, setPlannerMode] = useState(false);
  const [orderedJobIds, setOrderedJobIds] = useState<string[] | null>(null);
  const [routeSaved, setRouteSaved] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const { apiKey, loading: keyLoading, error: keyError, fetchKey } = useGoogleMapsKey();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const todayStr = format(selectedDate, 'yyyy-MM-dd');

  // Today's scheduled jobs for selected tech. Employees only see a day once the
  // manager approves it (realtime); admins keep the full view for planning.
  const todayJobs = useMemo(() =>
    jobs.filter(j =>
      j.scheduledDate === todayStr &&
      j.technicianId === activeTechId &&
      (j.status === 'confirmed' || j.status === 'completed' || j.status === 'in_progress') &&
      (isAdmin || approvedDayKeys.has(approvedDayKey(activeTechId, todayStr)))
    ).sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || '')),
    [jobs, todayStr, activeTechId, isAdmin, approvedDayKeys]
  );

  // Resolve route-specific customer/location for each job
  const jobsWithCustomers: JobWithCustomer[] = useMemo(() =>
    todayJobs.map(job => {
      const baseCustomer = customersList.find(c => c.id === job.customerId);
      const hasJobLocationOverride = !!baseCustomer && (
        (job.location || '') !== (baseCustomer.address || '') ||
        (job.city || '') !== (baseCustomer.city || '')
      );

      const customer = baseCustomer
        ? {
            ...baseCustomer,
            address: job.location || baseCustomer.address || '',
            city: job.city || baseCustomer.city || '',
            lat: hasJobLocationOverride ? undefined : baseCustomer.lat,
            lng: hasJobLocationOverride ? undefined : baseCustomer.lng,
            placeId: hasJobLocationOverride ? undefined : baseCustomer.placeId,
          }
        : undefined;

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

  // Touch-friendly reordering alternative to drag (gesture-alternative on mobile).
  const handleMove = useCallback((index: number, direction: -1 | 1) => {
    const target = index + direction;
    setOrderedJobIds(prev => {
      const base = prev ?? orderedJobs.map(jc => jc.job.id);
      if (target < 0 || target >= base.length) return base;
      const newOrder = [...base];
      [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
      return newOrder;
    });
    setRouteSaved(false);
  }, [orderedJobs]);

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
        technicianId: activeTechId,
        scheduledDate: todayStr,
        scheduledTime: time,
      };
    });
    approveDaySchedule(assignments);
    setRouteSaved(true);
    toast.success(`מסלול נשמר! ${assignments.length} עצירות סודרו מחדש`);
  }, [orderedJobIds, orderedJobs, activeTechId, todayStr, approveDaySchedule]);

  const handleSaveEdit = useCallback((
    jobId: string,
    customerId: string,
    jobData: Partial<Pick<Job, 'location' | 'city' | 'notes' | 'estimatedDuration'>>,
    customerData: Partial<Customer>
  ) => {
    updateJob(jobId, jobData);
    updateCustomer(customerId, customerData);
    setEditingJobId(null);
    toast.success('המשימה עודכנה בהצלחה');
  }, [updateJob, updateCustomer]);

  const completedCount = todayJobs.filter(j => j.completionStatus === 'done').length;

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">מפת מסלול יומי</h2>
          <div className="flex items-center gap-2 mt-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="היום הקודם" onClick={() => setSelectedDate(d => subDays(d, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, 'EEEE, d בMMMM yyyy', { locale: he })} · {todayJobs.length} עצירות · {completedCount} הושלמו
            </p>
            <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="היום הבא" onClick={() => setSelectedDate(d => addDays(d, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedDate(new Date())}>
              היום
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {todayJobs.length > 0 && !plannerMode && (
            <Button onClick={handleEnterPlanner} variant="outline" className="gap-2">
              <MapIcon className="w-4 h-4" />
              מצב תכנון
            </Button>
          )}
          {plannerMode && (
            <Button onClick={() => { setPlannerMode(false); setEditingJobId(null); }} variant="ghost" size="sm">
              סגור תכנון
            </Button>
          )}
          {isAdmin && (
            <Select value={selectedTechId} onValueChange={(v) => { setSelectedTechId(v); setOrderedJobIds(null); setPlannerMode(false); setEditingJobId(null); }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {technicians.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
        <RoutePlannerView
          orderedJobs={orderedJobs}
          isAdmin={isAdmin}
          routeSaved={routeSaved}
          editingJobId={editingJobId}
          keyLoading={keyLoading}
          keyError={keyError}
          apiKey={apiKey}
          onSaveRoute={handleSaveRoute}
          onDragEnd={handleDragEnd}
          onMove={handleMove}
          onStartEdit={setEditingJobId}
          onCancelEdit={() => setEditingJobId(null)}
          onSaveEdit={handleSaveEdit}
          onRetryKey={fetchKey}
        />
      ) : (
        /* ============ NORMAL VIEW (no map loaded) ============ */
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            רשימת עצירות ({todayJobs.length})
          </h3>
          <div className="space-y-2">
            {jobsWithCustomers.map((jc, idx) => (
              <EditableRouteStop
                key={jc.job.id}
                job={jc.job}
                customer={jc.customer}
                index={idx}
                isEditing={editingJobId === jc.job.id}
                onStartEdit={() => setEditingJobId(jc.job.id)}
                onCancelEdit={() => setEditingJobId(null)}
                onSave={handleSaveEdit}
                showTime
                readOnly={!isAdmin}
              />
            ))}
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
