import TechnicianView from './TechnicianView';
import { useJobsContext } from '@/contexts/JobsContext';

export default function TechnicianPage() {
  const { jobs, markJobCompletion } = useJobsContext();
  return <TechnicianView jobs={jobs} onMarkCompletion={markJobCompletion} />;
}
