import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import EmployeeDashboard from './EmployeeDashboard';

// Role switch: admins get the full monthly schedule board; employees get a
// brief of their own tasks for today (they must not see other employees' data).
export default function Dashboard() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminDashboard /> : <EmployeeDashboard />;
}
