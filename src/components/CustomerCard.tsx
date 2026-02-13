import { useState } from 'react';
import { Customer, ActivityLog } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Phone, Mail, MapPin, Package, History } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CustomerCardProps {
  customer: Customer;
  logs?: ActivityLog[];
}

export function CustomerCard({ customer, logs = [] }: CustomerCardProps) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <>
      <Card dir="rtl" className="hover:shadow-md transition-shadow">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-foreground">{customer.name}</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
              onClick={() => setShowHistory(true)}
            >
              <History className="w-4 h-4 ml-1" />
              <span className="text-xs">היסטוריה</span>
              {logs.length > 0 && (
                <span className="mr-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {logs.length}
                </span>
              )}
            </Button>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <a href={`tel:${customer.phone}`} className="flex items-center gap-2 hover:text-primary transition-colors">
              <Phone className="w-4 h-4" />
              <span>{customer.phone}</span>
            </a>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{customer.address}, {customer.city}</span>
            </div>
            <a href={`mailto:${customer.email}`} className="flex items-center gap-2 hover:text-primary transition-colors">
              <Mail className="w-4 h-4" />
              <span>{customer.email}</span>
            </a>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>{customer.product}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              היסטוריה — {customer.name}
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
    </>
  );
}
