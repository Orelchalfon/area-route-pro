import { Customer, Job } from '@/types';

export interface JobWithCustomer {
  job: Job;
  customer: Customer | undefined;
  coords: { lat: number; lng: number };
}
