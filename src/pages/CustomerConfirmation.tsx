import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, CalendarX, Clock, MapPin, User } from 'lucide-react';

export default function CustomerConfirmation() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'reschedule'>('pending');

  // In a real app these would come from the URL params / API
  const jobInfo = {
    customerName: searchParams.get('name') || 'Sarah Goldstein',
    date: searchParams.get('date') || 'February 10, 2026',
    time: searchParams.get('time') || '08:00 AM',
    technician: searchParams.get('tech') || 'David Cohen',
    type: searchParams.get('type') || 'Filter Replacement',
  };

  if (status === 'confirmed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center animate-slide-in">
          <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Appointment Confirmed!</h1>
          <p className="text-muted-foreground mb-6">
            We'll see you on {jobInfo.date} at {jobInfo.time}. Your technician {jobInfo.technician} will arrive at the scheduled time.
          </p>
          <div className="bg-card rounded-lg shadow-card p-4 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-secondary" />
              <span className="text-foreground">{jobInfo.date} at {jobInfo.time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-secondary" />
              <span className="text-foreground">Technician: {jobInfo.technician}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'reschedule') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center animate-slide-in">
          <div className="w-16 h-16 rounded-full bg-warning/15 flex items-center justify-center mx-auto mb-4">
            <CalendarX className="w-8 h-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Reschedule Requested</h1>
          <p className="text-muted-foreground">
            We've received your reschedule request. Our team will contact you shortly to arrange a new appointment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-lg">FS</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Confirm Your Appointment</h1>
          <p className="text-muted-foreground">Hi {jobInfo.customerName}, please confirm your upcoming service visit.</p>
        </div>

        <div className="bg-card rounded-lg shadow-elevated p-6 space-y-4 mb-6">
          <div className="text-center pb-4 border-b border-border">
            <p className="text-sm text-muted-foreground mb-1">{jobInfo.type}</p>
            <p className="text-3xl font-bold text-foreground">{jobInfo.time}</p>
            <p className="text-sm text-muted-foreground">{jobInfo.date}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-secondary" />
              <span className="text-foreground">Technician: <strong>{jobInfo.technician}</strong></span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full h-12 text-base bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => setStatus('confirmed')}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Confirm Appointment
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            onClick={() => setStatus('reschedule')}
          >
            <CalendarX className="w-5 h-5 mr-2" />
            Request Reschedule
          </Button>
        </div>
      </div>
    </div>
  );
}
