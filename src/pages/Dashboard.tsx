import { WeeklyScheduleBoard } from '@/components/WeeklyScheduleBoard';
import { NewJobDialog } from '@/components/NewJobDialog';
import { useJobs } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { Calendar, Users, LayoutDashboard, Contact } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { jobs, customersList, approveSchedule, updateJobStatus, addJob } = useJobs();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div dir="rtl" className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">FS</span>
              </div>
              <h1 className="font-bold text-lg text-foreground">פילד סינק</h1>
            </div>
            <nav className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-foreground" asChild>
                <Link to="/"><LayoutDashboard className="w-4 h-4 ml-1.5" />לוח בקרה</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link to="/technician"><Users className="w-4 h-4 ml-1.5" />טכנאי</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link to="/customers"><Contact className="w-4 h-4 ml-1.5" />לקוחות</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link to="/confirm"><Calendar className="w-4 h-4 ml-1.5" />אישור לקוח</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div dir="rtl" className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">ניהול לו״ז</h2>
            <p className="text-sm text-muted-foreground mt-1">
              סקירת טיוטות, אישור משימות ומעקב אחר שיבוץ טכנאים.
            </p>
          </div>
          <NewJobDialog customers={customersList} onAdd={addJob} />
        </div>

        <WeeklyScheduleBoard
          jobs={jobs}
          onApprove={approveSchedule}
          onStatusChange={updateJobStatus}
        />
      </main>
    </div>
  );
}
