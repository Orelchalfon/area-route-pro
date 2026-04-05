import { useMemo, useState } from 'react';
import { useJobsContext } from '@/contexts/JobsContext';
import { technicians } from '@/data/mockData';
import { JOB_TYPE_CONFIG, STATUS_CONFIG } from '@/types';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, CalendarDays, MapPin, Clock, User, Phone } from 'lucide-react';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function WorkSchedulePage() {
  const { jobs, customersList } = useJobsContext();
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 });

  // Build 14 days (2 weeks)
  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));
  }, [weekStart.toISOString()]);

  // Get approved/confirmed jobs (sent to technician)
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

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">לוז עבודה</h2>
          <p className="text-sm text-muted-foreground mt-1">
            תצוגת שבועיים קדימה — כל המשימות שאושרו והועברו לטכנאים
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

      {/* Two-column layout for both technicians */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {technicians.map(tech => (
          <div key={tech.id} className="space-y-3">
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

              if (isFriSat && dayJobs.length === 0) return null;

              return (
                <Card
                  key={dateStr}
                  className={`${isToday ? 'border-primary/50 bg-primary/5' : ''} ${isFriSat ? 'opacity-60' : ''}`}
                >
                  <CardHeader className="py-2 px-4">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" />
                        <span>יום {DAY_NAMES[dayOfWeek]}</span>
                        <span className="text-muted-foreground">{format(day, 'd/M')}</span>
                        {isToday && <Badge className="text-[10px] px-1.5 py-0">היום</Badge>}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {dayJobs.length} משימות
                      </Badge>
                    </CardTitle>
                  </CardHeader>

                  {dayJobs.length > 0 && (
                    <CardContent className="px-4 pb-3 pt-0 space-y-2">
                      {dayJobs.map(job => {
                        const typeConf = JOB_TYPE_CONFIG[job.type];
                        const completionClass = getCompletionColor(job);

                        return (
                          <div
                            key={job.id}
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
                        );
                      })}
                    </CardContent>
                  )}

                  {dayJobs.length === 0 && (
                    <CardContent className="px-4 pb-3 pt-0">
                      <p className="text-xs text-muted-foreground">אין משימות מתוזמנות</p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
