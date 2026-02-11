import TechnicianView from './TechnicianView';
import { useJobsContext } from '@/contexts/JobsContext';

export default function TechnicianPage() {
  const { jobs, completeJob } = useJobsContext();
  return <TechnicianView jobs={jobs} onComplete={completeJob} />;
}
