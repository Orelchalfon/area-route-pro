import { Customer, ActivityLog } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History } from 'lucide-react';

interface CustomerHistoryDialogProps {
  customer: Customer | null;
  logs: ActivityLog[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerHistoryDialog({ customer, logs, open, onOpenChange }: CustomerHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            היסטוריה — {customer?.name}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">אין פעולות מתועדות עדיין</p>
          ) : (
            <div className="space-y-3">
              {logs.map(log => (
                <div key={log.id} className="border border-border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{log.action}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(log.timestamp).toLocaleDateString('he-IL')} {new Date(log.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{log.details}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
