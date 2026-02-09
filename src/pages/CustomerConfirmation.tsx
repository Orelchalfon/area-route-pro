import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, CalendarX, Clock, User } from 'lucide-react';

export default function CustomerConfirmation() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'reschedule'>('pending');

  const jobInfo = {
    customerName: searchParams.get('name') || 'שרה גולדשטיין',
    date: searchParams.get('date') || '10 בפברואר 2026',
    time: searchParams.get('time') || '08:00',
    technician: searchParams.get('tech') || 'דוד כהן',
    type: searchParams.get('type') || 'החלפת פילטר',
  };

  if (status === 'confirmed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full text-center animate-slide-in">
          <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">התור אושר!</h1>
          <p className="text-muted-foreground mb-6">
            נתראה ב-{jobInfo.date} בשעה {jobInfo.time}. הטכנאי {jobInfo.technician} יגיע בזמן שנקבע.
          </p>
          <div className="bg-card rounded-lg shadow-card p-4 text-right space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-secondary" />
              <span className="text-foreground">{jobInfo.date} בשעה {jobInfo.time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-secondary" />
              <span className="text-foreground">טכנאי: {jobInfo.technician}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'reschedule') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full text-center animate-slide-in">
          <div className="w-16 h-16 rounded-full bg-warning/15 flex items-center justify-center mx-auto mb-4">
            <CalendarX className="w-8 h-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">בקשת דחייה נשלחה</h1>
          <p className="text-muted-foreground">
            קיבלנו את בקשתך לתיאום מחדש. הצוות שלנו ייצור איתך קשר בהקדם לקביעת מועד חדש.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-lg">FS</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">אישור תור</h1>
          <p className="text-muted-foreground">שלום {jobInfo.customerName}, אנא אשר/י את ביקור השירות הקרוב.</p>
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
              <span className="text-foreground">טכנאי: <strong>{jobInfo.technician}</strong></span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full h-12 text-base bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => setStatus('confirmed')}
          >
            <CheckCircle className="w-5 h-5 ml-2" />
            אישור תור
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            onClick={() => setStatus('reschedule')}
          >
            <CalendarX className="w-5 h-5 ml-2" />
            בקשת דחייה
          </Button>
        </div>
      </div>
    </div>
  );
}
