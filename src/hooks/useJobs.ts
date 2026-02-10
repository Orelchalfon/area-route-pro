import { useState } from 'react';
import { Job, JobStatus, JobType, JOB_TYPE_CONFIG, Customer } from '@/types';
import { initialJobs, customers as initialCustomers } from '@/data/mockData';

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [customersList, setCustomersList] = useState<Customer[]>(initialCustomers);

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

  const completeJob = (jobId: string, completionNotes: string) => {
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, status: 'completed' as JobStatus, completionNotes } : j
    ));
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
    setJobs(prev => [...prev, newJob]);
  };

  const addCustomer = (data: Omit<Customer, 'id'>) => {
    const newCustomer: Customer = { ...data, id: `c${Date.now()}` };
    setCustomersList(prev => [...prev, newCustomer]);
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

  return { jobs, customersList, updateJobStatus, approveSchedule, completeJob, addJob, addCustomer, assignJob, unassignJob, getUnassignedJobs, getJobsByArea, getJobsByTechnician };
}
