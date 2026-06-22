import { useMemo, useState } from 'react';
import { useJobsContext } from '@/contexts/JobsContext';
import { technicians } from '@/data/mockData';
import { JOB_TYPE_CONFIG } from '@/types';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, CalendarDays, MapPin, Clock, User, Phone, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AddTaskToScheduleDialog } from './work-schedule/AddTaskToScheduleDialog';
import { DAY_NAMES, getRegion } from './work-schedule/regions';

export default function WorkSchedulePage() {
  const { jobs, customersList, addJob } = useJobsContext();
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [addTaskState, setAddTaskState] = useState<{ techId: string; dateStr: string } | null>(null);

  const today = new Date();
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 });

  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));
  }, [weekStart.toISOString()]);

  const approvedJobs = useMemo(() => {
    return jobs.filter(j =>
      j.technicianId &&
      j.scheduledDate &&
      ['confirmed', 'in_progress', 'completed'].includes(j.status)
    );
  }, [jobs]);

  const getJobsForDayAndTech = (dateStr: string, techId: string) => {
    return approvedJobs.filter(j => j.scheduledDate === dateStr && j.technicianId === techId);
  };

  const getCustomerName = (customerId: string) => {
    const c = customersList.find(c => c.id === customerId);
    return c?.name || customerId;
  };

  const getCustomerPhone = (customerId: string) => {
    const c = customersList.find(c => c.id === customerId);
    return c?.phone || '';
  };

  const getCompletionColor = (job: typeof approvedJobs[0]) => {
    if (job.completionStatus === 'done') return 'bg-green-100 border-green-300 text-green-800';
    if (job.completionStatus === 'not_done') return 'bg-red-100 border-red-300 text-red-800';
    if (job.completionStatus === 'need_return') return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    return '';
  };

  const getAreasForJobs = (dayJobs: typeof approvedJobs) => {
    const areas = new Set<string>();
    dayJobs.forEach(j => {
      const region = getRegion(j.city || j.location);
      if (region) areas.add(region);
    });
    return Array.from(areas);
  };

  const toggleCard = (key: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">לוז עבודה</h2>
          <p className="text-sm text-muted-foreground mt-1">
            תצוגת שבועיים קדימה — לחץ על יום כדי לראות את המשימות
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
            היום
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground mr-2">
            {format(days[0], 'd/M', { locale: he })} — {format(days[13], 'd/M', { locale: he })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {technicians.map(tech => (
          <div key={tech.id} className="space-y-2">
            <div className="flex items-center gap-2 sticky top-14 bg-background z-10 py-2">
              <User className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">{tech.name}</h3>
              <Badge variant="outline" className="text-xs">{tech.region}</Badge>
            </div>

            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayJobs = getJobsForDayAndTech(dateStr, tech.id);
              const isToday = isSameDay(day, today);
              const dayOfWeek = day.getDay();
              const isFriSat = dayOfWeek === 5 || dayOfWeek === 6;
              const cardKey = `${tech.id}-${dateStr}`;
              const isExpanded = expandedCards.has(cardKey);
              const areas = getAreasForJobs(dayJobs);

              if (isFriSat && dayJobs.length === 0) return null;

              return (
                <Card
                  key={dateStr}
                  className={`${isToday ? 'border-primary/50 bg-primary/5' : ''} ${isFriSat ? 'opacity-60' : ''} transition-all`}
                >
                  {/* Collapsed header - always visible */}
                  <CardHeader
                    className="py-2 px-4 cursor-pointer select-none hover:bg-muted/30 transition-colors"
                    onClick={() => dayJobs.length > 0 && toggleCard(cardKey)}
                  >
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" />
                        <span>יום {DAY_NAMES[dayOfWeek]}</span>
                        <span className="text-muted-foreground">{format(day, 'd/M')}</span>
                        {isToday && <Badge className="text-[10px] px-1.5 py-0">היום</Badge>}
                      </span>
                      <span className="flex items-center gap-2">
                        {areas.length > 0 && (
                          <span className="flex items-center gap-1 flex-wrap justify-end">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            {areas.map(a => (
                              <Badge key={a} variant="secondary" className="text-[10px] px-1.5">
                                {a}
                              </Badge>
                            ))}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {dayJobs.length} משימות
                        </Badge>
                        {dayJobs.length > 0 && (
                          isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </span>
                    </CardTitle>
                  </CardHeader>

                  {/* Expanded tasks list */}
                  {isExpanded && dayJobs.length > 0 && (
                    <CardContent className="px-4 pb-3 pt-0 space-y-2">
                      {dayJobs.map((job, idx) => {
                        const typeConf = JOB_TYPE_CONFIG[job.type];
                        const completionClass = getCompletionColor(job);

                        return (
                          <div key={job.id}>
                            <div
                              className={`rounded-lg border p-2.5 text-sm space-y-1 ${completionClass || 'bg-card'}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{getCustomerName(job.customerId)}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {typeConf?.label || job.type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {job.city || job.location}
                                </span>
                                {job.scheduledTime && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {job.scheduledTime}
                                  </span>
                                )}
                                {getCustomerPhone(job.customerId) && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {getCustomerPhone(job.customerId)}
                                  </span>
                                )}
                              </div>
                              {job.completionStatus && (
                                <div className="text-xs font-medium">
                                  {job.completionStatus === 'done' && '✅ בוצע'}
                                  {job.completionStatus === 'not_done' && '❌ לא בוצע'}
                                  {job.completionStatus === 'need_return' && '🔄 צריך לחזור'}
                                  {job.completionNotes && ` — ${job.completionNotes}`}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Add task button inside expanded view */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                        onClick={() => setAddTaskState({ techId: tech.id, dateStr })}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        הוסף משימה ליום זה
                      </Button>
                    </CardContent>
                  )}

                  {dayJobs.length === 0 && (
                    <CardContent className="px-4 pb-3 pt-0 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">אין משימות מתוזמנות</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={() => setAddTaskState({ techId: tech.id, dateStr })}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        הוסף
                      </Button>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        ))}
      </div>

      {/* Add Task Dialog */}
      {addTaskState && (
        <AddTaskToScheduleDialog
          techId={addTaskState.techId}
          dateStr={addTaskState.dateStr}
          existingJobs={getJobsForDayAndTech(addTaskState.dateStr, addTaskState.techId)}
          customersList={customersList}
          onAdd={(customerId, type, afterJobId, notes) => {
            const customer = customersList.find(c => c.id === customerId);
            if (!customer) return;

            const existingJobs = getJobsForDayAndTech(addTaskState.dateStr, addTaskState.techId);
            let scheduledTime = '08:00';
            if (afterJobId && afterJobId !== '__start__') {
              const afterJob = existingJobs.find(j => j.id === afterJobId);
              if (afterJob?.scheduledTime) {
                const [h, m] = afterJob.scheduledTime.split(':').map(Number);
                const totalMin = h * 60 + m + (afterJob.estimatedDuration || 30);
                scheduledTime = `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
              }
            } else if (existingJobs.length > 0 && afterJobId !== '__start__') {
              const last = existingJobs[existingJobs.length - 1];
              if (last.scheduledTime) {
                const [h, m] = last.scheduledTime.split(':').map(Number);
                const totalMin = h * 60 + m + (last.estimatedDuration || 30);
                scheduledTime = `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
              }
            }

            const typeConfig = JOB_TYPE_CONFIG[type];
            const newJob = {
              id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type,
              status: 'confirmed' as const,
              priority: typeConfig.priority,
              customerId: customer.id,
              technicianId: addTaskState.techId,
              scheduledDate: addTaskState.dateStr,
              scheduledTime,
              estimatedDuration: typeConfig.duration,
              location: customer.address,
              city: customer.city,
              notes: notes || '',
              createdAt: new Date().toISOString().slice(0, 10),
            };
            addJob(newJob);
            toast.success(`${customer.name} שובץ ב-${addTaskState.dateStr}`);
            setAddTaskState(null);
          }}
          onClose={() => setAddTaskState(null)}
          getCustomerName={getCustomerName}
        />
      )}
    </div>
  );
}
