import { useState, useCallback, useMemo } from 'react';
import { Job, JobStatus, JobType, JOB_TYPE_CONFIG, Customer, CompletionStatus, ActivityLog, ServiceTrack, SERVICE_TRACK_CONFIG } from '@/types';
import { initialJobs, customers as initialCustomers } from '@/data/mockData';

// Redistribute overdue draft filter jobs to current & future months, spread by area
function redistributeOverdueFilterJobs(jobs: Job[]): Job[] {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentYear = today.getFullYear();

  const overdueFilter: Job[] = [];
  const otherJobs: Job[] = [];

  for (const job of jobs) {
    if (
      job.type === 'filter_replacement' &&
      job.status === 'draft' &&
      !job.technicianId &&
      !job.scheduledDate
    ) {
      const jobDate = new Date(job.createdAt);
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (jobDate < todayDate) {
        overdueFilter.push(job);
        continue;
      }
    }
    otherJobs.push(job);
  }

  if (overdueFilter.length === 0) return jobs;

  // Group overdue by area (city)
  const byArea = new Map<string, Job[]>();
  for (const job of overdueFilter) {
    const arr = byArea.get(job.city) || [];
    arr.push(job);
    byArea.set(job.city, arr);
  }

  // Distribute into current month and forward months, keeping area grouping
  // Put them into current month first, then overflow to next months
  const redistributed: Job[] = [];
  const areas = Array.from(byArea.keys());
  
  for (const area of areas) {
    const areaJobs = byArea.get(area)!;
    // Spread across current and future months (100 per month capacity, ~10 per area)
    let monthOffset = 0;
    for (let i = 0; i < areaJobs.length; i++) {
      const targetMonth = currentMonth + monthOffset;
      const targetYear = currentYear + Math.floor((targetMonth - 1) / 12);
      const actualMonth = ((targetMonth - 1) % 12) + 1;
      
      redistributed.push({
        ...areaJobs[i],
        createdAt: `${targetYear}-${String(actualMonth).padStart(2, '0')}-01`,
        notes: `${areaJobs[i].notes} (הועבר מחודש קודם)`,
        priority: 'medium', // Bump priority for overdue
      });
      
      // Move to next month every 10 jobs per area to avoid overloading
      if ((i + 1) % 10 === 0) monthOffset++;
    }
  }

  return [...otherJobs, ...redistributed];
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>(() => redistributeOverdueFilterJobs(initialJobs));
  const [customersList, setCustomersList] = useState<Customer[]>(initialCustomers);
  const [closedJobs, setClosedJobs] = useState<Job[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const addLog = useCallback((customerId: string, action: string, details: string, jobId?: string) => {
    const log: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customerId,
      jobId,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs(prev => [log, ...prev]);
  }, []);

  const updateJobStatus = (jobId: string, status: JobStatus) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status } : j));
  };

  const approveSchedule = (jobIds: string[]) => {
    setJobs(prev => prev.map(j => 
      jobIds.includes(j.id) && j.status === 'draft' 
        ? { ...j, status: 'pending_customer' as JobStatus } 
        : j
    ));
  };

  const approveDaySchedule = (assignments: { jobId: string; technicianId: string; scheduledDate: string; scheduledTime: string }[]) => {
    setJobs(prev => {
      const assignmentMap = new Map(assignments.map(a => [a.jobId, a]));
      return prev.map(j => {
        const assignment = assignmentMap.get(j.id);
        if (assignment) {
          addLog(j.customerId, 'שיבוץ', `שובץ לתאריך ${assignment.scheduledDate} בשעה ${assignment.scheduledTime}`, j.id);
          return {
            ...j,
            status: 'confirmed' as JobStatus,
            technicianId: assignment.technicianId,
            scheduledDate: assignment.scheduledDate,
            scheduledTime: assignment.scheduledTime,
          };
        }
        return j;
      });
    });
  };

  const completeJob = (jobId: string, notes: string) => {
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, status: 'completed' as JobStatus, completionNotes: notes, completionStatus: 'done' as CompletionStatus } : j
    ));
  };

  const markJobCompletion = (jobId: string, completionStatus: CompletionStatus, notes: string) => {
    const statusLabels: Record<CompletionStatus, string> = { done: 'בוצע', not_done: 'לא בוצע', need_return: 'צריך לחזור' };
    setJobs(prev => {
      const job = prev.find(j => j.id === jobId);
      if (job) addLog(job.customerId, `דיווח טכנאי: ${statusLabels[completionStatus]}`, notes || 'ללא הערות', jobId);
      return prev.map(j =>
        j.id === jobId ? { ...j, status: 'completed' as JobStatus, completionStatus, completionNotes: notes } : j
      );
    });
  };

  const closeJob = (jobId: string) => {
    setJobs(prev => {
      const job = prev.find(j => j.id === jobId);
      if (!job) return prev;

      addLog(job.customerId, 'סגירת קריאה', `קריאה ${JOB_TYPE_CONFIG[job.type].label} נסגרה`, jobId);
      setClosedJobs(old => [...old, job]);

      if (job.type === 'filter_replacement') {
        const customer = customersList.find(c => c.id === job.customerId);
        const currentYear = parseInt(job.createdAt.split('-')[0]);
        const nextYear = currentYear + 1;
        const month = customer?.filterReplacementMonth || parseInt(job.createdAt.split('-')[1]);
        const nextJobId = `filter-${nextYear}-${month}-${job.customerId}`;
        const existing = prev.find(j => j.id === nextJobId);
        if (!existing) {
          addLog(job.customerId, 'תזמון שירות', `שירות שוטף תוזמן לשנה הבאה (${nextYear})`, nextJobId);
          const newJob: Job = {
            id: nextJobId,
            type: 'filter_replacement',
            status: 'draft',
            priority: 'low',
            customerId: job.customerId,
            estimatedDuration: 25,
            location: customer?.address || job.location,
            city: customer?.city || job.city,
            notes: 'החלפת פילטר שנתית',
            createdAt: `${nextYear}-${String(month).padStart(2, '0')}-01`,
          };
          return [...prev.filter(j => j.id !== jobId), newJob];
        }
      }
      return prev.filter(j => j.id !== jobId);
    });
  };

  const returnJob = (jobId: string) => {
    setJobs(prev => {
      const job = prev.find(j => j.id === jobId);
      if (!job) return prev;
      addLog(job.customerId, 'החזרת קריאה', `קריאה ${JOB_TYPE_CONFIG[job.type].label} הוחזרה למאגר`, jobId);
      return prev.map(j => j.id === jobId ? {
        ...j,
        status: 'draft' as JobStatus,
        technicianId: undefined,
        scheduledDate: undefined,
        scheduledTime: undefined,
      } : j);
    });
  };

  const completeFilterJob = (jobId: string) => {
    setJobs(prev => {
      const job = prev.find(j => j.id === jobId);
      if (!job || job.type !== 'filter_replacement') {
        return prev.map(j => j.id === jobId ? { ...j, status: 'completed' as JobStatus } : j);
      }
      const updated = prev.map(j => j.id === jobId ? { ...j, status: 'completed' as JobStatus } : j);
      const customer = customersList.find(c => c.id === job.customerId);
      const currentYear = parseInt(job.createdAt.split('-')[0]);
      const nextYear = currentYear + 1;
      const month = customer?.filterReplacementMonth || (parseInt(job.createdAt.split('-')[1]));
      const nextJobId = `filter-${nextYear}-${month}-${job.customerId}`;
      if (!updated.find(j => j.id === nextJobId)) {
        const newJob: Job = {
          id: nextJobId,
          type: 'filter_replacement',
          status: 'draft',
          priority: 'low',
          customerId: job.customerId,
          estimatedDuration: 25,
          location: customer?.address || job.location,
          city: customer?.city || job.city,
          notes: 'החלפת פילטר שנתית',
          createdAt: `${nextYear}-${String(month).padStart(2, '0')}-01`,
        };
        updated.push(newJob);
      }
      return updated;
    });
  };

  const assignJob = (jobId: string, technicianId: string, scheduledDate: string, scheduledTime: string) => {
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, technicianId, scheduledDate, scheduledTime } : j
    ));
  };

  const unassignJob = (jobId: string) => {
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, technicianId: undefined, scheduledDate: undefined, scheduledTime: undefined } : j
    ));
  };

  const addJob = (data: { type: JobType; customerId: string; technicianId: string; scheduledDate: string; scheduledTime: string; notes: string }) => {
    const customer = customersList.find(c => c.id === data.customerId);
    const config = JOB_TYPE_CONFIG[data.type];
    const newJob: Job = {
      id: `j${Date.now()}`,
      type: data.type,
      status: 'draft',
      priority: config.priority,
      customerId: data.customerId,
      technicianId: data.technicianId,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      estimatedDuration: config.duration,
      location: customer?.address || '',
      city: customer?.city || '',
      notes: data.notes,
      createdAt: new Date().toISOString().split('T')[0],
    };
    addLog(data.customerId, 'פתיחת קריאה', `${config.label} — ${data.notes}`, newJob.id);
    setJobs(prev => [...prev, newJob]);
  };

  const addCustomer = (data: { name: string; phone: string; address: string; city: string; email: string; product: string; lat?: number; lng?: number; placeId?: string; filterReplacementMonth?: number }) => {
    const newCustomer: Customer = {
      ...data,
      id: `c${Date.now()}`,
      filterReplacementMonth: data.filterReplacementMonth || (new Date().getMonth() + 1),
    };
    setCustomersList(prev => [...prev, newCustomer]);
  };

  const distributeServiceTracks = (assignments: { customerId: string; track: ServiceTrack; nextServiceDate: string }[]) => {
    setCustomersList(prev => {
      const map = new Map(assignments.map(a => [a.customerId, a]));
      return prev.map(c => {
        const a = map.get(c.id);
        if (a) {
          addLog(c.id, 'שיוך מסלול', `שויך למסלול ${SERVICE_TRACK_CONFIG[a.track].label} — שירות הבא: ${a.nextServiceDate}`);
          return { ...c, serviceTrack: a.track, nextServiceDate: a.nextServiceDate };
        }
        return c;
      });
    });
  };

  const recalcNextServiceDate = (customerId: string) => {
    setCustomersList(prev => prev.map(c => {
      if (c.id !== customerId || !c.serviceTrack) return c;
      const interval = SERVICE_TRACK_CONFIG[c.serviceTrack].intervalMonths;
      const next = new Date();
      next.setMonth(next.getMonth() + interval);
      const nextDate = next.toISOString().split('T')[0];
      addLog(c.id, 'עדכון מועד', `שירות הבא עודכן ל-${nextDate} (${SERVICE_TRACK_CONFIG[c.serviceTrack].label})`);
      return { ...c, nextServiceDate: nextDate };
    }));
  };

  const getUnassignedJobs = () => jobs.filter(j => !j.technicianId && !j.scheduledDate);

  const getJobsByArea = () => {
    const grouped: Record<string, Job[]> = {};
    jobs.forEach(job => {
      if (!grouped[job.city]) grouped[job.city] = [];
      grouped[job.city].push(job);
    });
    return grouped;
  };

  const getJobsByTechnician = (techId: string) => {
    return jobs.filter(j => j.technicianId === techId);
  };

  const getCustomerLogs = (customerId: string) => activityLogs.filter(l => l.customerId === customerId);

  return { jobs, customersList, closedJobs, activityLogs, updateJobStatus, approveSchedule, approveDaySchedule, completeJob, markJobCompletion, closeJob, returnJob, completeFilterJob, addJob, addCustomer, assignJob, unassignJob, getUnassignedJobs, getJobsByArea, getJobsByTechnician, getCustomerLogs, distributeServiceTracks, recalcNextServiceDate };
}
