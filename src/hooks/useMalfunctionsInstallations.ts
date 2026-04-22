import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Job, Customer, JOB_TYPE_CONFIG } from '@/types';

type MalfRow = {
  id: string;
  customer_name: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  region: string | null;
  description: string | null;
  malfunction_date: string | null;
  status: string | null;
  priority: string | null;
  notes: string | null;
  sheet_row_id: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

type InstRow = {
  id: string;
  customer_name: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  region: string | null;
  product_type: string | null;
  installation_date: string | null;
  installation_time: string | null;
  status: string | null;
  priority: string | null;
  notes: string | null;
  sheet_row_id: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

function mapPriority(p: string | null): Job['priority'] {
  if (p === 'high' || p === 'medium' || p === 'low') return p;
  if (p === 'גבוהה') return 'high';
  if (p === 'בינונית') return 'medium';
  return 'low';
}

function malfToJobAndCustomer(row: MalfRow): { job: Job; customer: Customer } {
  const customer: Customer = {
    id: `db-malf-cust-${row.id}`,
    name: row.customer_name || 'ללא שם',
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || '',
    email: '',
    product: '',
    filterReplacementMonth: 1,
  };
  const job: Job = {
    id: `db-malf-${row.id}`,
    type: 'malfunction',
    status: 'draft',
    priority: mapPriority(row.priority),
    customerId: customer.id,
    estimatedDuration: JOB_TYPE_CONFIG.malfunction.duration,
    location: row.address || '',
    city: row.city || '',
    notes: [row.description, row.notes].filter(Boolean).join(' | '),
    createdAt: (row.malfunction_date || row.created_at).slice(0, 10),
  };
  return { job, customer };
}

function instToJobAndCustomer(row: InstRow): { job: Job; customer: Customer } {
  const customer: Customer = {
    id: `db-inst-cust-${row.id}`,
    name: row.customer_name || 'ללא שם',
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || '',
    email: '',
    product: row.product_type || '',
    filterReplacementMonth: 1,
  };
  const job: Job = {
    id: `db-inst-${row.id}`,
    type: 'installation',
    status: 'draft',
    priority: mapPriority(row.priority),
    customerId: customer.id,
    estimatedDuration: JOB_TYPE_CONFIG.installation.duration,
    location: row.address || '',
    city: row.city || '',
    notes: [row.product_type, row.notes].filter(Boolean).join(' | '),
    createdAt: (row.installation_date || row.created_at).slice(0, 10),
    scheduledDate: row.installation_date || undefined,
    scheduledTime: row.installation_time || undefined,
  };
  return { job, customer };
}

export function useMalfunctionsInstallations() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const [{ data: malf }, { data: inst }] = await Promise.all([
      supabase.from('malfunctions').select('*').order('created_at', { ascending: false }),
      supabase.from('installations').select('*').order('created_at', { ascending: false }),
    ]);
    const allJobs: Job[] = [];
    const allCustomers: Customer[] = [];
    (malf as MalfRow[] | null)?.forEach(r => {
      const { job, customer } = malfToJobAndCustomer(r);
      allJobs.push(job);
      allCustomers.push(customer);
    });
    (inst as InstRow[] | null)?.forEach(r => {
      const { job, customer } = instToJobAndCustomer(r);
      allJobs.push(job);
      allCustomers.push(customer);
    });
    setJobs(allJobs);
    setCustomers(allCustomers);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel('malf-inst-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'malfunctions' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installations' }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { jobs, customers, loaded, refresh };
}
