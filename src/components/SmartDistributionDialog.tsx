import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Customer, ServiceTrack, SERVICE_TRACK_CONFIG } from '@/types';
import { Shuffle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceTrackBadge } from './ServiceTrackBadge';

interface SmartDistributionDialogProps {
  customers: Customer[];
  onDistribute: (assignments: { customerId: string; track: ServiceTrack; nextServiceDate: string }[]) => void;
}

function addMonths(date: Date, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

export function SmartDistributionDialog({ customers, onDistribute }: SmartDistributionDialogProps) {
  const [open, setOpen] = useState(false);

  // Only show customers without a service track (onboarding/testing)
  const eligibleCustomers = useMemo(
    () => customers.filter(c => !c.serviceTrack),
    [customers]
  );

  const preview = useMemo(() => {
    const shuffled = [...eligibleCustomers].sort(() => Math.random() - 0.5);
    const total = shuffled.length;
    const annualCount = Math.ceil(total * 0.5);
    const remaining = total - annualCount;
    const thirdSize = Math.floor(remaining / 3);

    const counts: Record<ServiceTrack, number> = {
      annual_filter: annualCount,
      external_filter: thirdSize,
      bypass_siliphos: thirdSize,
      service_visit: remaining - thirdSize * 2,
    };

    return { total, counts, shuffled };
  }, [eligibleCustomers]);

  const handleDistribute = () => {
    const today = new Date();
    const assignments: { customerId: string; track: ServiceTrack; nextServiceDate: string }[] = [];
    let idx = 0;
    const tracks: ServiceTrack[] = ['annual_filter', 'external_filter', 'bypass_siliphos', 'service_visit'];

    for (const track of tracks) {
      const count = preview.counts[track];
      const interval = SERVICE_TRACK_CONFIG[track].intervalMonths;
      for (let i = 0; i < count; i++) {
        if (idx < preview.shuffled.length) {
          assignments.push({
            customerId: preview.shuffled[idx].id,
            track,
            nextServiceDate: addMonths(today, interval),
          });
          idx++;
        }
      }
    }

    onDistribute(assignments);
    setOpen(false);

    const labels = tracks.map(t => `${preview.counts[t]} ${SERVICE_TRACK_CONFIG[t].label}`);
    toast.success(`חלוקה הושלמה: ${labels.join(', ')}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5" disabled={eligibleCustomers.length === 0}>
          <Shuffle className="w-4 h-4" />
          חלוקה חכמה
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-primary" />
            חלוקה חכמה למסלולי שירות
          </DialogTitle>
          <DialogDescription>
            חלוקה אוטומטית של {eligibleCustomers.length} לקוחות ללא מסלול למסלולי שירות
          </DialogDescription>
        </DialogHeader>

        {eligibleCustomers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">כל הלקוחות כבר משויכים למסלול שירות</p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="text-sm text-muted-foreground">
              50% ← פילטר שנתי | 50% הנותרים ← מחולקים שווה בין 3 מסלולים
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(preview.counts) as [ServiceTrack, number][]).map(([track, count]) => (
                <div key={track} className={`rounded-xl border p-4 text-center ${SERVICE_TRACK_CONFIG[track].bgClass}`}>
                  <ServiceTrackBadge track={track} className="mb-2" />
                  <div className={`text-2xl font-bold ${SERVICE_TRACK_CONFIG[track].textClass}`}>{count}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    כל {SERVICE_TRACK_CONFIG[track].intervalMonths} חודשים
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleDistribute} className="w-full gap-2" size="lg">
              <Shuffle className="w-4 h-4" />
              בצע חלוקה ({eligibleCustomers.length} לקוחות)
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
