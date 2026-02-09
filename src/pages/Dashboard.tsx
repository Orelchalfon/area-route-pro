import { useState } from 'react';
import { ScheduleBoard } from '@/components/ScheduleBoard';
import { useJobs } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { Calendar, Users, LayoutDashboard, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { jobs, approveSchedule, updateJobStatus, completeJob } = useJobs();

  const totalJobs = jobs.length;
  const draftCount = jobs.filter(j => j.status === 'draft').length;
  const confirmedCount = jobs.filter(j => j.status === 'confirmed').length;
  const completedCount = jobs.filter(j => j.status === 'completed').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">FS</span>
              </div>
              <h1 className="font-bold text-lg text-foreground">FieldSync</h1>
            </div>
            <nav className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-foreground" asChild>
                <Link to="/">
                  <LayoutDashboard className="w-4 h-4 mr-1.5" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link to="/technician">
                  <Users className="w-4 h-4 mr-1.5" />
                  Technician
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link to="/confirm">
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Customer
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Schedule Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review draft schedules, approve jobs, and track technician assignments.
          </p>
        </div>

        <ScheduleBoard
          jobs={jobs}
          onApprove={approveSchedule}
          onStatusChange={updateJobStatus}
        />
      </main>
    </div>
  );
}
