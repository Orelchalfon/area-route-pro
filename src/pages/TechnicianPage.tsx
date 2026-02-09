import TechnicianView from './TechnicianView';
import { useJobs } from '@/hooks/useJobs';

export default function TechnicianPage() {
  const { jobs, completeJob } = useJobs();
  return <TechnicianView jobs={jobs} onComplete={completeJob} />;
}
